/**
 * 协议健康评分工具函数
 * 基于多维度算法计算协议的综合健康评分
 */

/**
 * 计算平均值
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * 计算中位数
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid] ?? 0;
  } else {
    const val1 = sorted[mid - 1] ?? 0;
    const val2 = sorted[mid] ?? 0;
    return (val1 + val2) / 2;
  }
}

/**
 * 计算标准差
 */
export function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = calculateMean(values);
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

export interface DimensionScore {
  dimension: HealthDimension;
  score: number; // 0-100
  rawValue: number;
  weight: number;
  rating: string;
}

export interface HealthScoreResult {
  totalScore: number; // 0-100
  dimensions: DimensionScore[];
  rating: string;
  status: 'healthy' | 'warning' | 'critical';
}

export interface HealthTrendPoint {
  timestamp: string;
  score: number;
  dimensions: DimensionScore[];
}

export enum HealthDimension {
  LATENCY = 'latency',
  FRESHNESS = 'freshness',
  CONSISTENCY = 'consistency',
}

const WEIGHTS = {
  [HealthDimension.LATENCY]: 0.4,
  [HealthDimension.FRESHNESS]: 0.3,
  [HealthDimension.CONSISTENCY]: 0.3,
};

/**
 * 计算延迟得分
 * @param avgLatency 平均延迟（毫秒）
 * @returns 0-100 的得分
 */
function calculateLatencyScore(avgLatency: number): { score: number; rating: string } {
  if (avgLatency <= 100) return { score: 100, rating: 'Excellent' };
  if (avgLatency <= 200) return { score: 90 - (avgLatency - 100) * 0.1, rating: 'Good' };
  if (avgLatency <= 300) return { score: 80 - (avgLatency - 200) * 0.2, rating: 'Fair' };
  if (avgLatency <= 500) return { score: 60 - (avgLatency - 300) * 0.1, rating: 'Poor' };
  return { score: Math.max(40, 100 - avgLatency / 10), rating: 'Critical' };
}

/**
 * 计算更新频率得分
 * @param updateIntervalSeconds 更新间隔（秒）
 * @returns 0-100 的得分
 */
function calculateFreshnessScore(updateIntervalSeconds: number): { score: number; rating: string } {
  const minutes = updateIntervalSeconds / 60;
  if (minutes <= 1) return { score: 100, rating: 'Excellent' };
  if (minutes <= 5) return { score: 90 - (minutes - 1) * 2.5, rating: 'Good' };
  if (minutes <= 15) return { score: 80 - (minutes - 5) * 2, rating: 'Fair' };
  if (minutes <= 30) return { score: 60 - (minutes - 15) * 1.33, rating: 'Poor' };
  return { score: Math.max(40, 100 - minutes * 2), rating: 'Critical' };
}

/**
 * 计算数据一致性得分
 * @param activeFeeds 活跃的 feeds 数量
 * @param totalFeeds 总 feeds 数量
 * @returns 0-100 的得分
 */
function calculateConsistencyScore(
  activeFeeds: number,
  totalFeeds: number,
): { score: number; rating: string } {
  if (totalFeeds === 0) return { score: 0, rating: 'Critical' };
  const activeRate = activeFeeds / totalFeeds;
  if (activeRate >= 0.95) return { score: 100, rating: 'Excellent' };
  if (activeRate >= 0.9) return { score: 90 - (0.95 - activeRate) * 200, rating: 'Good' };
  if (activeRate >= 0.8) return { score: 80 - (0.9 - activeRate) * 200, rating: 'Fair' };
  if (activeRate >= 0.5) return { score: 60 - (0.8 - activeRate) * 66.67, rating: 'Poor' };
  return { score: Math.max(0, activeRate * 80), rating: 'Critical' };
}

/**
 * 计算综合健康评分
 * @param params 评分参数
 * @returns 健康评分结果
 */
export function calculateHealthScore(params: {
  avgLatency: number;
  updateIntervalSeconds: number;
  activeFeeds: number;
  totalFeeds: number;
}): HealthScoreResult {
  const latencyResult = calculateLatencyScore(params.avgLatency);
  const freshnessResult = calculateFreshnessScore(params.updateIntervalSeconds);
  const consistencyResult = calculateConsistencyScore(params.activeFeeds, params.totalFeeds);

  const dimensions: DimensionScore[] = [
    {
      dimension: HealthDimension.LATENCY,
      score: latencyResult.score,
      rawValue: params.avgLatency,
      weight: WEIGHTS[HealthDimension.LATENCY],
      rating: latencyResult.rating,
    },
    {
      dimension: HealthDimension.FRESHNESS,
      score: freshnessResult.score,
      rawValue: params.updateIntervalSeconds,
      weight: WEIGHTS[HealthDimension.FRESHNESS],
      rating: freshnessResult.rating,
    },
    {
      dimension: HealthDimension.CONSISTENCY,
      score: consistencyResult.score,
      rawValue: params.activeFeeds / (params.totalFeeds || 1),
      weight: WEIGHTS[HealthDimension.CONSISTENCY],
      rating: consistencyResult.rating,
    },
  ];

  const totalScore = dimensions.reduce((sum, dim) => sum + dim.score * dim.weight, 0);

  let rating: string;
  let status: 'healthy' | 'warning' | 'critical';

  if (totalScore >= 90) {
    rating = 'Excellent';
    status = 'healthy';
  } else if (totalScore >= 70) {
    rating = 'Good';
    status = 'healthy';
  } else if (totalScore >= 50) {
    rating = 'Fair';
    status = 'warning';
  } else if (totalScore >= 30) {
    rating = 'Poor';
    status = 'warning';
  } else {
    rating = 'Critical';
    status = 'critical';
  }

  return {
    totalScore,
    dimensions,
    rating,
    status,
  };
}

/**
 * 计算健康评分趋势
 * @param dataPoints 历史数据点数组
 * @returns 健康评分趋势数组
 */
export function calculateHealthScoreTrend(
  dataPoints: Array<{
    timestamp: string;
    avgLatency: number;
    updateIntervalSeconds: number;
    activeFeeds: number;
    totalFeeds: number;
  }>,
): HealthTrendPoint[] {
  return dataPoints.map((point) => {
    const result = calculateHealthScore({
      avgLatency: point.avgLatency,
      updateIntervalSeconds: point.updateIntervalSeconds,
      activeFeeds: point.activeFeeds,
      totalFeeds: point.totalFeeds,
    });
    return {
      timestamp: point.timestamp,
      score: result.totalScore,
      dimensions: result.dimensions,
    };
  });
}

/**
 * 获取健康状态对应的颜色
 */
export function getHealthStatusColor(status: 'healthy' | 'warning' | 'critical' | string): string {
  switch (status) {
    case 'healthy':
      return 'bg-success/20 text-success';
    case 'warning':
      return 'bg-warning/20 text-warning';
    case 'critical':
      return 'bg-error/20 text-error';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

/**
 * 获取维度标签（支持国际化）
 */
export function getDimensionLabel(dimension: HealthDimension, t: (key: string) => string): string {
  const labels: Record<HealthDimension, string> = {
    [HealthDimension.LATENCY]: t('overview.healthDimensions.latency') || '延迟性能',
    [HealthDimension.FRESHNESS]: t('overview.healthDimensions.freshness') || '更新频率',
    [HealthDimension.CONSISTENCY]: t('overview.healthDimensions.consistency') || '数据一致性',
  };
  return labels[dimension];
}

/**
 * 格式化维度原始值
 */
export function formatDimensionValue(dimension: HealthDimension, value: number): string {
  switch (dimension) {
    case HealthDimension.LATENCY:
      return `${value.toFixed(0)}ms`;
    case HealthDimension.FRESHNESS:
      return `${(value / 60).toFixed(1)}分钟`;
    case HealthDimension.CONSISTENCY:
      return `${(value * 100).toFixed(1)}%`;
    default:
      return value.toFixed(2);
  }
}

/**
 * 获取评分等级颜色
 */
export function getRatingColor(rating: string): string {
  if (rating === 'Excellent' || rating === 'Good') return 'text-success';
  if (rating === 'Fair') return 'text-warning';
  return 'text-error';
}
