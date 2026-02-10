/**
 * Common Types - 公共类型定义
 *
 * 提取重复使用的类型别名，减少代码重复
 */

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
