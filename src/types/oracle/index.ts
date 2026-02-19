/**
 * Oracle Types - 统一预言机数据分析平台类型定义
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

// 导出 Dispute 相关类型
export type {
  DisputeStatus,
  Dispute,
  DisputerStats,
  DisputeTrend,
  DisputeReport,
} from '@/types/oracle/dispute';

// 导出 Reliability 相关类型
export type {
  ReliabilityScore,
  ReliabilityScoreRecord,
  InsertReliabilityScoreParams,
  ProtocolRanking,
  ReliabilityApiResponse,
  TrendDataPoint,
  TimePeriod,
} from '@/types/oracle/reliability';
