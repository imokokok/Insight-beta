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
 */
function rollingMedianSmooth(values: number[], windowSize: number = 3): number[] {
  if (windowSize % 2 === 0) {
    windowSize++;
  }

  const halfWindow = Math.floor(windowSize / 2);
  const result: number[] = [];

  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(values.length, i + halfWindow + 1);
    const window = values.slice(start, end);

    const sorted = [...window].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    result.push(median ?? values[i]!);
  }

  return result;
}

/**
 * Theil-Sen 回归
 * 一种非参数回归方法，对离群点具有很强的鲁棒性
 */
function theilSenRegression(x: number[], y: number[]): { slope: number; intercept: number } {
  if (x.length !== y.length || x.length < 2) {
    return { slope: 0, intercept: 0 };
  }

  const n = x.length;
  const slopes: number[] = [];

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

  const logY = y.map((val) => {
    if (val <= 0) return Math.log(1e-10);
    return Math.log(val);
  });

  const { slope, intercept } = linearRegression(x, logY);

  const MAX_SLOPE = 700;
  const safeSlope = Math.max(-MAX_SLOPE, Math.min(MAX_SLOPE, slope));
  const growthRate = Math.exp(safeSlope) - 1;

  return { slope, intercept, growthRate };
}

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
  if (!Number.isFinite(denominator) || denominator === 0) {
    return { slope: 0, intercept: sumY / n };
  }

  const numerator = n * sumXY - sumX * sumY;
  if (!Number.isFinite(numerator)) {
    return { slope: 0, intercept: sumY / n };
  }

  const slope = numerator / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

function robustTrendDirection(
  values: number[],
  threshold: number = 0.05,
): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 2) return 'stable';

  const smoothed = rollingMedianSmooth(values, 3);
  const x = Array.from({ length: smoothed.length }, (_, i) => i);
  const { slope } = theilSenRegression(x, smoothed);

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

  const normalizedStrength = Math.min(Math.abs(growthRate) / 0.1, 1);

  return normalizedStrength;
}

function robustVolatility(values: number[]): number {
  if (values.length < 2) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;

  const absoluteDeviations = values.map((v) => Math.abs(v - median));

  const sortedDeviations = absoluteDeviations.sort((a, b) => a - b);
  const mad = sortedDeviations[Math.floor(sortedDeviations.length / 2)] ?? 0;

  return mad * 1.4826;
}

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

  const smoothed = rollingMedianSmooth(values, 3);
  const x = Array.from({ length: smoothed.length }, (_, i) => i);
  const { slope, intercept } = theilSenRegression(x, smoothed);

  const direction = robustTrendDirection(values, threshold);
  const strength = robustTrendStrength(values);
  const volatility = robustVolatility(smoothed);

  return {
    direction,
    strength,
    volatility,
    slope,
    intercept,
  };
}
