/**
 * Common Types - 公共类型定义
 *
 * 提取重复使用的类型别名，减少代码重复
 */

import type {
  UnifiedPriceFeed,
  UnifiedAssertion,
  UnifiedDispute,
  UnifiedAlert,
  UnifiedAlertRule,
  UnifiedSyncState,
  ConfigTemplate,
  CrossProtocolComparison,
  UnifiedOracleStats,
} from '../unifiedOracleTypes';

// ============================================================================
// 价格数据核心类型（去除协议相关字段）
// ============================================================================

/**
 * 价格数据核心字段 - 用于客户端返回
 * 去除了 id, instanceId, protocol 等内部字段
 */
export type PriceFeedCore = Omit<
  UnifiedPriceFeed,
  | 'id'
  | 'instanceId'
  | 'protocol'
  | 'baseAsset'
  | 'quoteAsset'
  | 'priceRaw'
  | 'decimals'
  | 'isStale'
>;

/**
 * 价格数据核心字段数组
 */
export type PriceFeedCoreArray = PriceFeedCore[];

// ============================================================================
// 断言和争议核心类型
// ============================================================================

/**
 * 断言核心字段
 */
export type AssertionCore = Omit<
  UnifiedAssertion,
  'id' | 'protocol' | 'chain' | 'createdAt' | 'updatedAt'
>;

/**
 * 争议核心字段
 */
export type DisputeCore = Omit<
  UnifiedDispute,
  'id' | 'protocol' | 'chain' | 'createdAt' | 'updatedAt'
>;

// ============================================================================
// 告警核心类型
// ============================================================================

/**
 * 告警核心字段
 */
export type AlertCore = Omit<
  UnifiedAlert,
  'id' | 'ruleId' | 'acknowledgedBy' | 'resolvedBy' | 'createdAt' | 'updatedAt'
>;

/**
 * 告警规则核心字段
 */
export type AlertRuleCore = Omit<UnifiedAlertRule, 'id'>;

// ============================================================================
// 同步和配置核心类型
// ============================================================================

/**
 * 同步状态核心字段
 */
export type SyncStateCore = Omit<UnifiedSyncState, 'lastSyncAt' | 'lastErrorAt'>;

/**
 * 配置模板核心字段
 */
export type ConfigTemplateCore = Omit<ConfigTemplate, 'id'>;

// ============================================================================
// 统计和比较核心类型
// ============================================================================

/**
 * 统计信息核心字段
 */
export type OracleStatsCore = Omit<UnifiedOracleStats, 'lastUpdated'>;

/**
 * 跨协议比较核心字段
 */
export type CrossProtocolComparisonCore = Omit<CrossProtocolComparison, 'timestamp'>;

// ============================================================================
// API 响应辅助类型
// ============================================================================

/**
 * 分页参数
 */
export type PaginationParams = {
  page?: number;
  limit?: number;
  cursor?: string;
};

/**
 * 分页元数据
 */
export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  cursor?: string;
  nextCursor?: string;
};

/**
 * 时间范围参数
 */
export type TimeRangeParams = {
  startTime?: number;
  endTime?: number;
  timeframe?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | '1M';
};

/**
 * 排序参数
 */
export type SortParams<T extends string = string> = {
  sortBy?: T;
  sortOrder?: 'asc' | 'desc';
};

/**
 * 过滤参数基础接口
 */
export type FilterParams = {
  search?: string;
  status?: string | string[];
  protocol?: string | string[];
  chain?: string | string[];
};

// ============================================================================
// 错误类型
// ============================================================================

/**
 * 应用错误代码
 */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMIT'
  | 'TIMEOUT_ERROR'
  | 'INTERNAL_ERROR'
  | 'BAD_REQUEST'
  | 'CONFLICT'
  | 'SERVICE_UNAVAILABLE';

/**
 * 应用错误结构
 */
export type AppError = {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
};

// ============================================================================
// 工具类型
// ============================================================================

/**
 * 可为 null 的类型
 */
export type Nullable<T> = T | null;

/**
 * 可为 undefined 的类型
 */
export type Optional<T> = T | undefined;

/**
 * 异步返回类型
 */
export type AsyncResult<T, E = AppError> = Promise<
  { success: true; data: T } | { success: false; error: E }
>;

/**
 * API 响应结构
 */
export type ApiResponse<T> =
  | { success: true; data: T; meta?: Record<string, unknown> }
  | { success: false; error: AppError };
