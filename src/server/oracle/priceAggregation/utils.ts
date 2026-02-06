/**
 * Price Aggregation Utilities
 *
 * 价格聚合工具函数
 */

import { calculateMean, calculateMedian } from '@/lib/utils/math';

import { AGGREGATION_CONFIG } from './config';

/**
 * 计算加权平均
 *
 * @param values - 数值数组
 * @param weights - 权重数组
 * @returns 加权平均值
 */
export function calculateWeightedAverage(values: number[], weights: number[]): number {
  if (values.length !== weights.length) {
    throw new Error('Values and weights must have the same length');
  }
  if (values.length === 0) return 0;

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = values.reduce((sum, value, i) => {
    const weight = weights[i];
    return weight === undefined ? sum : sum + value * weight;
  }, 0);
  return weightedSum / totalWeight;
}

/**
 * 检测异常值（使用 IQR 方法）
 *
 * @param values - 数值数组
 * @param threshold - IQR 倍数阈值，默认 1.5
 * @returns 异常值的索引数组
 */
export function detectOutliers(values: number[], threshold: number = 1.5): number[] {
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
