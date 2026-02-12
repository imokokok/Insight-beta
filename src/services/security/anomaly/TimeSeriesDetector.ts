/**
 * Time Series Anomaly Detector
 * 时间序列异常检测器 (移动平均, 趋势分析)
 */

import type { DetectionConfig } from './types';

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
