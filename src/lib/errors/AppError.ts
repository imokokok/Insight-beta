/**
 * Application Error - 统一应用错误处理
 *
 * 提供结构化的错误类型，支持错误分类、HTTP 状态码、错误代码等
 */

// ============================================================================
// 错误类型枚举
// ============================================================================

export type ErrorCategory =
  | 'VALIDATION' // 输入验证错误
  | 'AUTHENTICATION' // 认证错误
  | 'AUTHORIZATION' // 授权错误
  | 'NOT_FOUND' // 资源未找到
  | 'CONFLICT' // 资源冲突
  | 'RATE_LIMIT' // 限流
  | 'INTERNAL' // 内部错误
  | 'EXTERNAL' // 外部服务错误
  | 'TIMEOUT' // 超时
  | 'UNAVAILABLE'; // 服务不可用

// ============================================================================
// 基础应用错误类
// ============================================================================

export class AppError extends Error {
  readonly category: ErrorCategory;
  readonly statusCode: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;
  readonly cause?: Error;
  readonly timestamp: string;
  readonly requestId?: string;

  constructor(
    message: string,
    options: {
      category?: ErrorCategory;
      statusCode?: number;
      code?: string;
      details?: Record<string, unknown>;
      cause?: Error;
      requestId?: string;
    } = {},
  ) {
    super(message);
    this.name = 'AppError';
    this.category = options.category ?? 'INTERNAL';
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? 'INTERNAL_ERROR';
    this.details = options.details;
    this.cause = options.cause;
    this.timestamp = new Date().toISOString();
    this.requestId = options.requestId;

    // 保持堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      statusCode: this.statusCode,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      requestId: this.requestId,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
    };
  }
}

// ============================================================================
// 具体错误类型
// ============================================================================

export class ValidationError extends AppError {
  constructor(
    message: string,
    options: Omit<ConstructorParameters<typeof AppError>[1], 'category' | 'statusCode'> = {},
  ) {
    super(message, {
      category: 'VALIDATION',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      ...options,
    });
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(
    message: string = 'Authentication required',
    options: Omit<ConstructorParameters<typeof AppError>[1], 'category' | 'statusCode'> = {},
  ) {
    super(message, {
      category: 'AUTHENTICATION',
      statusCode: 401,
      code: 'AUTHENTICATION_ERROR',
      ...options,
    });
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(
    message: string = 'Access denied',
    options: Omit<ConstructorParameters<typeof AppError>[1], 'category' | 'statusCode'> = {},
  ) {
    super(message, {
      category: 'AUTHORIZATION',
      statusCode: 403,
      code: 'AUTHORIZATION_ERROR',
      ...options,
    });
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(
    resource: string,
    identifier?: string,
    options: Omit<ConstructorParameters<typeof AppError>[1], 'category' | 'statusCode'> = {},
  ) {
    const message = identifier ? `${resource} not found: ${identifier}` : `${resource} not found`;
    super(message, {
      category: 'NOT_FOUND',
      statusCode: 404,
      code: 'NOT_FOUND',
      details: { resource, identifier },
      ...options,
    });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(
    message: string,
    options: Omit<ConstructorParameters<typeof AppError>[1], 'category' | 'statusCode'> = {},
  ) {
    super(message, {
      category: 'CONFLICT',
      statusCode: 409,
      code: 'CONFLICT',
      ...options,
    });
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(
    retryAfter?: number,
    options: Omit<ConstructorParameters<typeof AppError>[1], 'category' | 'statusCode'> = {},
  ) {
    super('Rate limit exceeded', {
      category: 'RATE_LIMIT',
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      details: { retryAfter },
      ...options,
    });
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string,
    options: Omit<ConstructorParameters<typeof AppError>[1], 'category' | 'statusCode'> = {},
  ) {
    super(`${service} error: ${message}`, {
      category: 'EXTERNAL',
      statusCode: 502,
      code: 'EXTERNAL_SERVICE_ERROR',
      details: { service },
      ...options,
    });
    this.name = 'ExternalServiceError';
  }
}

export class TimeoutError extends AppError {
  constructor(
    operation: string,
    timeoutMs: number,
    options: Omit<ConstructorParameters<typeof AppError>[1], 'category' | 'statusCode'> = {},
  ) {
    super(`${operation} timed out after ${timeoutMs}ms`, {
      category: 'TIMEOUT',
      statusCode: 504,
      code: 'TIMEOUT',
      details: { operation, timeoutMs },
      ...options,
    });
    this.name = 'TimeoutError';
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(
    service: string,
    options: Omit<ConstructorParameters<typeof AppError>[1], 'category' | 'statusCode'> = {},
  ) {
    super(`${service} is unavailable`, {
      category: 'UNAVAILABLE',
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      details: { service },
      ...options,
    });
    this.name = 'ServiceUnavailableError';
  }
}

// ============================================================================
// 数据库错误
// ============================================================================

export class DatabaseError extends AppError {
  constructor(
    message: string,
    options: Omit<ConstructorParameters<typeof AppError>[1], 'category' | 'statusCode'> = {},
  ) {
    super(message, {
      category: 'INTERNAL',
      statusCode: 500,
      code: 'DATABASE_ERROR',
      ...options,
    });
    this.name = 'DatabaseError';
  }
}

// ============================================================================
// 预言机特定错误
// ============================================================================

export class OracleError extends AppError {
  readonly protocol?: string;
  readonly chain?: string;

  constructor(
    message: string,
    options: Omit<ConstructorParameters<typeof AppError>[1], 'category' | 'statusCode'> & {
      protocol?: string;
      chain?: string;
    } = {},
  ) {
    super(message, {
      category: 'EXTERNAL',
      statusCode: 502,
      code: 'ORACLE_ERROR',
      ...options,
    });
    this.name = 'OracleError';
    this.protocol = options.protocol;
    this.chain = options.chain;
  }
}

// ============================================================================
// 错误处理工具函数
// ============================================================================

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, { cause: error });
  }

  return new AppError(String(error));
}

export function getHttpStatusCode(error: unknown): number {
  if (isAppError(error)) {
    return error.statusCode;
  }
  return 500;
}

export function createErrorResponse(
  error: unknown,
  includeStack = false,
): {
  success: false;
  error: {
    message: string;
    code: string;
    category: string;
    details?: Record<string, unknown>;
    stack?: string;
  };
} {
  const appError = toAppError(error);

  return {
    success: false,
    error: {
      message: appError.message,
      code: appError.code,
      category: appError.category,
      details: appError.details,
      stack: includeStack ? appError.stack : undefined,
    },
  };
}
