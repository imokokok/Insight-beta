/**
 * Price Aggregation Configuration
 *
 * 价格聚合配置 - P2 优化：添加 Z-Score 支持
 */

import type { OracleProtocol } from '@/types/unifiedOracleTypes';

/**
 * 聚合配置
 */
export const AGGREGATION_CONFIG = {
  // 价格偏差阈值（触发异常值检测）
  deviationThreshold: 0.01, // 1%

  // 严重偏差阈值
  severeDeviationThreshold: 0.05, // 5%

  // 数据新鲜度阈值（秒）
  stalenessThreshold: 300, // 5分钟

  // 最小数据源数量
  minDataSources: 2,

  // 聚合方法: 'median' | 'weighted' | 'mean'
  aggregationMethod: 'median' as 'median' | 'weighted' | 'mean',

  // 权重配置（用于加权平均）
  protocolWeights: {
    chainlink: 0.4,
    pyth: 0.35,
    redstone: 0.15,
    uma: 0.1,
  } as Record<OracleProtocol, number>,

  // 异常检测配置 - P2 优化：添加 zscore 方法
  outlierDetection: {
    // 主方法: 'threshold' | 'iqr' | 'zscore' | 'both'
    method: 'both' as 'threshold' | 'iqr' | 'zscore' | 'both',
    // 阈值法: 偏差百分比阈值 (0.01 = 1%)
    threshold: 0.01,
    // IQR 方法: IQR 倍数阈值
    iqrMultiplier: 1.5,
    // Z-Score 方法: 标准差倍数阈值 (3 表示 99.7% 数据正常)
    zscoreThreshold: 3,
    // 最小数据点数量（用于 IQR 和 Z-Score）
    minDataPoints: 4,
  },
};

/**
 * 聚合方法枚举
 */
export enum AggregationMethod {
  MEDIAN = 'median',
  WEIGHTED_AVERAGE = 'weighted',
  MEAN = 'mean',
}
