/**
 * API Errors - API 错误处理
 *
 * 统一的 API 错误码和错误处理工具
 */

// ============================================================================
// 错误码枚举
// ============================================================================

export enum ApiErrorCode {
  // 客户端错误 (4xx)
  BAD_REQUEST = 'bad_request',
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  NOT_FOUND = 'not_found',
  METHOD_NOT_ALLOWED = 'method_not_allowed',
  CONFLICT = 'conflict',
  UNPROCESSABLE_ENTITY = 'unprocessable_entity',
  TOO_MANY_REQUESTS = 'too_many_requests',

  // 服务器错误 (5xx)
  INTERNAL_ERROR = 'internal_error',
  NOT_IMPLEMENTED = 'not_implemented',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  GATEWAY_TIMEOUT = 'gateway_timeout',

  // 业务错误
  VALIDATION_ERROR = 'validation_error',
  RESOURCE_NOT_FOUND = 'resource_not_found',
  RESOURCE_CONFLICT = 'resource_conflict',
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  INVALID_SIGNATURE = 'invalid_signature',
  EXPIRED = 'expired',
  RATE_LIMITED = 'rate_limited',

  // Oracle 特定错误
  ORACLE_NOT_FOUND = 'oracle_not_found',
  ORACLE_OFFLINE = 'oracle_offline',
  PRICE_STALE = 'price_stale',
  PRICE_DEVIATION = 'price_deviation',
  ASSERTION_FAILED = 'assertion_failed',
  DISPUTE_FAILED = 'dispute_failed',
}

// ============================================================================
// HTTP 状态码映射
// ============================================================================

export const ErrorCodeToHttpStatus: Record<ApiErrorCode, number> = {
  [ApiErrorCode.BAD_REQUEST]: 400,
  [ApiErrorCode.UNAUTHORIZED]: 401,
  [ApiErrorCode.FORBIDDEN]: 403,
  [ApiErrorCode.NOT_FOUND]: 404,
  [ApiErrorCode.METHOD_NOT_ALLOWED]: 405,
  [ApiErrorCode.CONFLICT]: 409,
  [ApiErrorCode.UNPROCESSABLE_ENTITY]: 422,
  [ApiErrorCode.TOO_MANY_REQUESTS]: 429,

  [ApiErrorCode.INTERNAL_ERROR]: 500,
  [ApiErrorCode.NOT_IMPLEMENTED]: 501,
  [ApiErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ApiErrorCode.GATEWAY_TIMEOUT]: 504,

  [ApiErrorCode.VALIDATION_ERROR]: 400,
  [ApiErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ApiErrorCode.RESOURCE_CONFLICT]: 409,
  [ApiErrorCode.INSUFFICIENT_FUNDS]: 400,
  [ApiErrorCode.INVALID_SIGNATURE]: 400,
  [ApiErrorCode.EXPIRED]: 410,
  [ApiErrorCode.RATE_LIMITED]: 429,

  [ApiErrorCode.ORACLE_NOT_FOUND]: 404,
  [ApiErrorCode.ORACLE_OFFLINE]: 503,
  [ApiErrorCode.PRICE_STALE]: 400,
  [ApiErrorCode.PRICE_DEVIATION]: 400,
  [ApiErrorCode.ASSERTION_FAILED]: 400,
  [ApiErrorCode.DISPUTE_FAILED]: 400,
};

// ============================================================================
// 错误消息映射
// ============================================================================

export const ErrorCodeToMessage: Record<ApiErrorCode, string> = {
  [ApiErrorCode.BAD_REQUEST]: '请求参数错误',
  [ApiErrorCode.UNAUTHORIZED]: '未授权，请先登录',
  [ApiErrorCode.FORBIDDEN]: '禁止访问',
  [ApiErrorCode.NOT_FOUND]: '资源不存在',
  [ApiErrorCode.METHOD_NOT_ALLOWED]: '请求方法不允许',
  [ApiErrorCode.CONFLICT]: '资源冲突',
  [ApiErrorCode.UNPROCESSABLE_ENTITY]: '请求格式正确但含有语义错误',
  [ApiErrorCode.TOO_MANY_REQUESTS]: '请求过于频繁',

  [ApiErrorCode.INTERNAL_ERROR]: '服务器内部错误',
  [ApiErrorCode.NOT_IMPLEMENTED]: '功能尚未实现',
  [ApiErrorCode.SERVICE_UNAVAILABLE]: '服务暂时不可用',
  [ApiErrorCode.GATEWAY_TIMEOUT]: '网关超时',

  [ApiErrorCode.VALIDATION_ERROR]: '数据验证失败',
  [ApiErrorCode.RESOURCE_NOT_FOUND]: '请求的资源不存在',
  [ApiErrorCode.RESOURCE_CONFLICT]: '资源已存在或发生冲突',
  [ApiErrorCode.INSUFFICIENT_FUNDS]: '余额不足',
  [ApiErrorCode.INVALID_SIGNATURE]: '签名无效',
  [ApiErrorCode.EXPIRED]: '资源已过期',
  [ApiErrorCode.RATE_LIMITED]: '请求速率超限',

  [ApiErrorCode.ORACLE_NOT_FOUND]: '预言机未找到',
  [ApiErrorCode.ORACLE_OFFLINE]: '预言机离线',
  [ApiErrorCode.PRICE_STALE]: '价格数据过期',
  [ApiErrorCode.PRICE_DEVIATION]: '价格偏差过大',
  [ApiErrorCode.ASSERTION_FAILED]: '断言失败',
  [ApiErrorCode.DISPUTE_FAILED]: '争议失败',
};

// ============================================================================
// API 错误类
// ============================================================================

export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: string;

  constructor(code: ApiErrorCode, message?: string, details?: Record<string, unknown>) {
    super(message || ErrorCodeToMessage[code]);
    this.code = code;
    this.statusCode = ErrorCodeToHttpStatus[code];
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.name = 'ApiError';

    // 保持堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        details: this.details,
        timestamp: this.timestamp,
      },
    };
  }
}

// ============================================================================
// 便捷工厂函数
// ============================================================================

export const apiErrors = {
  badRequest: (message?: string, details?: Record<string, unknown>) =>
    new ApiError(ApiErrorCode.BAD_REQUEST, message, details),

  unauthorized: (message?: string) => new ApiError(ApiErrorCode.UNAUTHORIZED, message),

  forbidden: (message?: string) => new ApiError(ApiErrorCode.FORBIDDEN, message),

  notFound: (resource?: string) =>
    new ApiError(ApiErrorCode.NOT_FOUND, resource ? `${resource} 不存在` : undefined),

  validation: (details?: Record<string, unknown>) =>
    new ApiError(ApiErrorCode.VALIDATION_ERROR, undefined, details),

  conflict: (message?: string) => new ApiError(ApiErrorCode.CONFLICT, message),

  rateLimited: (retryAfter?: number) =>
    new ApiError(ApiErrorCode.RATE_LIMITED, undefined, retryAfter ? { retryAfter } : undefined),

  internal: (message?: string) => new ApiError(ApiErrorCode.INTERNAL_ERROR, message),

  oracleNotFound: (oracleId?: string) =>
    new ApiError(ApiErrorCode.ORACLE_NOT_FOUND, oracleId ? `预言机 ${oracleId} 未找到` : undefined),

  priceStale: (symbol?: string) =>
    new ApiError(ApiErrorCode.PRICE_STALE, symbol ? `${symbol} 价格数据过期` : undefined),
};

// ============================================================================
// 错误响应类型
// ============================================================================

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    statusCode: number;
    details?: Record<string, unknown>;
    timestamp: string;
  };
}

import type { PaginationMeta } from '@/types/common/pagination';

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// 请求选项类型
// ============================================================================

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  cache?: boolean;
}
