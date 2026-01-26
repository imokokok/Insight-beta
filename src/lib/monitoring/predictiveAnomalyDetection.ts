import { logger } from '@/lib/logger';

export interface AnomalyDetectionConfig {
  threshold: number;
  windowSize: number;
  minDataPoints: number;
  sensitivity: 'low' | 'medium' | 'high';
  enablePrediction: boolean;
  predictionHorizon: number;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  message: string;
  timestamp: string;
  type: AnomalyType;
  confidence: number;
  affectedMetrics: string[];
  recommendedActions: string[];
}

export interface PredictionResult {
  predictedValue: number;
  confidenceInterval: { lower: number; upper: number };
  predictionTime: string;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  trendStrength: number;
  riskLevel: 'low' | 'medium' | 'high';
  anomaliesExpected: number;
}

export interface TimeSeriesData {
  timestamp: string;
  value: number;
  metadata?: Record<string, unknown>;
}

export type AnomalyType =
  | 'spike'
  | 'drop'
  | 'trend_change'
  | 'seasonality_break'
  | 'volatility_increase'
  | 'correlation_break'
  | 'rate_of_change'
  | 'prediction_deviation';

export interface MetricProfile {
  metricName: string;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  seasonalityPattern: number[];
  trendCoefficient: number;
  volatilityIndex: number;
  lastUpdated: string;
  sampleCount: number;
}

export class PredictiveAnomalyDetector {
  private config: AnomalyDetectionConfig;
  private history: Map<string, TimeSeriesData[]> = new Map();
  private profiles: Map<string, MetricProfile> = new Map();
  private seasonalPatterns: Map<string, number[]> = new Map();
  private predictions: Map<string, PredictionResult> = new Map();

  private readonly SENSITIVITY_MULTIPLIERS = {
    low: 3.0,
    medium: 2.5,
    high: 2.0,
  };

  constructor(config?: Partial<AnomalyDetectionConfig>) {
    this.config = {
      threshold: config?.threshold || 2.5,
      windowSize: config?.windowSize || 24,
      minDataPoints: config?.minDataPoints || 10,
      sensitivity: config?.sensitivity || 'medium',
      enablePrediction: config?.enablePrediction !== false,
      predictionHorizon: config?.predictionHorizon || 6,
    };
  }

  detect(metricName: string, dataPoint: TimeSeriesData): AnomalyResult | null {
    if (!this.history.has(metricName)) {
      this.history.set(metricName, []);
    }

    const metricHistory = this.history.get(metricName);
    if (!metricHistory) return null;
    metricHistory.push(dataPoint);

    if (metricHistory.length < this.config.minDataPoints) {
      return null;
    }

    const recentData = metricHistory.slice(-this.config.windowSize * 2);
    const window = metricHistory.slice(-this.config.windowSize);

    const anomalies: AnomalyResult[] = [];

    const zScoreAnomaly = this.detectZScoreAnomaly(metricName, dataPoint, window);
    if (zScoreAnomaly) anomalies.push(zScoreAnomaly);

    const spikeAnomaly = this.detectSpike(dataPoint, recentData);
    if (spikeAnomaly) anomalies.push(spikeAnomaly);

    const trendAnomaly = this.detectTrendAnomaly(metricName, recentData);
    if (trendAnomaly) anomalies.push(trendAnomaly);

    const volatilityAnomaly = this.detectVolatilityAnomaly(recentData);
    if (volatilityAnomaly) anomalies.push(volatilityAnomaly);

    const rateOfChangeAnomaly = this.detectRateOfChange(dataPoint, metricHistory);
    if (rateOfChangeAnomaly) anomalies.push(rateOfChangeAnomaly);

    if (anomalies.length > 0) {
      const combined = this.combineAnomalies(anomalies);
      logger.warn('Anomaly detected', {
        metricName,
        type: combined.type,
        severity: combined.severity,
        score: combined.score,
      });
      return combined;
    }

    this.updateProfile(metricName, dataPoint);

    if (this.config.enablePrediction) {
      this.generatePrediction(metricName, metricHistory);
    }

    return null;
  }

  private detectZScoreAnomaly(
    metricName: string,
    dataPoint: TimeSeriesData,
    window: TimeSeriesData[],
  ): AnomalyResult | null {
    const values = window.map((d) => d.value);
    const mean = this.calculateMean(values);
    const stdDev = this.calculateStdDev(values, mean);

    if (stdDev === 0) return null;

    const zScore = Math.abs((dataPoint.value - mean) / stdDev);
    // Safe: config.sensitivity is a literal type with known keys
    const threshold = this.SENSITIVITY_MULTIPLIERS[this.config.sensitivity];

    if (zScore > threshold) {
      const severity = this.calculateSeverity(zScore);
      const direction = dataPoint.value > mean ? 'above' : 'below';

      if (mean === 0) {
        return {
          isAnomaly: true,
          severity,
          score: Math.min(100, zScore * 10),
          message: `Value is ${dataPoint.value.toFixed(2)}, absolute deviation detected (Z-score: ${zScore.toFixed(2)})`,
          timestamp: dataPoint.timestamp,
          type: 'spike',
          confidence: this.calculateConfidence(window.length),
          affectedMetrics: [metricName],
          recommendedActions: this.getRecommendedActions('zscore', severity),
        };
      }

      const deviationPercent = ((dataPoint.value - mean) / mean) * 100;

      return {
        isAnomaly: true,
        severity,
        score: Math.min(100, zScore * 10),
        message: `Value is ${Math.abs(deviationPercent).toFixed(1)}% ${direction} expected range (Z-score: ${zScore.toFixed(2)})`,
        timestamp: dataPoint.timestamp,
        type: deviationPercent > 0 ? 'spike' : 'drop',
        confidence: this.calculateConfidence(window.length),
        affectedMetrics: [metricName],
        recommendedActions: this.getRecommendedActions('zscore', severity),
      };
    }

    return null;
  }

  private detectSpike(current: TimeSeriesData, recentData: TimeSeriesData[]): AnomalyResult | null {
    if (recentData.length < 5) return null;

    const values = recentData.slice(0, -1).map((d) => d.value);
    const mean = this.calculateMean(values);
    const stdDev = this.calculateStdDev(values, mean);
    const expected = mean;

    if (expected === 0) return null;

    const changePercent = Math.abs((current.value - expected) / expected) * 100;

    if (changePercent > 50) {
      const zScore = stdDev > 0 ? Math.abs(current.value - expected) / stdDev : 0;

      return {
        isAnomaly: true,
        severity: zScore > 4 ? 'critical' : zScore > 3 ? 'high' : 'medium',
        score: Math.min(100, changePercent),
        message: `Sudden ${current.value > expected ? 'spike' : 'drop'} detected: ${current.value.toFixed(2)} (expected: ${expected.toFixed(2)})`,
        timestamp: current.timestamp,
        type: 'spike',
        confidence: this.calculateConfidence(recentData.length),
        affectedMetrics: [],
        recommendedActions: this.getRecommendedActions('spike', zScore > 3 ? 'high' : 'medium'),
      };
    }

    return null;
  }

  private detectTrendAnomaly(metricName: string, data: TimeSeriesData[]): AnomalyResult | null {
    if (data.length < this.config.windowSize) return null;

    const window = data.slice(-this.config.windowSize);
    const firstHalf = window.slice(0, Math.floor(window.length / 2));
    const secondHalf = window.slice(Math.floor(window.length / 2));

    const firstMean = this.calculateMean(firstHalf.map((d) => d.value));
    const secondMean = this.calculateMean(secondHalf.map((d) => d.value));

    if (firstMean === 0) return null;

    const changePercent = Math.abs((secondMean - firstMean) / firstMean) * 100;

    if (changePercent > this.config.threshold * 15) {
      const latestPoint = data[data.length - 1];
      if (!latestPoint) return null;

      return {
        isAnomaly: true,
        severity: changePercent > 50 ? 'critical' : changePercent > 30 ? 'high' : 'medium',
        score: Math.min(100, changePercent),
        message: `Significant trend change: ${changePercent.toFixed(1)}% ${secondMean > firstMean ? 'increase' : 'decrease'} detected`,
        timestamp: latestPoint.timestamp,
        type: 'trend_change',
        confidence: this.calculateConfidence(data.length),
        affectedMetrics: [metricName],
        recommendedActions: this.getRecommendedActions(
          'trend_change',
          changePercent > 30 ? 'high' : 'medium',
        ),
      };
    }

    return null;
  }

  private detectVolatilityAnomaly(data: TimeSeriesData[]): AnomalyResult | null {
    if (data.length < 10) return null;

    const recent = data.slice(-10);
    const older = data.slice(-20, -10);

    if (older.length < 5) return null;

    const recentVolatility = this.calculateVolatility(recent.map((d) => d.value));
    const olderVolatility = this.calculateVolatility(older.map((d) => d.value));

    if (olderVolatility === 0) return null;

    const volatilityIncrease = (recentVolatility - olderVolatility) / olderVolatility;

    if (volatilityIncrease > 1.5) {
      const lastDataPoint = recent[recent.length - 1];
      return {
        isAnomaly: true,
        severity: volatilityIncrease > 3 ? 'critical' : volatilityIncrease > 2 ? 'high' : 'medium',
        score: Math.min(100, volatilityIncrease * 25),
        message: `Volatility increased by ${(volatilityIncrease * 100).toFixed(0)}% - market may be unstable`,
        timestamp: lastDataPoint?.timestamp || new Date().toISOString(),
        type: 'volatility_increase',
        confidence: this.calculateConfidence(data.length),
        affectedMetrics: [],
        recommendedActions: this.getRecommendedActions(
          'volatility',
          volatilityIncrease > 2 ? 'high' : 'medium',
        ),
      };
    }

    return null;
  }

  private detectRateOfChange(
    current: TimeSeriesData,
    history: TimeSeriesData[],
  ): AnomalyResult | null {
    if (history.length < 3) return null;

    const previous = history[history.length - 2];
    if (!previous) return null;

    if (previous.value === 0) return null;

    const rateOfChange = Math.abs((current.value - previous.value) / previous.value);

    if (rateOfChange > 0.5) {
      return {
        isAnomaly: true,
        severity: rateOfChange > 1 ? 'critical' : rateOfChange > 0.75 ? 'high' : 'medium',
        score: Math.min(100, rateOfChange * 50),
        message: `Rapid change of ${(rateOfChange * 100).toFixed(0)}% detected in single period`,
        timestamp: current.timestamp,
        type: 'rate_of_change',
        confidence: this.calculateConfidence(history.length),
        affectedMetrics: [],
        recommendedActions: this.getRecommendedActions(
          'rate_of_change',
          rateOfChange > 0.75 ? 'high' : 'medium',
        ),
      };
    }

    return null;
  }

  private combineAnomalies(anomalies: AnomalyResult[]): AnomalyResult {
    if (anomalies.length === 0) {
      return {
        isAnomaly: false,
        severity: 'low',
        score: 0,
        message: 'No anomalies to combine',
        timestamp: new Date().toISOString(),
        type: 'spike',
        confidence: 0,
        affectedMetrics: [],
        recommendedActions: [],
      };
    }

    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const maxSeverity = anomalies.reduce((max, a) => {
      const maxSeverityVal = max as AnomalyResult;
      const aSeverityVal = a as AnomalyResult;
      return severityOrder[aSeverityVal.severity] > severityOrder[maxSeverityVal.severity]
        ? a
        : max;
    }, anomalies[0] as AnomalyResult);

    const avgScore = anomalies.reduce((sum, a) => sum + a.score, 0) / anomalies.length;

    const allActions = anomalies.flatMap((a) => a.recommendedActions);
    const uniqueActions = [...new Set(allActions)].slice(0, 3);

    const affectedMetrics = [...new Set(anomalies.flatMap((a) => a.affectedMetrics))];

    return {
      isAnomaly: true,
      severity: maxSeverity.severity,
      score: avgScore,
      message: `${anomalies.length} anomalies detected: ${anomalies.map((a) => a.type).join(', ')}`,
      timestamp: maxSeverity.timestamp,
      type: maxSeverity.type,
      confidence: Math.min(...anomalies.map((a) => a.confidence)),
      affectedMetrics,
      recommendedActions: uniqueActions,
    };
  }

  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateStdDev(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    const squaredDifferences = values.map((value) => Math.pow(value - mean, 2));
    const variance = this.calculateMean(squaredDifferences);
    return Math.sqrt(variance);
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    const returns: number[] = [];
    for (let i = 1; i < values.length; i++) {
      const prevValue = values[i - 1];
      const currentValue = values[i];
      if (prevValue !== undefined && prevValue !== 0 && currentValue !== undefined) {
        returns.push(Math.abs((currentValue - prevValue) / prevValue));
      }
    }
    return this.calculateMean(returns);
  }

  private calculateSeverity(zScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (zScore < 3) return 'low';
    if (zScore < 4) return 'medium';
    if (zScore < 5) return 'high';
    return 'critical';
  }

  private calculateConfidence(dataPoints: number): number {
    return Math.min(0.95, 0.5 + dataPoints / 100);
  }

  private getRecommendedActions(type: string, severity: string): string[] {
    const actionMap: Record<string, string[]> = {
      zscore: [
        'Review recent data sources',
        'Check for data pipeline issues',
        'Verify data collection methods',
      ],
      spike: [
        'Investigate spike cause immediately',
        'Check external data feeds',
        'Consider pausing automated processes',
      ],
      trend_change: [
        'Analyze trend drivers',
        'Review market conditions',
        'Update prediction models',
      ],
      volatility: [
        'Increase monitoring frequency',
        'Prepare contingency plans',
        'Alert relevant stakeholders',
      ],
      rate_of_change: ['Check for data anomalies', 'Verify system integrity', 'Pause if necessary'],
    };

    // Safe: actionMap is a fixed record with known keys

    const actions = actionMap[type] || [
      'Investigate the anomaly',
      'Document findings',
      'Review system logs',
    ];

    if (severity === 'critical' || severity === 'high') {
      actions.unshift('URGENT: Immediate investigation required');
    }

    return actions.slice(0, 3);
  }

  private updateProfile(metricName: string, _dataPoint: TimeSeriesData): void {
    const history = this.history.get(metricName) || [];
    if (history.length < this.config.minDataPoints) return;

    const values = history.slice(-100).map((d) => d.value);
    const profile: MetricProfile = {
      metricName,
      mean: this.calculateMean(values),
      stdDev: this.calculateStdDev(values, this.calculateMean(values)),
      min: Math.min(...values),
      max: Math.max(...values),
      seasonalityPattern: this.calculateSeasonalityPattern(history),
      trendCoefficient: this.calculateTrendCoefficient(history),
      volatilityIndex: this.calculateVolatility(values),
      lastUpdated: new Date().toISOString(),
      sampleCount: history.length,
    };

    this.profiles.set(metricName, profile);
  }

  private calculateSeasonalityPattern(data: TimeSeriesData[]): number[] {
    if (data.length < 24) return [];

    const hourlyAverages = new Array(24).fill(0);
    const hourlyCounts = new Array(24).fill(0);

    data.forEach((d) => {
      const hour = new Date(d.timestamp).getHours();
      // Safe: hour is a number from 0-23, arrays are fixed size

      hourlyAverages[hour] += d.value;

      hourlyCounts[hour]++;
    });

    return hourlyAverages.map((sum, i) => (hourlyCounts[i] > 0 ? sum / hourlyCounts[i] : 0));
  }

  private calculateTrendCoefficient(data: TimeSeriesData[]): number {
    if (data.length < 2) return 0;

    const n = data.length;
    const xMean = (n - 1) / 2;
    const yMean = this.calculateMean(data.map((d) => d.value));

    let numerator = 0;
    let denominator = 0;

    data.forEach((d, i) => {
      numerator += (i - xMean) * (d.value - yMean);
      denominator += Math.pow(i - xMean, 2);
    });

    return denominator !== 0 ? numerator / denominator : 0;
  }

  private generatePrediction(metricName: string, history: TimeSeriesData[]): void {
    if (history.length < this.config.minDataPoints) return;

    const profile = this.profiles.get(metricName);
    if (!profile) return;

    const recentData = history.slice(-this.config.windowSize);
    const values = recentData.map((d) => d.value);
    const mean = this.calculateMean(values);
    const stdDev = this.calculateStdDev(values, mean);

    const predictedValue = mean + profile.trendCoefficient * this.config.predictionHorizon;
    const uncertainty = stdDev * Math.sqrt(1 + this.config.predictionHorizon / recentData.length);

    const trend =
      profile.trendCoefficient > 0.01
        ? 'increasing'
        : profile.trendCoefficient < -0.01
          ? 'decreasing'
          : Math.abs(profile.volatilityIndex - 0.1) > 0.05
            ? 'volatile'
            : 'stable';

    const riskLevel =
      Math.abs(profile.trendCoefficient) > 0.1 || profile.volatilityIndex > 0.2
        ? 'high'
        : Math.abs(profile.trendCoefficient) > 0.05 || profile.volatilityIndex > 0.1
          ? 'medium'
          : 'low';

    const anomaliesExpected = this.estimateAnomalies(recentData);

    const prediction: PredictionResult = {
      predictedValue,
      confidenceInterval: {
        lower: predictedValue - uncertainty * 1.96,
        upper: predictedValue + uncertainty * 1.96,
      },
      predictionTime: new Date(
        Date.now() + this.config.predictionHorizon * 60 * 60 * 1000,
      ).toISOString(),
      trend,
      trendStrength: Math.abs(profile.trendCoefficient) * 100,
      riskLevel,
      anomaliesExpected,
    };

    this.predictions.set(metricName, prediction);
  }

  private estimateAnomalies(data: TimeSeriesData[]): number {
    if (data.length < 5) return 0;

    const values = data.map((d) => d.value);
    const mean = this.calculateMean(values);
    const stdDev = this.calculateStdDev(values, mean);
    // Safe: config.sensitivity is a literal type with known keys
    const threshold = this.SENSITIVITY_MULTIPLIERS[this.config.sensitivity];

    const anomalies = values.filter((v) => Math.abs(v - mean) / stdDev > threshold);

    return Math.round((anomalies.length / values.length) * this.config.predictionHorizon);
  }

  getPrediction(metricName: string): PredictionResult | null {
    return this.predictions.get(metricName) || null;
  }

  getProfile(metricName: string): MetricProfile | null {
    return this.profiles.get(metricName) || null;
  }

  getAllPredictions(): Map<string, PredictionResult> {
    return new Map(this.predictions);
  }

  reset(): void {
    this.history.clear();
    this.profiles.clear();
    this.seasonalPatterns.clear();
    this.predictions.clear();
  }

  updateConfig(newConfig: Partial<AnomalyDetectionConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }
}

let detector: PredictiveAnomalyDetector | null = null;

export function getPredictiveDetector(
  config?: Partial<AnomalyDetectionConfig>,
): PredictiveAnomalyDetector {
  if (!detector) {
    detector = new PredictiveAnomalyDetector(config);
  }
  return detector;
}

export function detectOracleAnomaliesAdvanced(
  metricName: string,
  dataPoint: TimeSeriesData,
  type:
    | 'sync_lag'
    | 'dispute_rate'
    | 'error_rate'
    | 'assertion_volume'
    | 'response_time'
    | 'cost_efficiency',
): AnomalyResult | null {
  const detector = getPredictiveDetector();

  const result = detector.detect(metricName, dataPoint);

  if (result) {
    logger.info(`Advanced anomaly detection for ${type}`, {
      metricName,
      type: result.type,
      severity: result.severity,
      score: result.score,
      confidence: result.confidence,
      recommendedActions: result.recommendedActions,
    });
  }

  return result;
}

export function getOraclePrediction(metricName: string): PredictionResult | null {
  const detector = getPredictiveDetector();
  return detector.getPrediction(metricName);
}

export function calculateSystemHealthScore(
  anomalies: AnomalyResult[],
  prediction: PredictionResult | null,
): number {
  if (anomalies.length === 0 && (!prediction || prediction.riskLevel === 'low')) {
    return 100;
  }

  const anomalyPenalty = anomalies.reduce((sum, a) => {
    const severityPenalty = { low: 5, medium: 10, high: 20, critical: 30 };
    return sum + severityPenalty[a.severity] * (a.score / 100);
  }, 0);

  const riskPenalty = prediction ? { low: 0, medium: 5, high: 15 }[prediction.riskLevel] : 0;

  const score = Math.max(0, 100 - anomalyPenalty - riskPenalty);

  return Math.round(score);
}
