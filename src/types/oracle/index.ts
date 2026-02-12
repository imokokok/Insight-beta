/**
 * Oracle Types - 统一预言机监控平台类型定义
 *
 * 注意：此模块正在逐步迁移到 unifiedOracleTypes.ts
 * 请优先使用 @/lib/types/unifiedOracleTypes
 */

// 重新导出 unifiedOracleTypes 中的所有类型
export * from '@/types/unifiedOracleTypes';

// 导出协议相关常量
export {
  PROTOCOL_DISPLAY_NAMES,
  PRICE_FEED_PROTOCOLS,
  OPTIMISTIC_PROTOCOLS,
  ORACLE_PROTOCOLS,
  PROTOCOL_INFO,
} from '@/types/oracle/protocol';

// 导出比较相关类型
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
} from '@/types/oracle/comparison';
