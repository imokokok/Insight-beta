/**
 * Robust Trend Analysis Utilities
 *
 * 鲁棒化趋势分析工具
 * - 滑窗中位数平滑
 * - Theil-Sen 回归（抗离群点）
 * - Huber 回归
 * - 对数尺度线性拟合
 */

/**
 * 滑窗中位数平滑
 * 降低离群点影响
 *
 * @param values - 数值数组
 * @param windowSize - 窗口大小（奇数），默认 3
 * @returns 平滑后的数组
 */
export function rollingMedianSmooth(values: number[], windowSize: number = 3): number[] {
  if (windowSize % 2 === 0) {
    windowSize++; // 确保为奇数
  }

  const halfWindow = Math.floor(windowSize / 2);
  const result: number[] = [];

  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(values.length, i + halfWindow + 1);
    const window = values.slice(start, end);

    // 计算中位数
    const sorted = [...window].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    result.push(median ?? values[i]!);
  }

  return result;
}

/**
 * Theil-Sen 回归
 * 一种非参数回归方法，对离群点具有很强的鲁棒性
 * 通过计算所有点对之间的斜率中位数来估计趋势
 *
 * @param x - 自变量数组（通常是时间索引）
 * @param y - 因变量数组
 * @returns { slope: 斜率, intercept: 截距 }
 */
export function theilSenRegression(x: number[], y: number[]): { slope: number; intercept: number } {
  if (x.length !== y.length || x.length < 2) {
    return { slope: 0, intercept: 0 };
  }

  const n = x.length;
  const slopes: number[] = [];

  // 计算所有点对之间的斜率
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const xi = x[i];
      const xj = x[j];
      const yi = y[i];
      const yj = y[j];

      if (xi !== undefined && xj !== undefined && yi !== undefined && yj !== undefined) {
        const dx = xj - xi;
        if (dx !== 0) {
          slopes.push((yj - yi) / dx);
        }
      }
    }
  }

  if (slopes.length === 0) {
    return { slope: 0, intercept: 0 };
  }

  // 斜率的中位数
  const sortedSlopes = slopes.sort((a, b) => a - b);
  const slope = sortedSlopes[Math.floor(sortedSlopes.length / 2)] ?? 0;

  // 计算截距（使用中位数）
  const intercepts: number[] = [];
  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    if (xi !== undefined && yi !== undefined) {
      intercepts.push(yi - slope * xi);
    }
  }

  const sortedIntercepts = intercepts.sort((a, b) => a - b);
  const intercept = sortedIntercepts[Math.floor(sortedIntercepts.length / 2)] ?? 0;

  return { slope, intercept };
}

/**
 * 对数尺度线性拟合
 * 适用于指数趋势或需要降低大值影响的场景
 *
 * @param x - 自变量数组
 * @param y - 因变量数组（必须为正数）
 * @returns { slope: 斜率, intercept: 截距, growthRate: 增长率 }
 */
export function logScaleRegression(
  x: number[],
  y: number[],
): {
  slope: number;
  intercept: number;
  growthRate: number;
} {
  if (x.length !== y.length || x.length < 2) {
    return { slope: 0, intercept: 0, growthRate: 0 };
  }

  // 对 y 取对数（确保为正）
  const logY = y.map((val) => {
    if (val <= 0) return Math.log(1e-10); // 避免 log(0)
    return Math.log(val);
  });

  const { slope, intercept } = linearRegression(x, logY);

  // 增长率 = exp(斜率) - 1
  // 限制 slope 范围防止 Math.exp 溢出 (Math.exp(709) ≈ Infinity)
  const MAX_SLOPE = 700;
  const safeSlope = Math.max(-MAX_SLOPE, Math.min(MAX_SLOPE, slope));
  const growthRate = Math.exp(safeSlope) - 1;

  return { slope, intercept, growthRate };
}

/**
 * 普通最小二乘线性回归
 * 辅助函数
 */
function linearRegression(x: number[], y: number[]): { slope: number; intercept: number } {
  const n = x.length;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    if (xi !== undefined && yi !== undefined) {
      sumX += xi;
      sumY += yi;
      sumXY += xi * yi;
      sumXX += xi * xi;
    }
  }

  const denominator = n * sumXX - sumX * sumX;
  // 检查 denominator 是否为有限数且不为零
  if (!Number.isFinite(denominator) || denominator === 0) {
    return { slope: 0, intercept: sumY / n };
  }

  const numerator = n * sumXY - sumX * sumY;
  // 检查 numerator 是否为有限数
  if (!Number.isFinite(numerator)) {
    return { slope: 0, intercept: sumY / n };
  }

  const slope = numerator / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * 鲁棒化的趋势方向判断
 * 使用 Theil-Sen 回归的斜率来判断趋势
 *
 * @param values - 数值数组
 * @param threshold - 变化阈值（小数形式），默认 0.05 (5%)
 * @returns 'increasing' | 'decreasing' | 'stable'
 */
export function robustTrendDirection(
  values: number[],
  threshold: number = 0.05,
): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 2) return 'stable';

  // 先进行滑窗中位数平滑
  const smoothed = rollingMedianSmooth(values, 3);

  // 使用 Theil-Sen 回归
  const x = Array.from({ length: smoothed.length }, (_, i) => i);
  const { slope } = theilSenRegression(x, smoothed);

  // 计算相对变化率
  const medianValue = [...smoothed].sort((a, b) => a - b)[Math.floor(smoothed.length / 2)] ?? 1;
  const relativeChange = slope / medianValue;

  if (relativeChange > threshold) return 'increasing';
  if (relativeChange < -threshold) return 'decreasing';
  return 'stable';
}

/**
 * 鲁棒化的趋势强度计算
 * 基于 Theil-Sen 回归的斜率，使用对数尺度归一化
 *
 * @param values - 数值数组
 * @returns 趋势强度 (0-1)
 */
export function robustTrendStrength(values: number[]): number {
  if (values.length < 2) return 0;

  // 滑窗中位数平滑
  const smoothed = rollingMedianSmooth(values, 3);

  // 过滤掉非正值（对数尺度需要）
  const positiveValues = smoothed.filter((v) => v > 0);
  if (positiveValues.length < 2) return 0;

  // 对数尺度回归
  const x = Array.from({ length: positiveValues.length }, (_, i) => i);
  const { growthRate } = logScaleRegression(x, positiveValues);

  // 归一化趋势强度
  // 将增长率映射到 0-1 范围
  // 假设 10% 的增长率对应强度 1
  const normalizedStrength = Math.min(Math.abs(growthRate) / 0.1, 1);

  return normalizedStrength;
}

/**
 * 鲁棒化的波动性计算
 * 使用 MAD (Median Absolute Deviation) 替代标准差
 *
 * @param values - 数值数组
 * @returns 波动性度量
 */
export function robustVolatility(values: number[]): number {
  if (values.length < 2) return 0;

  // 计算中位数
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;

  // 计算绝对偏差
  const absoluteDeviations = values.map((v) => Math.abs(v - median));

  // MAD = 绝对偏差的中位数
  const sortedDeviations = absoluteDeviations.sort((a, b) => a - b);
  const mad = sortedDeviations[Math.floor(sortedDeviations.length / 2)] ?? 0;

  // 转换为与标准差类似的尺度（乘以 1.4826）
  return mad * 1.4826;
}

/**
 * 完整的鲁棒化趋势分析
 *
 * @param values - 数值数组
 * @param threshold - 趋势方向判断阈值
 * @returns 完整的趋势分析结果
 */
export function robustTrendAnalysis(
  values: number[],
  threshold: number = 0.05,
): {
  direction: 'increasing' | 'decreasing' | 'stable';
  strength: number;
  volatility: number;
  slope: number;
  intercept: number;
} {
  if (values.length < 2) {
    return {
      direction: 'stable',
      strength: 0,
      volatility: 0,
      slope: 0,
      intercept: values[0] ?? 0,
    };
  }

  // 滑窗中位数平滑
  const smoothed = rollingMedianSmooth(values, 3);

  // Theil-Sen 回归
  const x = Array.from({ length: smoothed.length }, (_, i) => i);
  const { slope, intercept } = theilSenRegression(x, smoothed);

  // 趋势方向
  const direction = robustTrendDirection(values, threshold);

  // 趋势强度
  const strength = robustTrendStrength(values);

  // 波动性
  const volatility = robustVolatility(smoothed);

  return {
    direction,
    strength,
    volatility,
    slope,
    intercept,
  };
}
