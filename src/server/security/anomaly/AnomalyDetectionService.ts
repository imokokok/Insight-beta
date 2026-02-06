/**
 * Anomaly Detection Service
 * 异常检测服务主类
 */

import { logger } from '@/lib/logger';
import type { PriceHistoryRecord } from '@/server/priceHistory/priceHistoryService';
import {
  type AnomalyDetection,
  type AnomalyType,
  type AnomalySeverity,
  type AnomalyMetrics,
  type AnomalyEvidence,
  type DetectionConfig,
} from './types';
import { StatisticalDetector } from './StatisticalDetector';
import { TimeSeriesDetector } from './TimeSeriesDetector';
import { MLDetector } from './MLDetector';
import { BehaviorPatternDetector } from './BehaviorPatternDetector';

// 默认配置
export const DEFAULT_DETECTION_CONFIG: DetectionConfig = {
  zScoreThreshold: 3,
  iqrMultiplier: 1.5,
  minDataPoints: 30,
  windowSize: 20,
  trendWindowSize: 10,
  volatilityWindowSize: 20,
  isolationForestContamination: 0.1,
  minClusterSize: 5,
  patternHistoryLength: 100,
  behaviorChangeThreshold: 0.3,
  cooldownPeriodMs: 60000, // 1分钟冷却期
  severityThresholds: {
    low: 0.6,
    medium: 0.75,
    high: 0.9,
  },
};

export class AnomalyDetectionService {
  private statisticalDetector: StatisticalDetector;
  private timeSeriesDetector: TimeSeriesDetector;
  private mlDetector: MLDetector;
  private behaviorDetector: BehaviorPatternDetector;
  private recentDetections: Map<string, Date> = new Map();
  private anomalyHistory: Map<string, AnomalyDetection[]> = new Map();

  constructor(private config: DetectionConfig = DEFAULT_DETECTION_CONFIG) {
    this.statisticalDetector = new StatisticalDetector();
    this.timeSeriesDetector = new TimeSeriesDetector();
    this.mlDetector = new MLDetector();
    this.behaviorDetector = new BehaviorPatternDetector();
  }

  /**
   * 检测价格异常
   */
  detectPriceAnomalies(symbol: string, priceHistory: PriceHistoryRecord[]): AnomalyDetection[] {
    if (priceHistory.length < this.config.minDataPoints) {
      return [];
    }

    // 检查冷却期
    if (this.isInCooldown(symbol, this.config.cooldownPeriodMs)) {
      return [];
    }

    const prices = priceHistory.map((p) => p.price);
    const anomalies: AnomalyDetection[] = [];

    // 1. 统计异常检测
    const statisticalAnomalies = this.detectStatisticalAnomalies(symbol, prices);
    anomalies.push(...statisticalAnomalies);

    // 2. 时间序列异常检测
    const timeSeriesAnomalies = this.detectTimeSeriesAnomalies(symbol, prices);
    anomalies.push(...timeSeriesAnomalies);

    // 3. 机器学习异常检测
    const mlAnomalies = this.detectMLAnomalies(symbol, prices);
    anomalies.push(...mlAnomalies);

    // 4. 行为模式异常检测
    const behaviorAnomalies = this.detectBehaviorAnomalies(symbol, prices);
    anomalies.push(...behaviorAnomalies);

    // 更新检测时间
    if (anomalies.length > 0) {
      this.recentDetections.set(symbol, new Date());
      this.addToHistory(symbol, anomalies);
    }

    return this.sortBySeverity(anomalies);
  }

  /**
   * 检测统计异常
   */
  private detectStatisticalAnomalies(symbol: string, prices: number[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    // Z-Score 检测
    const zScoreOutliers = this.statisticalDetector.detectOutliers(prices, this.config);
    zScoreOutliers.forEach((outlier) => {
      const confidence = Math.min(Math.abs(outlier.zScore) / 5, 1);
      anomalies.push(
        this.createAnomalyDetection(
          symbol,
          'statistical_outlier',
          this.calculateSeverity(confidence, this.config),
          confidence,
          { zScore: outlier.zScore },
          [
            {
              type: 'z_score',
              description: `Z-Score of ${outlier.zScore.toFixed(2)} exceeds threshold`,
              value: Math.abs(outlier.zScore),
              threshold: this.config.zScoreThreshold,
              confidence,
            },
          ],
        ),
      );
    });

    // IQR 检测
    const iqrOutliers = this.statisticalDetector.detectIQROutliers(prices, this.config);
    iqrOutliers.forEach((outlier) => {
      const confidence = Math.min(outlier.score / 3, 1);
      anomalies.push(
        this.createAnomalyDetection(
          symbol,
          'statistical_outlier',
          this.calculateSeverity(confidence, this.config),
          confidence,
          { deviationPercent: outlier.score * 100 },
          [
            {
              type: 'iqr',
              description: `Value ${outlier.score.toFixed(2)}x IQR from quartiles`,
              value: outlier.score,
              threshold: this.config.iqrMultiplier,
              confidence,
            },
          ],
        ),
      );
    });

    return anomalies;
  }

  /**
   * 检测时间序列异常
   */
  private detectTimeSeriesAnomalies(symbol: string, prices: number[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    // 趋势变化检测
    const trendChanges = this.timeSeriesDetector.detectTrendChange(
      prices,
      this.config.trendWindowSize,
    );
    trendChanges.forEach((change) => {
      const confidence = Math.min(change.change, 1);
      anomalies.push(
        this.createAnomalyDetection(
          symbol,
          'trend_break',
          this.calculateSeverity(confidence, this.config),
          confidence,
          { trendSlope: change.slope },
          [
            {
              type: 'trend_change',
              description: `Significant trend change detected (slope: ${change.slope.toFixed(4)})`,
              value: change.change,
              threshold: 0.5,
              confidence,
            },
          ],
        ),
      );
    });

    // 波动率峰值检测
    const volatilitySpikes = this.timeSeriesDetector.detectVolatilitySpikes(prices, this.config);
    volatilitySpikes.forEach((spike) => {
      const confidence = Math.min((spike.ratio - 2) / 3, 1);
      anomalies.push(
        this.createAnomalyDetection(
          symbol,
          'volatility_spike',
          this.calculateSeverity(confidence, this.config),
          confidence,
          { volatilityChange: spike.ratio },
          [
            {
              type: 'volatility_spike',
              description: `Volatility spike ${spike.ratio.toFixed(2)}x above average`,
              value: spike.ratio,
              threshold: 2,
              confidence,
            },
          ],
        ),
      );
    });

    return anomalies;
  }

  /**
   * 检测机器学习异常
   */
  private detectMLAnomalies(symbol: string, prices: number[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    // 孤立森林检测
    const isolationForestResults = this.mlDetector.detectAnomaliesWithIsolationForest(
      prices,
      this.config.isolationForestContamination,
    );

    isolationForestResults
      .filter((r) => r.isAnomaly)
      .forEach((result) => {
        const confidence = result.score;
        anomalies.push(
          this.createAnomalyDetection(
            symbol,
            'pattern_deviation',
            this.calculateSeverity(confidence, this.config),
            confidence,
            {},
            [
              {
                type: 'isolation_forest',
                description: `Anomaly detected by isolation forest (score: ${result.score.toFixed(4)})`,
                value: result.score,
                threshold: 1 - this.config.isolationForestContamination,
                confidence,
              },
            ],
          ),
        );
      });

    return anomalies;
  }

  /**
   * 检测行为模式异常
   */
  private detectBehaviorAnomalies(symbol: string, prices: number[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    // 周期性异常检测
    const seasonalityAnomalies = this.behaviorDetector.detectSeasonalityAnomaly(prices, 24);
    seasonalityAnomalies.forEach((anomaly) => {
      const confidence = Math.min(anomaly.deviation, 1);
      anomalies.push(
        this.createAnomalyDetection(
          symbol,
          'seasonality_anomaly',
          this.calculateSeverity(confidence, this.config),
          confidence,
          {
            expectedValue: anomaly.expected,
            actualValue: anomaly.actual,
            deviationPercent: anomaly.deviation * 100,
          },
          [
            {
              type: 'seasonality',
              description: `Seasonal pattern deviation: expected ${anomaly.expected.toFixed(2)}, got ${anomaly.actual.toFixed(2)}`,
              value: anomaly.deviation,
              threshold: 0.5,
              confidence,
            },
          ],
        ),
      );
    });

    return anomalies;
  }

  /**
   * 创建异常检测对象
   */
  private createAnomalyDetection(
    symbol: string,
    type: AnomalyType,
    severity: AnomalySeverity,
    confidence: number,
    metrics: AnomalyMetrics,
    evidence: AnomalyEvidence[],
  ): AnomalyDetection {
    return {
      id: `anomaly-${symbol}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      type,
      severity,
      confidence,
      timestamp: new Date(),
      detectedAt: new Date(),
      metrics,
      evidence,
      status: 'active',
    };
  }

  /**
   * 计算严重程度
   */
  private calculateSeverity(confidence: number, config: DetectionConfig): AnomalySeverity {
    if (confidence >= config.severityThresholds.high) return 'critical';
    if (confidence >= config.severityThresholds.medium) return 'high';
    if (confidence >= config.severityThresholds.low) return 'medium';
    return 'low';
  }

  /**
   * 检查是否在冷却期
   */
  private isInCooldown(symbol: string, cooldownPeriodMs: number): boolean {
    const lastDetection = this.recentDetections.get(symbol);
    if (!lastDetection) return false;
    return Date.now() - lastDetection.getTime() < cooldownPeriodMs;
  }

  /**
   * 按严重程度排序
   */
  private sortBySeverity(anomalies: AnomalyDetection[]): AnomalyDetection[] {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return anomalies.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(symbol: string, anomalies: AnomalyDetection[]): void {
    const existing = this.anomalyHistory.get(symbol) ?? [];
    existing.push(...anomalies);
    // 只保留最近100条
    if (existing.length > 100) {
      existing.splice(0, existing.length - 100);
    }
    this.anomalyHistory.set(symbol, existing);
  }

  /**
   * 获取检测统计
   */
  getStats(): {
    totalSymbols: number;
    recentDetections: number;
  } {
    return {
      totalSymbols: this.recentDetections.size,
      recentDetections: this.recentDetections.size,
    };
  }

  /**
   * 清除检测历史
   */
  clearHistory(): void {
    this.recentDetections.clear();
    this.anomalyHistory.clear();
    logger.info('Anomaly detection history cleared');
  }

  /**
   * 获取异常历史
   */
  getAnomalyHistory(symbol: string): AnomalyDetection[] {
    return this.anomalyHistory.get(symbol) ?? [];
  }

  /**
   * 根据ID获取异常
   */
  getAnomalyById(id: string): AnomalyDetection | undefined {
    for (const anomalies of this.anomalyHistory.values()) {
      const found = anomalies.find((a) => a.id === id);
      if (found) return found;
    }
    return undefined;
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<DetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Anomaly detection config updated');
  }

  // ============================================================================
  // 向后兼容的方法
  // ============================================================================

  private static instance: AnomalyDetectionService | null = null;

  /**
   * 获取单例实例 (向后兼容)
   */
  static getInstance(): AnomalyDetectionService {
    if (!AnomalyDetectionService.instance) {
      AnomalyDetectionService.instance = new AnomalyDetectionService();
    }
    return AnomalyDetectionService.instance;
  }

  /**
   * 检测异常 (向后兼容，使用 TimeSeriesPoint 格式)
   */
  async detectAnomalies(
    symbol: string,
    priceHistory: Array<{ timestamp: Date; value: number; volume?: number }>,
    config?: Partial<DetectionConfig>,
  ): Promise<AnomalyDetection[]> {
    // 临时更新配置
    if (config) {
      this.updateConfig(config);
    }

    // 检查数据点数量
    if (priceHistory.length < this.config.minDataPoints) {
      return [];
    }

    // 转换数据格式为 PriceHistoryRecord
    const convertedHistory = priceHistory.map((p) => ({
      id: `${symbol}-${p.timestamp.getTime()}`,
      symbol,
      protocol: 'chainlink' as const,
      chain: 'ethereum' as const,
      price: p.value,
      priceRaw: String(Math.floor(p.value * 1e8)),
      decimals: 8,
      timestamp: p.timestamp,
      blockNumber: 0,
    }));

    const anomalies: AnomalyDetection[] = [];

    // 检测价格异常
    const priceAnomalies = this.detectPriceAnomalies(symbol, convertedHistory);
    anomalies.push(...priceAnomalies);

    // 检测 volume 异常
    const volumes = priceHistory.map((p) => p.volume).filter((v): v is number => v !== undefined);
    if (volumes.length >= this.config.minDataPoints) {
      const volumeAnomalies = this.detectVolumeAnomalies(symbol, volumes);
      anomalies.push(...volumeAnomalies);
    }

    return this.sortBySeverity(anomalies);
  }

  /**
   * 检测 Volume 异常
   */
  private detectVolumeAnomalies(symbol: string, volumes: number[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    if (volumes.length < this.config.minDataPoints) {
      return anomalies;
    }

    const { mean, stdDev } = this.statisticalDetector.calculateStats(volumes);
    if (stdDev === 0) return anomalies;

    volumes.forEach((volume) => {
      const zScore = this.statisticalDetector.calculateZScore(volume, mean, stdDev);
      if (Math.abs(zScore) >= this.config.zScoreThreshold) {
        const confidence = Math.min(Math.abs(zScore) / 5, 1);
        anomalies.push(
          this.createAnomalyDetection(
            symbol,
            'volume_anomaly',
            this.calculateSeverity(confidence, this.config),
            confidence,
            {
              volumeChange: ((volume - mean) / mean) * 100,
              expectedValue: mean,
              actualValue: volume,
            },
            [
              {
                type: 'volume_spike',
                description: `Volume anomaly detected: ${volume.toFixed(2)} vs avg ${mean.toFixed(2)}`,
                value: Math.abs(zScore),
                threshold: this.config.zScoreThreshold,
                confidence,
              },
            ],
          ),
        );
      }
    });

    return anomalies;
  }

  /**
   * 更新异常状态 (向后兼容)
   */
  updateAnomalyStatus(id: string, status: 'active' | 'resolved' | 'false_positive'): boolean {
    for (const [, anomalies] of this.anomalyHistory.entries()) {
      const anomaly = anomalies.find((a) => a.id === id);
      if (anomaly) {
        anomaly.status = status;
        return true;
      }
    }
    return false;
  }

  /**
   * 获取异常统计 (向后兼容)
   */
  getAnomalyStats(): {
    totalAnomalies: number;
    activeAnomalies: number;
    bySymbol: Record<string, number>;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  } {
    let total = 0;
    let active = 0;
    const bySymbol: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const [symbol, anomalies] of this.anomalyHistory.entries()) {
      const symbolCount = anomalies.length;
      total += symbolCount;
      active += anomalies.filter((a) => a.status === 'active').length;
      bySymbol[symbol] = symbolCount;

      for (const anomaly of anomalies) {
        byType[anomaly.type] = (byType[anomaly.type] ?? 0) + 1;
        bySeverity[anomaly.severity] = (bySeverity[anomaly.severity] ?? 0) + 1;
      }
    }

    return {
      totalAnomalies: total,
      activeAnomalies: active,
      bySymbol,
      byType,
      bySeverity,
    };
  }

  /**
   * 关联异常 (向后兼容)
   */
  correlateAnomalies(
    symbols: string[],
    timeWindowMs: number,
  ): Array<{ symbols: [string, string]; anomalies: AnomalyDetection[]; correlationScore: number }> {
    const correlations: Array<{
      symbols: [string, string];
      anomalies: AnomalyDetection[];
      correlationScore: number;
    }> = [];

    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const symbol1 = symbols[i];
        const symbol2 = symbols[j];
        if (!symbol1 || !symbol2) continue;

        const anomalies1 = this.getAnomalyHistory(symbol1).filter(
          (a) => a.status === 'active' && Date.now() - a.timestamp.getTime() < timeWindowMs,
        );
        const anomalies2 = this.getAnomalyHistory(symbol2).filter(
          (a) => a.status === 'active' && Date.now() - a.timestamp.getTime() < timeWindowMs,
        );

        if (anomalies1.length > 0 && anomalies2.length > 0) {
          correlations.push({
            symbols: [symbol1, symbol2],
            anomalies: [...anomalies1, ...anomalies2],
            correlationScore: 0.8,
          });
        }
      }
    }

    return correlations;
  }
}
