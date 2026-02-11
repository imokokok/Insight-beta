/**
 * Math Utilities
 *
 * 数学工具函数
 */

/**
 * 计算中位数
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    const median = sorted[mid];
    return median === undefined ? 0 : median;
  }
  const left = sorted[mid - 1];
  const right = sorted[mid];
  if (left === undefined || right === undefined) return 0;
  return (left + right) / 2;
}

/**
 * 计算平均值
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * 计算标准差
 */
export function calculateStdDev(values: number[]): number;
export function calculateStdDev(values: number[], mean: number): number;
export function calculateStdDev(values: number[], mean?: number): number {
  if (values.length === 0) return 0;
  const calculatedMean = mean ?? calculateMean(values);
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - calculatedMean, 2), 0) / values.length;
  return Math.sqrt(variance);
}


