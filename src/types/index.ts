/**
 * Types - 统一类型导出入口
 *
 * 这是所有类型的统一入口，按领域组织
 */

// 领域类型（核心领域模型）- 优先级最高
export * from './domain';

// Oracle 协议类型（排除已在 domain 中定义的）
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

// 通用类型
export type { PaginationParams } from './common/pagination';
export type { HealthStatus } from './common/status';


