/**
 * Price Deviation Analytics Service
 *
 * 价格偏差分析服务
 * - 分析各协议之间的价格偏差历史趋势
 * - 检测异常偏差模式
 * - 生成偏差报告
 */

import { query } from '@/lib/database/db';
import { AGGREGATION_CONFIG } from '@/services/oracle/priceAggregation/config';
import { detectOutliers } from '@/services/oracle/priceAggregation/utils';
import { logger } from '@/shared/logger';
import { generateMockData } from '@/shared/utils/mockData';
import { robustTrendAnalysis } from '@/shared/utils/robustTrendAnalysis';
import type {
  DeviationAnalyticsConfig,
  PriceDeviationPoint,
  DeviationTrend,
  DeviationReport,
} from '@/types/analytics/deviation';

export type { DeviationAnalyticsConfig, PriceDeviationPoint, DeviationTrend, DeviationReport };

// ============================================================================
// 价格偏差分析服务
// ============================================================================

export class PriceDeviationAnalytics {
  private config: DeviationAnalyticsConfig;

  constructor(config: Partial<DeviationAnalyticsConfig> = {}) {
    this.config = {
      analysisWindowHours: config.analysisWindowHours || 24,
      deviationThreshold: config.deviationThreshold || 0.01, // 1%
      minDataPoints: config.minDataPoints || 10,
    };
  }

  // ============================================================================
  // 核心分析方法
  // ============================================================================

  /**
   * 分析指定交易对的价格偏差趋势
   */
  async analyzeDeviationTrend(symbol: string): Promise<DeviationTrend> {
    try {
      const dataPoints = await this.fetchDeviationHistory(symbol);

      if (dataPoints.length < this.config.minDataPoints) {
        return {
          symbol,
          trendDirection: 'stable',
          trendStrength: 0,
          avgDeviation: 0,
          maxDeviation: 0,
          volatility: 0,
          anomalyScore: 0,
          recommendation: 'Insufficient data for analysis',
        };
      }

      const deviations = dataPoints.map((d) => d.maxDeviationPercent);

      // 使用鲁棒化趋势分析
      const robustAnalysis = robustTrendAnalysis(deviations, 0.05);

      // 使用鲁棒化统计量
      const avgDeviation = robustAnalysis.intercept; // 使用截距作为平均偏差估计
      const maxDeviation = Math.max(...deviations);
      const volatility = robustAnalysis.volatility; // 使用 MAD 替代标准差

      // 使用鲁棒化趋势方向和强度
      const trendDirection = robustAnalysis.direction;
      const trendStrength = robustAnalysis.strength;

      // 计算异常分数
      const anomalyScore = this.calculateAnomalyScore(dataPoints);

      // 生成建议
      const recommendation = this.generateRecommendation(
        trendDirection,
        trendStrength,
        avgDeviation,
        anomalyScore,
      );

      return {
        symbol,
        trendDirection,
        trendStrength,
        avgDeviation,
        maxDeviation,
        volatility,
        anomalyScore,
        recommendation,
      };
    } catch (error) {
      logger.error('Failed to analyze deviation trend', { error, symbol });
      throw error;
    }
  }

  /**
   * 生成完整的价格偏差报告
   *
   * 性能日志：记录报告生成耗时、样本量等关键指标
   */
  async generateReport(symbols?: string[]): Promise<DeviationReport> {
    const startTime = performance.now();
    const reportStartTime = new Date();

    try {
      const targetSymbols = symbols || (await this.getActiveSymbols());
      const endTime = new Date();
      const periodStartTime = new Date(
        endTime.getTime() - this.config.analysisWindowHours * 60 * 60 * 1000,
      );

      const trends: DeviationTrend[] = [];
      const anomalies: PriceDeviationPoint[] = [];
      let totalDeviation = 0;
      let maxVolatility = 0;
      let mostVolatileSymbol = '';
      let highDeviationCount = 0;

      const symbolProcessingTimes: Record<string, number> = {};

      const trendResults = await Promise.all(
        targetSymbols.map(async (symbol) => {
          const symbolStartTime = performance.now();
          const trend = await this.analyzeDeviationTrend(symbol);
          const symbolAnomalies = await this.detectAnomalies(symbol);
          const processingTime = performance.now() - symbolStartTime;
          return { symbol, trend, symbolAnomalies, processingTime };
        }),
      );

      for (const { symbol, trend, symbolAnomalies, processingTime } of trendResults) {
        trends.push(trend);
        totalDeviation += trend.avgDeviation;

        if (trend.avgDeviation > this.config.deviationThreshold) {
          highDeviationCount++;
        }

        if (trend.volatility > maxVolatility) {
          maxVolatility = trend.volatility;
          mostVolatileSymbol = symbol;
        }

        anomalies.push(...symbolAnomalies);
        symbolProcessingTimes[symbol] = processingTime;
      }

      const avgDeviationAcrossAll = trends.length > 0 ? totalDeviation / trends.length : 0;

      const totalTime = performance.now() - startTime;

      logger.info('Deviation report generated', {
        performance: {
          totalTimeMs: Math.round(totalTime),
          symbolCount: targetSymbols.length,
          avgTimePerSymbolMs: Math.round(totalTime / targetSymbols.length),
          symbolProcessingTimes,
        },
        sampleSize: {
          totalSymbols: targetSymbols.length,
          trendsGenerated: trends.length,
          anomaliesDetected: anomalies.length,
          analysisWindowHours: this.config.analysisWindowHours,
        },
        reportPeriod: {
          start: periodStartTime.toISOString(),
          end: endTime.toISOString(),
        },
      });

      return {
        generatedAt: reportStartTime.toISOString(),
        period: {
          start: periodStartTime.toISOString(),
          end: endTime.toISOString(),
        },
        summary: {
          totalSymbols: targetSymbols.length,
          symbolsWithHighDeviation: highDeviationCount,
          avgDeviationAcrossAll,
          mostVolatileSymbol,
        },
        trends,
        anomalies: anomalies.slice(0, 50),
      };
    } catch (error) {
      const totalTime = performance.now() - startTime;
      logger.error('Failed to generate deviation report', {
        error,
        performance: {
          totalTimeMs: Math.round(totalTime),
          failedAt: new Date().toISOString(),
        },
      });
      throw error;
    }
  }

  /**
   * 检测特定交易对的异常偏差
   *
   * 使用统一的异常检测方法：
   * - 主方法：阈值法（偏差百分比 > 阈值）
   * - 辅助方法：IQR（四分位距）统计方法
   *
   * 配置来源：AGGREGATION_CONFIG.outlierDetection
   */
  async detectAnomalies(symbol: string): Promise<PriceDeviationPoint[]> {
    try {
      const dataPoints = await this.fetchDeviationHistory(symbol);

      if (dataPoints.length === 0) {
        return [];
      }

      // 提取偏差百分比数组
      const deviations = dataPoints.map((d) => d.maxDeviationPercent);

      // 计算参考值（中位数）
      const sortedDeviations = [...deviations].sort((a, b) => a - b);
      const medianDeviation = sortedDeviations[Math.floor(sortedDeviations.length / 2)] || 0;

      // 使用统一的异常检测方法
      const outlierIndices = detectOutliers(
        deviations,
        medianDeviation,
        AGGREGATION_CONFIG.outlierDetection,
      );

      const outlierIndexSet = new Set(outlierIndices);
      const anomalies: PriceDeviationPoint[] = dataPoints.filter((_, index) =>
        outlierIndexSet.has(index),
      );

      return anomalies.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
    } catch (error) {
      logger.error('Failed to detect anomalies', { error, symbol });
      return [];
    }
  }

  /**
   * 比较多个交易对的偏差表现
   */
  async compareSymbols(symbols: string[]): Promise<
    Array<{
      symbol: string;
      rank: number;
      avgDeviation: number;
      stability: number;
    }>
  > {
    const comparisons = await Promise.all(
      symbols.map(async (symbol) => {
        const trend = await this.analyzeDeviationTrend(symbol);
        return {
          symbol,
          avgDeviation: trend.avgDeviation,
          stability: 1 / (1 + trend.volatility), // 稳定性分数
        };
      }),
    );

    // 按平均偏差排序（偏差越小越好）
    return comparisons
      .sort((a, b) => a.avgDeviation - b.avgDeviation)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));
  }

  // ============================================================================
  // 数据获取
  // ============================================================================

  private async fetchDeviationHistory(symbol: string): Promise<PriceDeviationPoint[]> {
    try {
      const result = await query(
        `
        SELECT 
          timestamp,
          symbol,
          avg_price,
          median_price,
          max_deviation,
          max_deviation_percent,
          outlier_protocols,
          participating_protocols,
          min_price,
          max_price
        FROM cross_oracle_comparisons
        WHERE symbol = $1
          AND timestamp > NOW() - INTERVAL '1 hour' * $2
        ORDER BY timestamp ASC
        `,
        [symbol, this.config.analysisWindowHours],
      );

      if (result.rows.length === 0) {
        return generateMockData(symbol, this.config.analysisWindowHours);
      }

      return result.rows.map((row) => ({
        timestamp: row.timestamp,
        symbol: row.symbol,
        protocols: row.participating_protocols || [],
        prices: {}, // cross_oracle_comparisons 不存储单个协议价格
        avgPrice: parseFloat(row.avg_price),
        medianPrice: parseFloat(row.median_price),
        maxDeviation: parseFloat(row.max_deviation),
        maxDeviationPercent: parseFloat(row.max_deviation_percent),
        outlierProtocols: row.outlier_protocols || [],
      }));
    } catch (error) {
      logger.warn('Database query failed, returning mock data', { error, symbol });
      return generateMockData(symbol, this.config.analysisWindowHours);
    }
  }

  private async getActiveSymbols(): Promise<string[]> {
    try {
      const result = await query(
        `
        SELECT DISTINCT symbol 
        FROM cross_oracle_comparisons 
        WHERE timestamp > NOW() - INTERVAL '1 hour'
        ORDER BY symbol
        `,
      );

      if (result.rows.length === 0) {
        return this.getMockSymbols();
      }

      return result.rows.map((row) => row.symbol);
    } catch (error) {
      logger.warn('Database query failed, returning mock symbols', { error });
      return this.getMockSymbols();
    }
  }

  /**
   * 获取模拟交易对列表
   */
  private getMockSymbols(): string[] {
    return ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD', 'LINK/USD'];
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<DeviationAnalyticsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): DeviationAnalyticsConfig {
    return { ...this.config };
  }

  // ============================================================================
  // 统计计算
  // ============================================================================

  private calculateAnomalyScore(dataPoints: PriceDeviationPoint[]): number {
    if (dataPoints.length === 0) return 0;

    const outlierRatio =
      dataPoints.filter((d) => d.outlierProtocols.length > 0).length / dataPoints.length;

    const highDeviationRatio =
      dataPoints.filter((d) => d.maxDeviationPercent > this.config.deviationThreshold).length /
      dataPoints.length;

    return Math.min((outlierRatio + highDeviationRatio) / 2, 1);
  }

  private generateRecommendation(
    trendDirection: string,
    trendStrength: number,
    avgDeviation: number,
    anomalyScore: number,
  ): string {
    const parts: string[] = [];

    if (anomalyScore > 0.7) {
      parts.push('High anomaly detected. Investigate data sources immediately.');
    } else if (anomalyScore > 0.4) {
      parts.push('Moderate anomalies observed. Monitor closely.');
    }

    if (trendDirection === 'increasing' && trendStrength > 0.5) {
      parts.push('Deviation trend is increasing significantly.');
    }

    if (avgDeviation > 0.05) {
      parts.push('Average deviation is very high (>5%).');
    } else if (avgDeviation > 0.01) {
      parts.push('Average deviation is elevated (>1%).');
    }

    if (parts.length === 0) {
      return 'Price deviation is within normal ranges.';
    }

    return parts.join(' ');
  }
}

// ============================================================================
// 单例实例
// ============================================================================

export const priceDeviationAnalytics = new PriceDeviationAnalytics();
