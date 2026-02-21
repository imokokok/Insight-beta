/**
 * Statistical Anomaly Detector
 * 统计异常检测器 (Z-Score, IQR, 孤立森林, 聚类)
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

  /**
   * 孤立森林检测 (统计方法)
   * 使用随机分割来识别异常点
   */
  detectAnomaliesWithIsolationForest(
    data: number[],
    contamination: number = 0.1,
  ): Array<{ index: number; score: number; isAnomaly: boolean }> {
    const results: Array<{ index: number; score: number; isAnomaly: boolean }> = [];
    const numTrees = 10;
    const subSampleSize = Math.min(256, data.length);

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
   * 计算路径长度 (孤立森林辅助方法)
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
   * 计算平均路径长度 (孤立森林辅助方法)
   */
  private averagePathLength(n: number): number {
    if (n <= 1) return 0;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n;
  }

  /**
   * K-Means 聚类检测 (统计方法)
   */
  detectClusters(
    data: number[],
    k: number = 3,
  ): Array<{ index: number; cluster: number; distance: number }> {
    const centroids = this.initializeCentroids(data, k);
    const assignments = new Array(data.length).fill(0);

    for (let iteration = 0; iteration < 10; iteration++) {
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

      for (let i = 0; i < k; i++) {
        const clusterPoints = data.filter((_, index) => assignments[index] === i);
        if (clusterPoints.length > 0) {
          centroids[i] = clusterPoints.reduce((a, b) => a + b, 0) / clusterPoints.length;
        }
      }
    }

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
   * 初始化质心 (K-Means 辅助方法)
   */
  private initializeCentroids(data: number[], k: number): number[] {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const step = (max - min) / (k + 1);
    return Array.from({ length: k }, (_, i) => min + step * (i + 1));
  }
}
