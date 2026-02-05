/**
 * Type Utilities - 类型工具库
 *
 * 提供常用的类型定义和类型工具
 */

// ============================================================================
// 基础类型工具
// ============================================================================

/** 可空类型 */
export type Nullable<T> = T | null | undefined;

/** 非空类型 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/** 深度可选类型 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** 深度只读类型 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// ============================================================================
// 分页类型
// ============================================================================

/** 分页参数 */
export interface PaginationParams {
  limit?: number;
  cursor?: number;
  offset?: number;
}

/** 分页结果 */
export interface PaginationResult<T> {
  items: T[];
  total: number;
  nextCursor: number | null;
  hasMore: boolean;
}

/** 游标分页结果 */
export interface CursorPaginationResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ============================================================================
// 列表查询类型
// ============================================================================

/** 列表查询过滤器基础接口 */
export interface BaseListFilters extends PaginationParams {
  q?: string | null;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** 排序选项 */
export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

// ============================================================================
// API 响应类型
// ============================================================================

/** API 成功响应 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: Omit<PaginationResult<unknown>, 'items'>;
  };
}

/** API 错误详情 */
export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

/** API 错误响应 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    recoveryActions?: Array<{
      action: string;
      label: string;
      delay?: number;
    }>;
  };
}

/** API 响应联合类型 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// 枚举类型工具
// ============================================================================

/** 创建枚举类型 */
export type EnumType<T extends readonly string[]> = T[number];

/** 枚举验证器 */
export interface EnumValidator<T extends readonly string[]> {
  values: T;
  isValid: (value: unknown) => value is T[number];
}

/**
 * 创建枚举验证器
 */
export function createEnumValidator<T extends readonly string[]>(values: T): EnumValidator<T> {
  return {
    values,
    isValid: (value: unknown): value is T[number] =>
      typeof value === 'string' && values.includes(value),
  };
}

// ============================================================================
// 状态类型
// ============================================================================

/** 状态类型（支持大小写） */
export type StatusType<T extends string> = T | Lowercase<T>;

/** 通用状态枚举 */
export type CommonStatus = 'active' | 'inactive' | 'pending' | 'archived';

/** 操作结果 */
export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// ============================================================================
// 函数类型
// ============================================================================

/** 异步函数类型 */
export type AsyncFunction<T = void, Args extends unknown[] = []> = (...args: Args) => Promise<T>;

/** 回调函数类型 */
export type Callback<T = void> = (value: T) => void;

/** 错误处理器类型 */
export type ErrorHandler = (error: Error) => void;

// ============================================================================
// 对象类型工具
// ============================================================================

/** 键值对类型 */
export type KeyValuePair<K extends string = string, V = unknown> = Record<K, V>;

/** 部分必填类型 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/** 部分可选类型 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** 选择特定字段为必填 */
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

// ============================================================================
// 时间类型
// ============================================================================

/** 时间范围 */
export interface TimeRange {
  startTime: Date | string;
  endTime: Date | string;
}

/** 时间粒度 */
export type TimeGranularity = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

// ============================================================================
// 数据库相关类型
// ============================================================================

/** 数据库实体基础接口 */
export interface BaseEntity {
  id: string | number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/** 软删除实体 */
export interface SoftDeletableEntity extends BaseEntity {
  deletedAt: Date | string | null;
  isDeleted: boolean;
}

/** 租户隔离实体 */
export interface TenantEntity extends BaseEntity {
  tenantId: string;
}

// ============================================================================
// 缓存相关类型
// ============================================================================

/** 缓存策略 */
export type CacheStrategy = 'memory' | 'redis' | 'tiered' | 'none';

/** 缓存配置 */
export interface CacheConfig {
  strategy?: CacheStrategy;
  ttlMs: number;
  tags?: string[];
  staleWhileRevalidate?: boolean;
}

// ============================================================================
// 日志相关类型
// ============================================================================

/** 日志级别 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/** 日志上下文 */
export interface LogContext {
  requestId?: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  [key: string]: unknown;
}

// ============================================================================
// 工具类型函数
// ============================================================================

/**
 * 创建类型安全的键值对
 */
export function createKeyValuePair<K extends string, V>(key: K, value: V): KeyValuePair<K, V> {
  return { [key]: value } as KeyValuePair<K, V>;
}

/**
 * 类型守卫：检查值是否为非空
 */
export function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

/**
 * 类型守卫：检查值是否为字符串
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * 类型守卫：检查值是否为数字
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * 类型守卫：检查值是否为数组
 */
export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * 类型守卫：检查值是否为对象
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
