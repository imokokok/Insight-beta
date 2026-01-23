import { logger } from "@/lib/logger";

export interface AnomalyDetectionConfig {
  threshold: number;
  windowSize: number;
  minDataPoints: number;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  severity: "low" | "medium" | "high";
  score: number;
  message: string;
  timestamp: string;
}

export interface TimeSeriesData {
  timestamp: string;
  value: number;
}

export class AnomalyDetector {
  private config: AnomalyDetectionConfig;
  private history: TimeSeriesData[] = [];

  constructor(config: Partial<AnomalyDetectionConfig> = {}) {
    this.config = {
      threshold: config.threshold || 2.5,
      windowSize: config.windowSize || 10,
      minDataPoints: config.minDataPoints || 5,
    };
  }

  detect(dataPoint: TimeSeriesData): AnomalyResult | null {
    this.history.push(dataPoint);

    if (this.history.length < this.config.minDataPoints) {
      return null;
    }

    const window = this.history.slice(-this.config.windowSize);
    const mean = this.calculateMean(window.map((d) => d.value));
    const stdDev = this.calculateStdDev(window.map((d) => d.value), mean);

    if (stdDev === 0) {
      return null;
    }

    const zScore = Math.abs((dataPoint.value - mean) / stdDev);
    const isAnomaly = zScore > this.config.threshold;

    if (!isAnomaly) {
      return null;
    }

    const severity = this.calculateSeverity(zScore);
    const score = Math.min(100, zScore * 10);

    return {
      isAnomaly: true,
      severity,
      score,
      message: this.generateAnomalyMessage(dataPoint.value, mean, stdDev, zScore),
      timestamp: dataPoint.timestamp,
    };
  }

  detectBatch(data: TimeSeriesData[]): AnomalyResult[] {
    const anomalies: AnomalyResult[] = [];

    for (const point of data) {
      const result = this.detect(point);
      if (result) {
        anomalies.push(result);
      }
    }

    return anomalies;
  }

  detectTrendAnomalies(data: TimeSeriesData[]): AnomalyResult[] {
    if (data.length < this.config.windowSize) {
      return [];
    }

    const anomalies: AnomalyResult[] = [];
    const window = data.slice(-this.config.windowSize);

    const firstHalf = window.slice(0, Math.floor(window.length / 2));
    const secondHalf = window.slice(Math.floor(window.length / 2));

    const firstMean = this.calculateMean(firstHalf.map((d) => d.value));
    const secondMean = this.calculateMean(secondHalf.map((d) => d.value));

    const changePercent = Math.abs((secondMean - firstMean) / firstMean) * 100;

    if (changePercent > this.config.threshold * 10) {
      const latestPoint = data[data.length - 1];
      const severity = this.calculateSeverity(changePercent / 10);
      const score = Math.min(100, changePercent);

      anomalies.push({
        isAnomaly: true,
        severity,
        score,
        message: `Significant trend change detected: ${changePercent.toFixed(2)}% increase/decrease`,
        timestamp: latestPoint.timestamp,
      });

      logger.warn("Trend anomaly detected", {
        changePercent,
        firstMean,
        secondMean,
      });
    }

    return anomalies;
  }

  detectPatternAnomalies(data: TimeSeriesData[]): AnomalyResult[] {
    if (data.length < this.config.windowSize * 2) {
      return [];
    }

    const anomalies: AnomalyResult[] = [];
    const recentData = data.slice(-this.config.windowSize * 2);

    const spikes = this.detectSpikes(recentData);
    const drops = this.detectDrops(recentData);

    for (const spike of spikes) {
      anomalies.push({
        isAnomaly: true,
        severity: "high",
        score: Math.min(100, spike.zScore * 10),
        message: `Sudden spike detected: ${spike.value.toFixed(2)} (expected: ${spike.expected.toFixed(2)})`,
        timestamp: spike.timestamp,
      });
    }

    for (const drop of drops) {
      anomalies.push({
        isAnomaly: true,
        severity: "high",
        score: Math.min(100, drop.zScore * 10),
        message: `Sudden drop detected: ${drop.value.toFixed(2)} (expected: ${drop.expected.toFixed(2)})`,
        timestamp: drop.timestamp,
      });
    }

    return anomalies;
  }

  private detectSpikes(data: TimeSeriesData[]): Array<{ timestamp: string; value: number; expected: number; zScore: number }> {
    const spikes: Array<{ timestamp: string; value: number; expected: number; zScore: number }> = [];

    for (let i = 2; i < data.length; i++) {
      const current = data[i].value;
      const previous1 = data[i - 1].value;
      const previous2 = data[i - 2].value;

      const expected = (previous1 + previous2) / 2;
      const changePercent = Math.abs((current - expected) / expected) * 100;

      if (changePercent > 50) {
        const zScore = Math.abs((current - expected) / this.calculateStdDev(
          data.slice(Math.max(0, i - 5), i).map((d) => d.value),
          expected,
        ));

        spikes.push({
          timestamp: data[i].timestamp,
          value: current,
          expected,
          zScore,
        });
      }
    }

    return spikes;
  }

  private detectDrops(data: TimeSeriesData[]): Array<{ timestamp: string; value: number; expected: number; zScore: number }> {
    const drops: Array<{ timestamp: string; value: number; expected: number; zScore: number }> = [];

    for (let i = 2; i < data.length; i++) {
      const current = data[i].value;
      const previous1 = data[i - 1].value;
      const previous2 = data[i - 2].value;

      const expected = (previous1 + previous2) / 2;
      const changePercent = Math.abs((current - expected) / expected) * 100;

      if (changePercent > 50 && current < expected) {
        const zScore = Math.abs((current - expected) / this.calculateStdDev(
          data.slice(Math.max(0, i - 5), i).map((d) => d.value),
          expected,
        ));

        drops.push({
          timestamp: data[i].timestamp,
          value: current,
          expected,
          zScore,
        });
      }
    }

    return drops;
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

  private calculateSeverity(zScore: number): "low" | "medium" | "high" {
    if (zScore < 3) return "low";
    if (zScore < 5) return "medium";
    return "high";
  }

  private generateAnomalyMessage(value: number, mean: number, stdDev: number, zScore: number): string {
    const deviationPercent = ((value - mean) / mean) * 100;
    const direction = value > mean ? "above" : "below";
    const deviationType = Math.abs(deviationPercent) > 100 ? "extreme" : "significant";

    return `Value is ${deviationType} (${Math.abs(deviationPercent).toFixed(1)}%) ${direction} expected range (Z-score: ${zScore.toFixed(2)})`;
  }

  reset(): void {
    this.history = [];
  }

  updateConfig(newConfig: Partial<AnomalyDetectionConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }
}

let anomalyDetector: AnomalyDetector | null = null;

export function getAnomalyDetector(config?: Partial<AnomalyDetectionConfig>): AnomalyDetector {
  if (!anomalyDetector) {
    anomalyDetector = new AnomalyDetector(config);
  }
  return anomalyDetector;
}

export function detectOracleAnomalies(
  data: TimeSeriesData[],
  type: "sync_lag" | "dispute_rate" | "error_rate" | "assertion_volume",
): AnomalyResult[] {
  const detector = getAnomalyDetector();

  const zScoreAnomalies = detector.detectBatch(data);
  const trendAnomalies = detector.detectTrendAnomalies(data);
  const patternAnomalies = detector.detectPatternAnomalies(data);

  const allAnomalies = [
    ...zScoreAnomalies,
    ...trendAnomalies,
    ...patternAnomalies,
  ];

  const uniqueAnomalies = allAnomalies.filter((anomaly, index, self) =>
    index === self.findIndex((a) => a.timestamp === anomaly.timestamp)
  );

  logger.info(`Anomaly detection completed for ${type}`, {
    totalAnomalies: uniqueAnomalies.length,
    zScoreAnomalies: zScoreAnomalies.length,
    trendAnomalies: trendAnomalies.length,
    patternAnomalies: patternAnomalies.length,
  });

  return uniqueAnomalies;
}

export function calculateAnomalyScore(anomalies: AnomalyResult[]): number {
  if (anomalies.length === 0) return 0;

  const totalScore = anomalies.reduce((sum, anomaly) => sum + anomaly.score, 0);
  return totalScore / anomalies.length;
}

export function getAnomalySeverity(anomalies: AnomalyResult[]): "low" | "medium" | "high" {
  if (anomalies.length === 0) return "low";

  const highSeverityCount = anomalies.filter((a) => a.severity === "high").length;
  const mediumSeverityCount = anomalies.filter((a) => a.severity === "medium").length;

  if (highSeverityCount >= 3) return "high";
  if (mediumSeverityCount >= 5) return "medium";
  return "low";
}