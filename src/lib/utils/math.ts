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
 * 计算百分位数
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? sorted[0] ?? 0;
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
export function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = calculateMean(values);
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * 计算变异系数 (CV)
 */
export function calculateCV(values: number[]): number {
  const mean = calculateMean(values);
  if (mean === 0) return 0;
  return (calculateStdDev(values) / mean) * 100;
}

/**
 * 计算价格偏差百分比
 */
export function calculateDeviation(actual: number, expected: number): number {
  if (expected === 0) return 0;
  return ((actual - expected) / expected) * 100;
}

/**
 * 四舍五入到指定小数位
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * 格式化大数字
 */
export function formatCompactNumber(value: number): string {
  const formatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  });
  return formatter.format(value);
}
