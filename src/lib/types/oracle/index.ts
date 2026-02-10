/**
 * Oracle Types - 统一预言机监控平台类型定义
 *
 * 模块化类型定义，按功能域拆分
 * 原 oracleTypes.ts 和 unifiedOracleTypes.ts 的整合版本
 */

// ============================================================================
// 协议类型
// ============================================================================

export type { OracleProtocol, OracleFeature, OracleProtocolInfo } from './protocol';
export {
  ORACLE_PROTOCOLS,
  PROTOCOL_DISPLAY_NAMES,
  PROTOCOL_DESCRIPTIONS,
  PROTOCOL_INFO,
  PRICE_FEED_PROTOCOLS,
  OPTIMISTIC_PROTOCOLS,
  getProtocolsByCategory,
} from './protocol';

// ============================================================================
// 链类型
// ============================================================================

export type { SupportedChain, ChainInfo, OracleChain, UMAChain } from './chain';
export { CHAIN_DISPLAY_NAMES, CHAIN_IDS } from './chain';

// ============================================================================
// 配置类型
// ============================================================================

export type {
  OracleConfig,
  OracleConfigPatch,
  OracleConfigField,
  ProtocolSpecificConfig,
  UMAProtocolConfig,
  ChainlinkProtocolConfig,
  PythProtocolConfig,
  BandProtocolConfig,
  API3ProtocolConfig,
  RedStoneProtocolConfig,
  FluxProtocolConfig,
  DIAProtocolConfig,
  OracleInstance,
  ConfigTemplate,
  BatchConfigUpdate,
  BatchUpdateResult,
} from './config';

// ============================================================================
// 价格数据类型
// ============================================================================

export type {
  PriceFeed,
  PriceUpdate,
  CrossProtocolComparison,
  ProtocolPerformanceRanking,
} from './price';

// ============================================================================
// 比较分析类型
// ============================================================================

export type {
  PriceDeviationLevel,
  PriceDeviationCell,
  PriceHeatmapRow,
  PriceHeatmapData,
  LatencyMetric,
  LatencyAnalysis,
  LatencyTrendPoint,
  LatencyTrend,
  CostType,
  ProtocolCost,
  CostEfficiencyMetric,
  CostComparison,
  CostRecommendation,
  RealtimeComparisonItem,
  RealtimeProtocolData,
  ComparisonFilter,
  ComparisonSort,
  ComparisonConfig,
  ComparisonView,
  ComparisonApiResponse,
  HeatmapApiResponse,
  LatencyApiResponse,
  CostApiResponse,
  RealtimeApiResponse,
} from './comparison';

// ============================================================================
// 断言和争议类型
// ============================================================================

export type {
  AssertionStatus,
  Assertion,
  DisputeStatus,
  Dispute,
  LeaderboardEntry,
  LeaderboardStats,
  UserStats,
  RiskSeverity,
  RiskItem,
} from './assertion';

// ============================================================================
// 告警类型
// ============================================================================

export type {
  AlertSeverity,
  AlertStatus,
  AlertEvent,
  AlertRule,
  Alert,
  IncidentStatus,
  Incident,
} from './alert';

// ============================================================================
// 统计和指标类型
// ============================================================================

export type {
  OracleStats,
  SyncState,
  OpsMetricsSeriesPoint,
  OpsMetrics,
  OpsSloStatus,
  CacheStats,
} from './stats';

// ============================================================================
// Webhook 类型
// ============================================================================

export type { WebhookEvent, WebhookConfig, WebhookPayload } from './webhook';

// ============================================================================
// API 响应类型
// ============================================================================

export type { ApiOk, ApiError, PaginatedResponse, ListResult } from './api';

// ============================================================================
// 数据库类型
// ============================================================================

export type { DbAssertionRow, DbDisputeRow, AuditLogEntry } from './database';

// ============================================================================
// UMA 特定类型
// ============================================================================

export type {
  UMAAssertionStatus,
  UMAAssertion,
  UMADisputeStatus,
  UMADispute,
  UMAVote,
  UMAConfig,
  UMAStats,
} from './uma';

// ============================================================================
// 向后兼容的旧类型
// ============================================================================

export type { OracleStatus, OracleStatusSnapshot } from './legacy';

// ============================================================================
// 公共类型（新增）
// ============================================================================

export type {
  PaginationParams,
  PaginationMeta,
  TimeRangeParams,
  SortParams,
  FilterParams,
  ErrorCode,
  AppError,
  Nullable,
  Optional,
  AsyncResult,
  ApiResponse,
} from './common';
