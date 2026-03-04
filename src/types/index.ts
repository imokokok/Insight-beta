/**
 * Types - 统一类型导出入口
 *
 * 这是所有类型的统一入口，按领域组织
 */

// 共享类型（基础类型）
export * from './shared';

// 统计类型（Stats 相关）
export * from './stats';

// 领域类型（核心领域模型）- 使用 unifiedOracleTypes
export * from './unifiedOracleTypes';

// Oracle 协议类型（排除已在 unifiedOracleTypes 中定义的）
export {
  PROTOCOL_DISPLAY_NAMES,
  PRICE_FEED_PROTOCOLS,
  OPTIMISTIC_PROTOCOLS,
  ORACLE_PROTOCOLS,
  PROTOCOL_INFO,
} from './oracle/protocol';

export type {
  ComparisonFilter,
  ComparisonConfig,
  ComparisonView,
  CostComparison,
  LatencyAnalysis,
  LatencyTrend,
  PriceHeatmapData,
  PriceDeviationCell,
  PriceDeviationLevel,
  RealtimeComparisonItem,
} from './oracle/comparison';

// Dispute 相关类型
export type {
  DisputeStatus,
  Dispute,
  DisputerStats,
  DisputeTrend,
  DisputeReport,
} from './oracle/dispute';
