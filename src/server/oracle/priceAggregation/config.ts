/**
 * Price Aggregation Configuration
 *
 * 价格聚合配置
 */

import type { OracleProtocol } from '@/lib/types/unifiedOracleTypes';

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
    chainlink: 0.25,
    pyth: 0.25,
    band: 0.15,
    api3: 0.15,
    redstone: 0.1,
    dia: 0.1,
  } as Record<OracleProtocol, number>,
};

/**
 * 聚合方法枚举
 */
export enum AggregationMethod {
  MEDIAN = 'median',
  WEIGHTED_AVERAGE = 'weighted',
  MEAN = 'mean',
}
