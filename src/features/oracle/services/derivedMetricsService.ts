/**
 * 衍生指标计算服务
 *
 * 提供波动率、Z-Score 等衍生指标计算
 */

/**
 * 计算波动率（年化）
 *
 * @param prices 价格序列（按时间正序排列）
 * @param windowSize 滚动窗口大小（用于计算收益率序列）
 * @param periodMinutes 数据周期（分钟），用于年化因子计算
 * @returns 年化波动率（百分比形式，如 2.5 表示 2.5%）
 */
export function calculateVolatility(
  prices: number[],
  windowSize: number = 5,
  periodMinutes: number = 5,
): number {
  if (prices.length < windowSize + 1) {
    return 0;
  }

  // 计算收益率序列
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prevPrice = prices[i - 1];
    const currPrice = prices[i];
    if (prevPrice != null && currPrice != null && prevPrice > 0) {
      returns.push((currPrice - prevPrice) / prevPrice);
    }
  }

  if (returns.length < windowSize) {
    return 0;
  }

  // 取最近 windowSize 个收益率
  const recentReturns = returns.slice(-windowSize);

  // 计算均值
  const mean = recentReturns.reduce((sum, ret) => sum + ret, 0) / recentReturns.length;

  // 计算标准差
  const variance =
    recentReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / recentReturns.length;
  const std = Math.sqrt(variance);

  // 年化（一年约 525,600 分钟）
  const periodsPerYear = 525600 / periodMinutes;
  const annualizedVolatility = std * Math.sqrt(periodsPerYear) * 100;

  return annualizedVolatility;
}

/**
 * 计算 Z-Score（标准分数）
 *
 * @param currentValue 当前值
 * @param values 历史值序列
 * @param windowSize 滚动窗口大小
 * @returns Z-Score 值
 */
export function calculateZScore(
  currentValue: number,
  values: number[],
  windowSize: number = 20,
): number {
  if (values.length < windowSize) {
    return 0;
  }

  // 取最近 windowSize 个值
  const recentValues = values.slice(-windowSize);

  // 计算均值
  const mean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;

  // 计算标准差
  const variance =
    recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentValues.length;
  const std = Math.sqrt(variance);

  if (std === 0) {
    return 0;
  }

  // 计算 Z-Score
  return (currentValue - mean) / std;
}

/**
 * 计算百分位排名
 *
 * @param currentValue 当前值
 * @param values 历史值序列
 * @returns 百分位排名（0-100）
 */
export function calculatePercentileRank(currentValue: number, values: number[]): number {
  if (values.length === 0) {
    return 50;
  }

  const sortedValues = [...values].sort((a, b) => a - b);
  const rank = sortedValues.findIndex((val) => val >= currentValue);

  if (rank === -1) {
    return 100;
  }

  return (rank / sortedValues.length) * 100;
}

/**
 * 计算滚动统计指标
 */
export interface RollingStats {
  mean: number;
  std: number;
  min: number;
  max: number;
  median: number;
}

/**
 * 计算滚动统计指标
 *
 * @param values 值序列
 * @param windowSize 滚动窗口大小
 * @returns 滚动统计指标
 */
export function calculateRollingStats(values: number[], windowSize: number = 20): RollingStats {
  if (values.length === 0) {
    return { mean: 0, std: 0, min: 0, max: 0, median: 0 };
  }

  const recentValues = values.slice(-windowSize);

  // 均值
  const mean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;

  // 标准差
  const variance =
    recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentValues.length;
  const std = Math.sqrt(variance);

  // 最小值/最大值
  const min = Math.min(...recentValues);
  const max = Math.max(...recentValues);

  // 中位数
  const sorted = [...recentValues].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 !== 0
      ? (sorted[mid] ?? 0)
      : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;

  return { mean, std, min, max, median };
}

/**
 * 衍生指标数据结构
 */
export interface DerivedMetrics {
  volatility5m: number; // 5 分钟波动率（年化%）
  volatility15m: number; // 15 分钟波动率（年化%）
  volatility1h: number; // 1 小时波动率（年化%）
  zScore: number; // Z-Score
  percentileRank: number; // 百分位排名（0-100）
}

/**
 * 计算完整的衍生指标
 *
 * @param prices 价格序列（按时间正序排列，最近的价格在最后）
 * @param currentPrice 当前价格
 * @returns 衍生指标数据
 */
export function calculateDerivedMetrics(prices: number[], currentPrice: number): DerivedMetrics {
  return {
    volatility5m: calculateVolatility(prices, 5, 5),
    volatility15m: calculateVolatility(prices, 15, 5),
    volatility1h: calculateVolatility(prices, 60, 5),
    zScore: calculateZScore(currentPrice, prices, 20),
    percentileRank: calculatePercentileRank(currentPrice, prices),
  };
}
