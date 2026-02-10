/**
 * Price Aggregation Utilities
 *
 * 价格聚合工具函数 - P2 优化：添加 Z-Score 异常检测
 */

import { calculateMean, calculateMedian, calculateStdDev } from '@/lib/utils/math';

import { AGGREGATION_CONFIG } from './config';

/**
 * 检测异常值（使用 IQR 方法）
 *
 * IQR (Interquartile Range) = Q3 - Q1
 * 异常值定义：值 < Q1 - threshold * IQR 或 值 > Q3 + threshold * IQR
 *
 * @param values - 数值数组
 * @param threshold - IQR 倍数阈值，默认 1.5
 * @returns 异常值的索引数组
 */
export function detectOutliersIQR(values: number[], threshold: number = 1.5): number[] {
  if (values.length < 4) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  if (q1 === undefined || q3 === undefined) return [];
  const iqr = q3 - q1;

  const lowerBound = q1 - threshold * iqr;
  const upperBound = q3 + threshold * iqr;

  return values
    .map((value, index) => ({ value, index }))
    .filter(({ value }) => value < lowerBound || value > upperBound)
    .map(({ index }) => index);
}

/**
 * 检测异常值（使用阈值法）
 *
 * 阈值法：偏差百分比超过阈值即视为异常
 *
 * @param values - 数值数组
 * @param referenceValue - 参考值（通常是中位数或平均值）
 * @param threshold - 偏差阈值（小数形式，如 0.01 表示 1%）
 * @returns 异常值的索引数组
 */
export function detectOutliersThreshold(
  values: number[],
  referenceValue: number,
  threshold: number,
): number[] {
  if (values.length === 0 || referenceValue === 0) return [];

  return values
    .map((value, index) => ({ value, index }))
    .filter(({ value }) => {
      const deviation = Math.abs(value - referenceValue);
      const deviationPercent = deviation / referenceValue;
      return deviationPercent > threshold;
    })
    .map(({ index }) => index);
}

/**
 * 统一的异常检测方法
 *
 * 结合阈值法和 IQR 方法，根据配置决定使用哪种方法
 *
 * @param values - 数值数组
 * @param referenceValue - 参考值（用于阈值法）
 * @param config - 异常检测配置
 * @returns 异常值的索引数组
 */
export function detectOutliers(
  values: number[],
  referenceValue: number,
  config: {
    method: 'threshold' | 'iqr' | 'both';
    threshold: number;
    iqrMultiplier: number;
    minDataPoints: number;
  } = {
    method: 'both',
    threshold: 0.01,
    iqrMultiplier: 1.5,
    minDataPoints: 4,
  },
): number[] {
  const outlierIndices = new Set<number>();

  // 1. 阈值法检测
  if (['threshold', 'both'].includes(config.method)) {
    const thresholdOutliers = detectOutliersThreshold(values, referenceValue, config.threshold);
    thresholdOutliers.forEach((idx) => outlierIndices.add(idx));
  }

  // 2. IQR 方法检测
  if (['iqr', 'both'].includes(config.method)) {
    if (values.length >= config.minDataPoints) {
      const iqrOutliers = detectOutliersIQR(values, config.iqrMultiplier);
      iqrOutliers.forEach((idx) => outlierIndices.add(idx));
    }
  }

  return Array.from(outlierIndices).sort((a, b) => a - b);
}

/**
 * 计算加权平均（基于协议权重）
 *
 * @param prices - 价格对象数组
 * @returns 加权平均价格
 */
export function calculateProtocolWeightedAverage(
  prices: Array<{ protocol: string; price: number }>,
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const price of prices) {
    const weight =
      AGGREGATION_CONFIG.protocolWeights[
        price.protocol as keyof typeof AGGREGATION_CONFIG.protocolWeights
      ] || 0.1;
    totalWeight += weight;
    weightedSum += price.price * weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * 计算推荐价格
 *
 * @param prices - 价格数组
 * @param outliers - 异常值数组
 * @returns 推荐价格
 */
export function calculateRecommendedPrice(prices: number[], outliers: number[]): number {
  // 过滤掉异常值
  const validPrices = prices.filter((_, i) => !outliers.includes(i));

  if (validPrices.length === 0) {
    // 如果所有价格都是异常值，使用中位数
    return calculateMedian(prices);
  }

  switch (AGGREGATION_CONFIG.aggregationMethod) {
    case 'mean':
      return calculateMean(validPrices);

    case 'median':
    default:
      return calculateMedian(validPrices);
  }
}

/**
 * 确定推荐价格来源描述
 *
 * @param validCount - 有效数据源数量
 * @returns 来源描述字符串
 */
export function determineRecommendationSource(validCount: number): string {
  if (validCount === 0) return 'median_all';
  if (validCount === 1) return 'single_source';

  switch (AGGREGATION_CONFIG.aggregationMethod) {
    case 'mean':
      return `mean_of_${validCount}_sources`;
    case 'weighted':
      return `weighted_${validCount}_sources`;
    case 'median':
    default:
      return `median_of_${validCount}_sources`;
  }
}

/**
 * 检测异常值（使用 Z-Score 方法）- P2 优化
 *
 * Z-Score = (x - μ) / σ
 * 异常值定义：|Z-Score| > threshold
 *
 * @param values - 数值数组
 * @param threshold - Z-Score 阈值，默认 3（表示 99.7% 的数据在正常范围内）
 * @returns 异常值的索引数组
 */
export function detectOutliersZScore(values: number[], threshold: number = 3): number[] {
  if (values.length < 3) return [];

  const mean = calculateMean(values);
  const std = calculateStdDev(values, mean);

  if (std === 0) return []; // 所有值相同，无异常

  return values
    .map((value, index) => ({ value, index, zscore: Math.abs((value - mean) / std) }))
    .filter(({ zscore }) => zscore > threshold)
    .map(({ index }) => index);
}
