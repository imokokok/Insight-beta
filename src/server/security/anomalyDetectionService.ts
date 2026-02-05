/**
 * Multi-Dimensional Anomaly Detection Service
 *
 * 多维度异常检测服务
 * - 统计异常检测 (Z-Score, IQR)
 * - 时间序列异常检测 (移动平均, 趋势分析)
 * - 机器学习异常检测 (孤立森林, 聚类)
 * - 行为模式异常检测
 */

import { logger } from '@/lib/logger';
import type { PriceHistoryRecord } from '@/server/priceHistory/priceHistoryService';

// ============================================================================
// 类型定义
// ============================================================================

export type AnomalyType =
  | 'statistical_outlier'
  | 'trend_break'
  | 'volatility_spike'
  | 'volume_anomaly'
  | 'pattern_deviation'
  | 'correlation_breakdown'
  | 'seasonality_anomaly'
  | 'regime_change';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AnomalyDetection {
  id: string;
  symbol: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  confidence: number;
  timestamp: Date;
  detectedAt: Date;
  metrics: AnomalyMetrics;
  evidence: AnomalyEvidence[];
  relatedData?: PriceHistoryRecord[];
  status: 'active' | 'resolved' | 'false_positive';
}

export interface AnomalyMetrics {
  zScore?: number;
  deviationPercent?: number;
  expectedValue?: number;
  actualValue?: number;
  volatilityChange?: number;
  volumeChange?: number;
  trendSlope?: number;
  correlationCoefficient?: number;
}

export interface AnomalyEvidence {
  type: string;
  description: string;
  value: number;
  threshold: number;
  confidence: number;
}

export interface DetectionConfig {
  // 统计检测配置
  zScoreThreshold: number;
  iqrMultiplier: number;
  minDataPoints: number;

  // 时间序列配置
  windowSize: number;
  trendWindowSize: number;
  volatilityWindowSize: number;

  // 机器学习配置
  isolationForestContamination: number;
  minClusterSize: number;

  // 行为模式配置
  patternHistoryLength: number;
  behaviorChangeThreshold: number;

  // 通用配置
  cooldownPeriodMs: number;
  severityThresholds: {
    low: number;
    medium: number;
    high: number;
  };
}

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  volume?: number;
}

// ============================================================================
// 统计检测器
// ============================================================================

export class StatisticalDetector {
  /**
   * 计算 Z-Score
   */
  calculateZScore(value: number, mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    return (value - mean) / stdDev;
  }

  /**
   * 计算均值和标准差
   */
  calculateStats(values: number[]): { mean: number; stdDev: number } {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return { mean, stdDev };
  }

  /**
   * 计算四分位距 (IQR)
   */
  calculateIQR(values: number[]): { q1: number; q3: number; iqr: number } {
    const sorted = [...values].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    const q1 = sorted[q1Index] ?? 0;
    const q3 = sorted[q3Index] ?? 0;
    const iqr = q3 - q1;
    return { q1, q3, iqr };
  }

  /**
   * 检测统计异常值
   */
  detectOutliers(
    values: number[],
    config: DetectionConfig,
  ): Array<{ index: number; zScore: number }> {
    const { mean, stdDev } = this.calculateStats(values);
    const outliers: Array<{ index: number; zScore: number }> = [];

    values.forEach((value, index) => {
      const zScore = this.calculateZScore(value, mean, stdDev);
      if (Math.abs(zScore) > config.zScoreThreshold) {
        outliers.push({ index, zScore });
      }
    });

    return outliers;
  }

  /**
   * 使用 IQR 方法检测异常值
   */
  detectIQROutliers(
    values: number[],
    config: DetectionConfig,
  ): Array<{ index: number; score: number }> {
    const { q1, q3, iqr } = this.calculateIQR(values);
    const lowerBound = q1 - config.iqrMultiplier * iqr;
    const upperBound = q3 + config.iqrMultiplier * iqr;
    const outliers: Array<{ index: number; score: number }> = [];

    values.forEach((value, index) => {
      if (value < lowerBound || value > upperBound) {
        const score = value < lowerBound ? (lowerBound - value) / iqr : (value - upperBound) / iqr;
        outliers.push({ index, score });
      }
    });

    return outliers;
  }
}

// ============================================================================
// 时间序列检测器
// ============================================================================

export class TimeSeriesDetector {
  /**
   * 计算移动平均
   */
  calculateMovingAverage(values: number[], windowSize: number): number[] {
    const result: number[] = [];
    for (let i = windowSize - 1; i < values.length; i++) {
      const window = values.slice(i - windowSize + 1, i + 1);
      const avg = window.reduce((a, b) => a + b, 0) / windowSize;
      result.push(avg);
    }
    return result;
  }

  /**
   * 计算指数移动平均 (EMA)
   */
  calculateEMA(values: number[], period: number): number[] {
    if (values.length === 0) return [];
    const multiplier = 2 / (period + 1);
    const ema: number[] = [values[0] ?? 0];

    for (let i = 1; i < values.length; i++) {
      const prevEma = ema[i - 1] ?? 0;
      const currentValue = values[i] ?? 0;
      ema.push((currentValue - prevEma) * multiplier + prevEma);
    }

    return ema;
  }

  /**
   * 计算波动率 (标准差)
   */
  calculateVolatility(values: number[], windowSize: number): number[] {
    const result: number[] = [];
    for (let i = windowSize - 1; i < values.length; i++) {
      const window = values.slice(i - windowSize + 1, i + 1);
      const mean = window.reduce((a, b) => a + b, 0) / windowSize;
      const variance = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / windowSize;
      result.push(Math.sqrt(variance));
    }
    return result;
  }

  /**
   * 检测趋势变化
   */
  detectTrendChange(
    values: number[],
    windowSize: number,
  ): Array<{ index: number; slope: number; change: number }> {
    const changes: Array<{ index: number; slope: number; change: number }> = [];

    for (let i = windowSize; i < values.length; i++) {
      const prevWindow = values.slice(i - windowSize, i);
      const currWindow = values.slice(i - windowSize + 1, i + 1);

      const prevSlope = this.calculateSlope(prevWindow);
      const currSlope = this.calculateSlope(currWindow);
      const slopeChange = Math.abs(currSlope - prevSlope);

      if (slopeChange > 0.5) {
        // 阈值可配置
        changes.push({
          index: i,
          slope: currSlope,
          change: slopeChange,
        });
      }
    }

    return changes;
  }

  /**
   * 计算线性回归斜率
   */
  private calculateSlope(values: number[]): number {
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      const value = values[i] ?? 0;
      numerator += (i - xMean) * (value - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * 检测波动率峰值
   */
  detectVolatilitySpikes(
    values: number[],
    config: DetectionConfig,
  ): Array<{ index: number; ratio: number }> {
    const volatility = this.calculateVolatility(values, config.volatilityWindowSize);
    const avgVolatility = volatility.reduce((a, b) => a + b, 0) / volatility.length;
    const spikes: Array<{ index: number; ratio: number }> = [];

    volatility.forEach((vol, index) => {
      const ratio = vol / avgVolatility;
      if (ratio > 2) {
        // 波动率超过平均值的2倍
        spikes.push({ index: index + config.volatilityWindowSize - 1, ratio });
      }
    });

    return spikes;
  }
}

// ============================================================================
// 机器学习检测器
// ============================================================================

export class MLDetector {
  /**
   * 简化版孤立森林检测
   * 使用随机分割来识别异常点
   */
  detectAnomaliesWithIsolationForest(
    data: number[],
    contamination: number = 0.1,
  ): Array<{ index: number; score: number; isAnomaly: boolean }> {
    const results: Array<{ index: number; score: number; isAnomaly: boolean }> = [];
    const numTrees = 10;
    const subSampleSize = Math.min(256, data.length);

    // 为每个数据点计算异常分数
    data.forEach((value, index) => {
      let totalPathLength = 0;

      for (let tree = 0; tree < numTrees; tree++) {
        totalPathLength += this.calculatePathLength(data, value, subSampleSize);
      }

      const avgPathLength = totalPathLength / numTrees;
      const score = Math.pow(2, -avgPathLength / this.averagePathLength(subSampleSize));
      const isAnomaly = score > 1 - contamination;

      results.push({ index, score, isAnomaly });
    });

    return results;
  }

  /**
   * 计算路径长度
   */
  private calculatePathLength(data: number[], value: number, subSampleSize: number): number {
    let pathLength = 0;
    let currentData = data.slice(0, subSampleSize);

    while (currentData.length > 1) {
      const min = Math.min(...currentData);
      const max = Math.max(...currentData);

      if (min === max) break;

      const splitValue = min + Math.random() * (max - min);

      if (value < splitValue) {
        currentData = currentData.filter((v) => v < splitValue);
      } else {
        currentData = currentData.filter((v) => v >= splitValue);
      }

      pathLength++;
    }

    return pathLength;
  }

  /**
   * 计算平均路径长度
   */
  private averagePathLength(n: number): number {
    if (n <= 1) return 0;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n;
  }

  /**
   * K-Means 聚类检测
   */
  detectClusters(
    data: number[],
    k: number = 3,
  ): Array<{ index: number; cluster: number; distance: number }> {
    // 简化版 K-Means
    const centroids = this.initializeCentroids(data, k);
    const assignments = new Array(data.length).fill(0);

    // 迭代分配
    for (let iteration = 0; iteration < 10; iteration++) {
      // 分配点到最近的质心
      data.forEach((value, index) => {
        let minDistance = Infinity;
        let closestCluster = 0;

        centroids.forEach((centroid, clusterIndex) => {
          const distance = Math.abs(value - centroid);
          if (distance < minDistance) {
            minDistance = distance;
            closestCluster = clusterIndex;
          }
        });

        assignments[index] = closestCluster;
      });

      // 更新质心
      for (let i = 0; i < k; i++) {
        const clusterPoints = data.filter((_, index) => assignments[index] === i);
        if (clusterPoints.length > 0) {
          centroids[i] = clusterPoints.reduce((a, b) => a + b, 0) / clusterPoints.length;
        }
      }
    }

    // 计算每个点到其质心的距离
    return data.map((value, index) => {
      const clusterIndex = assignments[index] ?? 0;
      const centroid = centroids[clusterIndex] ?? 0;
      return {
        index,
        cluster: clusterIndex,
        distance: Math.abs(value - centroid),
      };
    });
  }

  /**
   * 初始化质心
   */
  private initializeCentroids(data: number[], k: number): number[] {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const step = (max - min) / (k + 1);
    return Array.from({ length: k }, (_, i) => min + step * (i + 1));
  }
}

// ============================================================================
// 行为模式检测器
// ============================================================================

export class BehaviorPatternDetector {
  /**
   * 检测行为模式变化
   */
  detectBehaviorChange(
    currentPattern: number[],
    historicalPatterns: number[][],
  ): { hasChanged: boolean; similarity: number; changeMagnitude: number } {
    if (historicalPatterns.length === 0) {
      return { hasChanged: false, similarity: 1, changeMagnitude: 0 };
    }

    // 计算与历史模式的平均相似度
    const similarities = historicalPatterns.map((pattern) =>
      this.calculatePatternSimilarity(currentPattern, pattern),
    );

    const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    const changeMagnitude = 1 - avgSimilarity;

    return {
      hasChanged: changeMagnitude > 0.3, // 阈值可配置
      similarity: avgSimilarity,
      changeMagnitude,
    };
  }

  /**
   * 计算模式相似度 (余弦相似度)
   */
  calculatePatternSimilarity(pattern1: number[], pattern2: number[]): number {
    const minLength = Math.min(pattern1.length, pattern2.length);
    const p1 = pattern1.slice(0, minLength);
    const p2 = pattern2.slice(0, minLength);

    const dotProduct = p1.reduce((sum, val, i) => sum + val * (p2[i] ?? 0), 0);
    const norm1 = Math.sqrt(p1.reduce((sum, val) => sum + val * val, 0));
    const norm2 = Math.sqrt(p2.reduce((sum, val) => sum + val * val, 0));

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (norm1 * norm2);
  }

  /**
   * 检测周期性异常
   */
  detectSeasonalityAnomaly(
    values: number[],
    period: number = 24, // 默认24小时周期
  ): Array<{ index: number; expected: number; actual: number; deviation: number }> {
    const anomalies: Array<{ index: number; expected: number; actual: number; deviation: number }> =
      [];

    // 需要至少2个周期的数据
    if (values.length < period * 2) return anomalies;

    // 计算每个时间点的季节性平均值
    const seasonalAverages: number[] = [];
    for (let i = 0; i < period; i++) {
      const periodValues: number[] = [];
      for (let j = i; j < values.length; j += period) {
        const value = values[j];
        if (value !== undefined) {
          periodValues.push(value);
        }
      }
      seasonalAverages.push(periodValues.reduce((a, b) => a + b, 0) / periodValues.length);
    }

    // 检测偏离 seasonal pattern 的点
    values.forEach((value, index) => {
      const seasonalIndex = index % period;
      const expected = seasonalAverages[seasonalIndex] ?? 0;
      if (expected === 0) return;
      const deviation = Math.abs(value - expected) / expected;

      if (deviation > 0.2) {
        // 20% 阈值
        anomalies.push({ index, expected, actual: value, deviation });
      }
    });

    return anomalies;
  }
}

// ============================================================================
// 主服务类
// ============================================================================

export class AnomalyDetectionService {
  private static instance: AnomalyDetectionService;
  private statisticalDetector = new StatisticalDetector();
  private timeSeriesDetector = new TimeSeriesDetector();
  private mlDetector = new MLDetector();
  private behaviorDetector = new BehaviorPatternDetector();

  // Store for anomaly history
  private anomalyHistory: Map<string, AnomalyDetection[]> = new Map();

  private defaultConfig: DetectionConfig = {
    zScoreThreshold: 2.5,
    iqrMultiplier: 1.5,
    minDataPoints: 30,
    windowSize: 20,
    trendWindowSize: 10,
    volatilityWindowSize: 10,
    isolationForestContamination: 0.1,
    minClusterSize: 5,
    patternHistoryLength: 10,
    behaviorChangeThreshold: 0.3,
    cooldownPeriodMs: 300000, // 5分钟
    severityThresholds: {
      low: 0.3,
      medium: 0.6,
      high: 0.8,
    },
  };

  private recentDetections: Map<string, Date> = new Map();

  private constructor() {}

  static getInstance(): AnomalyDetectionService {
    if (!AnomalyDetectionService.instance) {
      AnomalyDetectionService.instance = new AnomalyDetectionService();
    }
    return AnomalyDetectionService.instance;
  }

  /**
   * 执行多维度异常检测
   */
  async detectAnomalies(
    symbol: string,
    priceData: TimeSeriesPoint[],
    config: Partial<DetectionConfig> = {},
  ): Promise<AnomalyDetection[]> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const anomalies: AnomalyDetection[] = [];

    // 检查冷却期
    if (this.isInCooldown(symbol, mergedConfig.cooldownPeriodMs)) {
      logger.debug(`Anomaly detection for ${symbol} is in cooldown`);
      return anomalies;
    }

    // 检查最小数据点
    if (priceData.length < mergedConfig.minDataPoints) {
      logger.debug(`Insufficient data points for ${symbol}: ${priceData.length}`);
      return anomalies;
    }

    const prices = priceData.map((p) => p.value);
    const volumes = priceData.map((p) => p.volume || 0);

    // 1. 统计异常检测
    const statisticalAnomalies = this.detectStatisticalAnomalies(symbol, prices, mergedConfig);
    anomalies.push(...statisticalAnomalies);

    // 2. 时间序列异常检测
    const timeSeriesAnomalies = this.detectTimeSeriesAnomalies(
      symbol,
      prices,
      volumes,
      mergedConfig,
    );
    anomalies.push(...timeSeriesAnomalies);

    // 3. 机器学习异常检测
    const mlAnomalies = this.detectMLAnomalies(symbol, prices, mergedConfig);
    anomalies.push(...mlAnomalies);

    // 4. 行为模式异常检测
    const behaviorAnomalies = this.detectBehaviorAnomalies(symbol, prices, mergedConfig);
    anomalies.push(...behaviorAnomalies);

    // 更新检测时间
    if (anomalies.length > 0) {
      this.recentDetections.set(symbol, new Date());
    }

    // 存储到历史记录
    const existingHistory = this.anomalyHistory.get(symbol) ?? [];
    this.anomalyHistory.set(symbol, [...existingHistory, ...anomalies]);

    // 按严重程度排序
    return this.sortBySeverity(anomalies);
  }

  /**
   * 统计异常检测
   */
  private detectStatisticalAnomalies(
    symbol: string,
    prices: number[],
    config: DetectionConfig,
  ): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    // Z-Score 检测
    const zScoreOutliers = this.statisticalDetector.detectOutliers(prices, config);
    zScoreOutliers.forEach(({ index, zScore }) => {
      const price = prices[index] ?? 0;
      const confidence = Math.min(Math.abs(zScore) / config.zScoreThreshold, 1);
      anomalies.push(
        this.createAnomalyDetection(
          symbol,
          'statistical_outlier',
          this.calculateSeverity(confidence, config),
          confidence,
          {
            zScore,
            expectedValue: price - zScore * this.statisticalDetector.calculateStats(prices).stdDev,
            actualValue: price,
          },
          [
            {
              type: 'z_score',
              description: `Z-Score: ${zScore.toFixed(2)}`,
              value: Math.abs(zScore),
              threshold: config.zScoreThreshold,
              confidence,
            },
          ],
        ),
      );
    });

    // IQR 检测
    const iqrOutliers = this.statisticalDetector.detectIQROutliers(prices, config);
    iqrOutliers.forEach(({ index, score }) => {
      const confidence = Math.min(score / 2, 1);
      anomalies.push(
        this.createAnomalyDetection(
          symbol,
          'statistical_outlier',
          this.calculateSeverity(confidence, config),
          confidence,
          { actualValue: prices[index] },
          [
            {
              type: 'iqr',
              description: `IQR Score: ${score.toFixed(2)}`,
              value: score,
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
   * 时间序列异常检测
   */
  private detectTimeSeriesAnomalies(
    symbol: string,
    prices: number[],
    volumes: number[],
    config: DetectionConfig,
  ): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    // 趋势变化检测
    const trendChanges = this.timeSeriesDetector.detectTrendChange(prices, config.trendWindowSize);
    trendChanges.forEach(({ slope, change }) => {
      const confidence = Math.min(change, 1);
      anomalies.push(
        this.createAnomalyDetection(
          symbol,
          'trend_break',
          this.calculateSeverity(confidence, config),
          confidence,
          { trendSlope: slope },
          [
            {
              type: 'trend_change',
              description: `Trend slope changed by ${change.toFixed(2)}`,
              value: change,
              threshold: 0.5,
              confidence,
            },
          ],
        ),
      );
    });

    // 波动率峰值检测
    const volatilitySpikes = this.timeSeriesDetector.detectVolatilitySpikes(prices, config);
    volatilitySpikes.forEach(({ ratio }) => {
      const confidence = Math.min((ratio - 1) / 2, 1);
      anomalies.push(
        this.createAnomalyDetection(
          symbol,
          'volatility_spike',
          this.calculateSeverity(confidence, config),
          confidence,
          { volatilityChange: ratio },
          [
            {
              type: 'volatility',
              description: `Volatility increased ${ratio.toFixed(2)}x`,
              value: ratio,
              threshold: 2,
              confidence,
            },
          ],
        ),
      );
    });

    // 交易量异常检测
    if (volumes.some((v) => v > 0)) {
      const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
      volumes.forEach((volume) => {
        const ratio = volume / avgVolume;
        if (ratio > 3) {
          // 交易量超过平均值3倍
          const confidence = Math.min((ratio - 1) / 4, 1);
          anomalies.push(
            this.createAnomalyDetection(
              symbol,
              'volume_anomaly',
              this.calculateSeverity(confidence, config),
              confidence,
              { volumeChange: ratio },
              [
                {
                  type: 'volume',
                  description: `Volume spike: ${ratio.toFixed(2)}x average`,
                  value: ratio,
                  threshold: 3,
                  confidence,
                },
              ],
            ),
          );
        }
      });
    }

    return anomalies;
  }

  /**
   * 机器学习异常检测
   */
  private detectMLAnomalies(
    symbol: string,
    prices: number[],
    config: DetectionConfig,
  ): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    // 孤立森林检测
    const isolationResults = this.mlDetector.detectAnomaliesWithIsolationForest(
      prices,
      config.isolationForestContamination,
    );

    isolationResults
      .filter((result) => result.isAnomaly)
      .forEach(({ index, score }) => {
        anomalies.push(
          this.createAnomalyDetection(
            symbol,
            'pattern_deviation',
            this.calculateSeverity(score, config),
            score,
            { actualValue: prices[index] },
            [
              {
                type: 'isolation_forest',
                description: `Isolation Forest Score: ${score.toFixed(3)}`,
                value: score,
                threshold: 1 - config.isolationForestContamination,
                confidence: score,
              },
            ],
          ),
        );
      });

    return anomalies;
  }

  /**
   * 行为模式异常检测
   */
  private detectBehaviorAnomalies(
    symbol: string,
    prices: number[],
    config: DetectionConfig,
  ): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    // 周期性异常检测 (假设24小时周期)
    const seasonalityAnomalies = this.behaviorDetector.detectSeasonalityAnomaly(prices, 24);
    seasonalityAnomalies.forEach(({ expected, actual, deviation }) => {
      const confidence = Math.min(deviation * 2, 1);
      anomalies.push(
        this.createAnomalyDetection(
          symbol,
          'seasonality_anomaly',
          this.calculateSeverity(confidence, config),
          confidence,
          { expectedValue: expected, actualValue: actual, deviationPercent: deviation * 100 },
          [
            {
              type: 'seasonality',
              description: `Seasonal deviation: ${(deviation * 100).toFixed(1)}%`,
              value: deviation,
              threshold: 0.2,
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
   * 更新异常状态
   */
  updateAnomalyStatus(id: string, status: AnomalyDetection['status']): boolean {
    for (const anomalies of this.anomalyHistory.values()) {
      const anomaly = anomalies.find((a) => a.id === id);
      if (anomaly) {
        anomaly.status = status;
        return true;
      }
    }
    return false;
  }

  /**
   * 获取异常统计
   */
  getAnomalyStats(): {
    totalAnomalies: number;
    bySymbol: Record<string, number>;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  } {
    const bySymbol: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let totalAnomalies = 0;

    for (const [symbol, anomalies] of this.anomalyHistory.entries()) {
      bySymbol[symbol] = anomalies.length;
      totalAnomalies += anomalies.length;

      for (const anomaly of anomalies) {
        byType[anomaly.type] = (byType[anomaly.type] ?? 0) + 1;
        bySeverity[anomaly.severity] = (bySeverity[anomaly.severity] ?? 0) + 1;
      }
    }

    return {
      totalAnomalies,
      bySymbol,
      byType,
      bySeverity,
    };
  }

  /**
   * 关联不同symbol的异常
   */
  correlateAnomalies(
    symbols: string[],
    timeWindowMs: number,
  ): Array<{
    symbols: string[];
    anomalies: AnomalyDetection[];
    timeRange: { start: Date; end: Date };
  }> | null {
    const allAnomalies: AnomalyDetection[] = [];

    for (const symbol of symbols) {
      const anomalies = this.anomalyHistory.get(symbol) ?? [];
      allAnomalies.push(...anomalies);
    }

    if (allAnomalies.length === 0) return [];

    // Group anomalies by time window
    const groups: AnomalyDetection[][] = [];
    const sorted = allAnomalies.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    let currentGroup: AnomalyDetection[] = [];
    for (const anomaly of sorted) {
      if (currentGroup.length === 0) {
        currentGroup.push(anomaly);
      } else {
        const lastAnomaly = currentGroup[currentGroup.length - 1];
        if (
          lastAnomaly &&
          anomaly.timestamp.getTime() - lastAnomaly.timestamp.getTime() <= timeWindowMs
        ) {
          currentGroup.push(anomaly);
        } else {
          groups.push(currentGroup);
          currentGroup = [anomaly];
        }
      }
    }
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups.map((group) => {
      const firstAnomaly = group[0];
      const lastAnomaly = group[group.length - 1];
      return {
        symbols: [...new Set(group.map((a) => a.symbol))],
        anomalies: group,
        timeRange: {
          start: firstAnomaly?.timestamp ?? new Date(),
          end: lastAnomaly?.timestamp ?? new Date(),
        },
      };
    });
  }
}

// ============================================================================
// 单例导出
// ============================================================================

export const anomalyDetectionService = AnomalyDetectionService.getInstance();
