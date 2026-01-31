/**
 * Price Deviation Analytics Service
 *
 * 价格偏差分析服务
 * - 分析各协议之间的价格偏差历史趋势
 * - 检测异常偏差模式
 * - 生成偏差报告
 */

import { logger } from '@/lib/logger';
import { query } from '@/server/db';

// ============================================================================
// 类型定义
// ============================================================================

export interface DeviationAnalyticsConfig {
  analysisWindowHours: number;
  deviationThreshold: number;
  minDataPoints: number;
}

export interface PriceDeviationPoint {
  timestamp: string;
  symbol: string;
  protocols: string[];
  prices: Record<string, number>;
  avgPrice: number;
  medianPrice: number;
  maxDeviation: number;
  maxDeviationPercent: number;
  outlierProtocols: string[];
}

export interface DeviationTrend {
  symbol: string;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  trendStrength: number; // 0-1
  avgDeviation: number;
  maxDeviation: number;
  volatility: number;
  anomalyScore: number;
  recommendation: string;
}

export interface DeviationReport {
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalSymbols: number;
    symbolsWithHighDeviation: number;
    avgDeviationAcrossAll: number;
    mostVolatileSymbol: string;
  };
  trends: DeviationTrend[];
  anomalies: PriceDeviationPoint[];
}

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
      const avgDeviation = this.calculateAverage(deviations);
      const maxDeviation = Math.max(...deviations);
      const volatility = this.calculateStandardDeviation(deviations);

      // 计算趋势
      const trendDirection = this.calculateTrendDirection(deviations);
      const trendStrength = this.calculateTrendStrength(deviations);

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
   */
  async generateReport(symbols?: string[]): Promise<DeviationReport> {
    try {
      const targetSymbols = symbols || (await this.getActiveSymbols());
      const endTime = new Date();
      const startTime = new Date(
        endTime.getTime() - this.config.analysisWindowHours * 60 * 60 * 1000,
      );

      const trends: DeviationTrend[] = [];
      const anomalies: PriceDeviationPoint[] = [];
      let totalDeviation = 0;
      let maxVolatility = 0;
      let mostVolatileSymbol = '';
      let highDeviationCount = 0;

      for (const symbol of targetSymbols) {
        const trend = await this.analyzeDeviationTrend(symbol);
        trends.push(trend);

        totalDeviation += trend.avgDeviation;

        if (trend.avgDeviation > this.config.deviationThreshold * 100) {
          highDeviationCount++;
        }

        if (trend.volatility > maxVolatility) {
          maxVolatility = trend.volatility;
          mostVolatileSymbol = symbol;
        }

        // 收集异常点
        const symbolAnomalies = await this.detectAnomalies(symbol);
        anomalies.push(...symbolAnomalies);
      }

      const avgDeviationAcrossAll = trends.length > 0 ? totalDeviation / trends.length : 0;

      return {
        generatedAt: new Date().toISOString(),
        period: {
          start: startTime.toISOString(),
          end: endTime.toISOString(),
        },
        summary: {
          totalSymbols: targetSymbols.length,
          symbolsWithHighDeviation: highDeviationCount,
          avgDeviationAcrossAll,
          mostVolatileSymbol,
        },
        trends,
        anomalies: anomalies.slice(0, 50), // 限制异常点数量
      };
    } catch (error) {
      logger.error('Failed to generate deviation report', { error });
      throw error;
    }
  }

  /**
   * 检测特定交易对的异常偏差
   */
  async detectAnomalies(symbol: string): Promise<PriceDeviationPoint[]> {
    try {
      const dataPoints = await this.fetchDeviationHistory(symbol);
      const anomalies: PriceDeviationPoint[] = [];

      // 计算统计阈值
      const deviations = dataPoints.map((d) => d.maxDeviationPercent);
      const mean = this.calculateAverage(deviations);
      const stdDev = this.calculateStandardDeviation(deviations);
      const threshold = mean + 2 * stdDev; // 2 sigma

      for (const point of dataPoints) {
        if (
          point.maxDeviationPercent > threshold ||
          point.maxDeviationPercent > this.config.deviationThreshold * 100
        ) {
          anomalies.push(point);
        }
      }

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
    const result = await query(
      `
      SELECT 
        timestamp,
        symbol,
        prices,
        avg_price,
        median_price,
        max_deviation,
        max_deviation_percent,
        outlier_protocols
      FROM unified_price_comparisons
      WHERE symbol = $1
        AND timestamp > NOW() - INTERVAL '${this.config.analysisWindowHours} hours'
      ORDER BY timestamp ASC
      `,
      [symbol],
    );

    return result.rows.map((row) => ({
      timestamp: row.timestamp,
      symbol: row.symbol,
      protocols: Object.keys(row.prices || {}),
      prices: row.prices || {},
      avgPrice: parseFloat(row.avg_price),
      medianPrice: parseFloat(row.median_price),
      maxDeviation: parseFloat(row.max_deviation),
      maxDeviationPercent: parseFloat(row.max_deviation_percent),
      outlierProtocols: row.outlier_protocols || [],
    }));
  }

  private async getActiveSymbols(): Promise<string[]> {
    const result = await query(
      `
      SELECT DISTINCT symbol 
      FROM unified_price_feeds 
      WHERE timestamp > NOW() - INTERVAL '1 hour'
      ORDER BY symbol
      `,
    );
    return result.rows.map((row) => row.symbol);
  }

  // ============================================================================
  // 统计计算
  // ============================================================================

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = this.calculateAverage(values);
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const avgSquaredDiff = this.calculateAverage(squaredDiffs);
    return Math.sqrt(avgSquaredDiff);
  }

  private calculateTrendDirection(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = this.calculateAverage(firstHalf);
    const secondAvg = this.calculateAverage(secondHalf);

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private calculateTrendStrength(values: number[]): number {
    if (values.length < 2) return 0;

    // 使用线性回归计算趋势强度
    const n = values.length;
    const indices = Array.from({ length: n }, (_, i) => i);

    const avgX = this.calculateAverage(indices);
    const avgY = this.calculateAverage(values);

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      const index = indices[i];
      const value = values[i];
      if (index !== undefined && value !== undefined) {
        numerator += (index - avgX) * (value - avgY);
        denominator += Math.pow(index - avgX, 2);
      }
    }

    if (denominator === 0) return 0;

    const slope = numerator / denominator;
    const normalizedSlope = Math.min(Math.abs(slope) / (avgY * 0.1), 1);

    return normalizedSlope;
  }

  private calculateAnomalyScore(dataPoints: PriceDeviationPoint[]): number {
    if (dataPoints.length === 0) return 0;

    const outlierRatio =
      dataPoints.filter((d) => d.outlierProtocols.length > 0).length / dataPoints.length;

    const highDeviationRatio =
      dataPoints.filter((d) => d.maxDeviationPercent > this.config.deviationThreshold * 100)
        .length / dataPoints.length;

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

    if (avgDeviation > 5) {
      parts.push('Average deviation is very high (>5%).');
    } else if (avgDeviation > 1) {
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
