/**
 * Base Domain Types - 基础领域类型
 */

// ============================================================================
// 通用标识类型
// ============================================================================

export type EntityId = string;
export type Timestamp = string;
export type ISODateTime = string;

// ============================================================================
// 通用状态类型
// ============================================================================

export type EntityStatus = 'active' | 'inactive' | 'pending' | 'archived';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export type SeverityLevel = 'info' | 'warning' | 'critical' | 'emergency';

// ============================================================================
// 分页类型
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
  };
}

// ============================================================================
// 通用响应类型
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export interface ResponseMeta {
  requestId: string;
  timestamp: ISODateTime;
  durationMs: number;
  pagination?: PaginatedResult<unknown>['pagination'];
}

// ============================================================================
// 时间范围类型
// ============================================================================

export interface TimeRange {
  start: ISODateTime;
  end: ISODateTime;
}

export type TimeGranularity = 'raw' | '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

// ============================================================================
// 排序和过滤
// ============================================================================

export type SortOrder = 'asc' | 'desc';

export interface SortParams<T = string> {
  field: T;
  order: SortOrder;
}

export interface FilterParams {
  [key: string]: unknown;
}
