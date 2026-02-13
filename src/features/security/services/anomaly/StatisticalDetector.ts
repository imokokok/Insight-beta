/**
 * Statistical Anomaly Detector
 * 统计异常检测器 (Z-Score, IQR)
 */

import type { DetectionConfig } from './types';

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
