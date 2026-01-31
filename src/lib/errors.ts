/**
 * 统一错误处理模块
 *
 * 提供应用级别的错误类型定义、错误创建工具和错误处理辅助函数
 */

import { logger } from './logger';

/**
 * 错误代码枚举
 * 用于标识不同类型的错误
 */
export enum ErrorCode {
  // 通用错误 (1xxx)
  UNKNOWN_ERROR = '1000',
  VALIDATION_ERROR = '1001',
  NOT_FOUND = '1002',
  UNAUTHORIZED = '1003',
  FORBIDDEN = '1004',
  TIMEOUT = '1005',
  CONFLICT = '1006',

  // 数据库错误 (2xxx)
  DB_CONNECTION_ERROR = '2000',
  DB_QUERY_ERROR = '2001',
  DB_CONSTRAINT_ERROR = '2002',

  // Oracle 相关错误 (3xxx)
  ORACLE_NOT_FOUND = '3000',
  ORACLE_SYNC_ERROR = '3001',
  ORACLE_INVALID_STATE = '3002',
  ORACLE_CONTRACT_ERROR = '3003',

  // 网络错误 (4xxx)
  NETWORK_ERROR = '4000',
  RPC_ERROR = '4001',
  API_ERROR = '4002',
  RATE_LIMIT_ERROR = '4003',

  // 配置错误 (5xxx)
  CONFIG_ERROR = '5000',
  ENV_MISSING = '5001',

  // 认证授权错误 (6xxx)
  AUTHENTICATION_ERROR = '6000',
  AUTHORIZATION_ERROR = '6001',
}

/**
 * 错误严重程度
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * 错误恢复动作
 */
export interface ErrorRecoveryAction {
  action: 'retry' | 'refresh' | 'contact_support' | 'check_config' | 'wait';
  label: string;
  delay?: number;
}

/**
 * Error recovery guide with translation keys
 * Labels should be translated at the component level using t('errors.actionKey')
 */
export const ErrorRecoveryGuide: Record<string, ErrorRecoveryAction[]> = {
  [ErrorCode.DB_CONNECTION_ERROR]: [
    { action: 'retry', label: 'Retry', delay: 3 },
    { action: 'contact_support', label: 'Contact Support' },
  ],
  [ErrorCode.DB_QUERY_ERROR]: [
    { action: 'retry', label: 'Retry', delay: 3 },
    { action: 'contact_support', label: 'Contact Support' },
  ],
  [ErrorCode.ORACLE_SYNC_ERROR]: [
    { action: 'retry', label: 'Retry', delay: 5 },
    { action: 'check_config', label: 'Check Config' },
  ],
  [ErrorCode.VALIDATION_ERROR]: [
    { action: 'refresh', label: 'Refresh Page' },
    { action: 'check_config', label: 'Check Input' },
  ],
  [ErrorCode.AUTHENTICATION_ERROR]: [{ action: 'refresh', label: 'Re-login' }],
  [ErrorCode.AUTHORIZATION_ERROR]: [{ action: 'contact_support', label: 'Request Access' }],
  [ErrorCode.NOT_FOUND]: [{ action: 'refresh', label: 'Back to Home' }],
  [ErrorCode.RATE_LIMIT_ERROR]: [
    { action: 'wait', label: 'Wait and Retry', delay: 60 },
    { action: 'contact_support', label: 'Upgrade Plan' },
  ],
  [ErrorCode.TIMEOUT]: [{ action: 'retry', label: 'Retry', delay: 3 }],
  [ErrorCode.NETWORK_ERROR]: [
    { action: 'retry', label: 'Retry', delay: 3 },
    { action: 'check_config', label: 'Check Network' },
  ],
  [ErrorCode.CONFIG_ERROR]: [
    { action: 'check_config', label: 'Check Config' },
    { action: 'contact_support', label: 'Contact Support' },
  ],
  [ErrorCode.UNKNOWN_ERROR]: [
    { action: 'retry', label: 'Retry', delay: 3 },
    { action: 'contact_support', label: 'Contact Support' },
  ],
};

/**
 * Error context
 */
export interface ErrorContext {
  userId?: string;
  requestId?: string;
  instanceId?: string;
  endpoint?: string;
  method?: string;
  params?: Record<string, unknown>;
  timestamp?: string;
  [key: string]: unknown;
}

/**
 * 应用错误基类
 * 所有自定义错误都应继承此类
 */
export class AppError extends Error {
  /** 错误代码 */
  readonly code: ErrorCode;
  /** HTTP 状态码 */
  readonly statusCode: number;
  /** 错误元数据 */
  readonly metadata: Record<string, unknown>;
  /** 是否已记录 */
  private logged = false;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    statusCode: number = 500,
    metadata: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.metadata = metadata;

    // 保持堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * 记录错误日志
   * 确保每个错误只被记录一次
   */
  log(): this {
    if (!this.logged) {
      logger.error(this.message, {
        code: this.code,
        statusCode: this.statusCode,
        stack: this.stack,
        ...this.metadata,
      });
      this.logged = true;
    }
    return this;
  }

  /**
   * 转换为 JSON 格式
   * 用于 API 响应
   */
  toJSON() {
    const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(isDev && {
          stack: this.stack,
          metadata: this.metadata,
        }),
      },
    };
  }
}

/**
 * 验证错误
 * 用于参数验证失败
 */
export class ValidationError extends AppError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, metadata);
  }
}

/**
 * 未找到错误
 * 用于资源不存在
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(`errors.resourceNotFound`, ErrorCode.NOT_FOUND, 404, { resource, id });
  }
}

/**
 * 数据库错误
 * 用于数据库操作失败
 */
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(
      message,
      ErrorCode.DB_QUERY_ERROR,
      500,
      originalError ? { originalError: originalError.message } : {},
    );
  }
}

/**
 * Oracle 错误
 * 用于 Oracle 相关操作失败，支持错误恢复功能
 */
export class OracleError extends AppError {
  public readonly severity: ErrorSeverity;
  public readonly retryable: boolean;
  public readonly context?: ErrorContext;
  public readonly originalError?: Error;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.ORACLE_SYNC_ERROR,
    severity: ErrorSeverity = 'medium',
    retryable: boolean = true,
    context?: ErrorContext,
    originalError?: Error,
  ) {
    super(message, code, 500, {
      ...context,
      severity,
      retryable,
      originalError: originalError?.message,
    });
    this.severity = severity;
    this.retryable = retryable;
    this.context = context;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }

  public getRecoveryActions(): ErrorRecoveryAction[] {
    return ErrorRecoveryGuide[this.code] ?? ErrorRecoveryGuide[ErrorCode.UNKNOWN_ERROR] ?? [];
  }

  public override toJSON(): {
    success: false;
    error: {
      name: string;
      message: string;
      code: ErrorCode;
      severity: ErrorSeverity;
      retryable: boolean;
      timestamp: string;
      context?: ErrorContext;
      stack?: string;
      originalError?: string;
    };
  } {
    return {
      success: false,
      error: {
        name: this.name,
        message: this.message,
        code: this.code,
        severity: this.severity,
        retryable: this.retryable,
        timestamp: this.timestamp,
        context: this.context,
        stack: this.stack,
        originalError: this.originalError?.message,
      },
    };
  }

  public static fromError(error: Error, context?: ErrorContext): OracleError {
    if (error instanceof OracleError) {
      return error;
    }

    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('etimedout')) {
      return new OracleError(
        'errors.requestTimeout',
        ErrorCode.TIMEOUT,
        'medium',
        true,
        context,
        error,
      );
    }

    if (
      message.includes('network') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    ) {
      return new OracleError(
        'errors.networkConnectionFailed',
        ErrorCode.NETWORK_ERROR,
        'high',
        true,
        context,
        error,
      );
    }

    if (message.includes('rate limit') || message.includes('too many requests')) {
      return new OracleError(
        'errors.rateLimitExceeded',
        ErrorCode.RATE_LIMIT_ERROR,
        'medium',
        true,
        context,
        error,
      );
    }

    if (message.includes('authentication') || message.includes('unauthorized')) {
      return new OracleError(
        'errors.authenticationFailed',
        ErrorCode.AUTHENTICATION_ERROR,
        'high',
        false,
        context,
        error,
      );
    }

    if (message.includes('permission') || message.includes('forbidden')) {
      return new OracleError(
        'errors.permissionDenied',
        ErrorCode.AUTHORIZATION_ERROR,
        'high',
        false,
        context,
        error,
      );
    }

    return new OracleError(
      error.message || 'errors.unknownError',
      ErrorCode.UNKNOWN_ERROR,
      'medium',
      true,
      context,
      error,
    );
  }

  public static databaseError(
    message: string,
    originalError?: Error,
    context?: ErrorContext,
  ): OracleError {
    return new OracleError(
      message,
      ErrorCode.DB_CONNECTION_ERROR,
      'critical',
      true,
      context,
      originalError,
    );
  }

  public static blockchainError(
    message: string,
    originalError?: Error,
    context?: ErrorContext,
  ): OracleError {
    return new OracleError(
      message,
      ErrorCode.ORACLE_CONTRACT_ERROR,
      'high',
      true,
      context,
      originalError,
    );
  }

  public static validationError(message: string, context?: ErrorContext): OracleError {
    return new OracleError(message, ErrorCode.VALIDATION_ERROR, 'low', false, context);
  }

  public static notFound(resource: string, context?: ErrorContext): OracleError {
    return new OracleError('errors.resourceNotFound', ErrorCode.NOT_FOUND, 'low', false, {
      ...context,
      resource,
    });
  }
}

/**
 * 网络错误
 * 用于 RPC/API 调用失败
 */
export class NetworkError extends AppError {
  constructor(message: string, endpoint?: string) {
    super(message, ErrorCode.NETWORK_ERROR, 503, endpoint ? { endpoint } : {});
  }
}

/**
 * 配置错误
 * 用于环境变量或配置缺失
 */
export class ConfigError extends AppError {
  constructor(key: string) {
    super(`配置项缺失: ${key}`, ErrorCode.ENV_MISSING, 500, { configKey: key });
  }
}

/**
 * 结果类型
 * 用于表示操作可能成功或失败，而不抛出异常
 */
export type Result<T, E = AppError> = { success: true; data: T } | { success: false; error: E };

/**
 * 创建成功结果
 */
export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * 创建失败结果
 */
export function err<E extends AppError>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Async operation wrapper
 * Converts Promise that may throw exceptions to Result type
 *
 * @example
 * ```typescript
 * const result = await tryCatchAsync(fetchUser(userId));
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
export async function tryCatchAsync<T>(
  promise: Promise<T>,
  errorMapper?: (error: unknown) => AppError,
): Promise<Result<T>> {
  try {
    const data = await promise;
    return ok(data);
  } catch (error) {
    const appError = errorMapper
      ? errorMapper(error)
      : error instanceof AppError
        ? error
        : new AppError(
            error instanceof Error ? error.message : 'Unknown error',
            ErrorCode.UNKNOWN_ERROR,
            500,
            { originalError: error },
          );
    return err(appError);
  }
}

/**
 * Sync operation wrapper
 * Converts synchronous operations that may throw exceptions to Result type
 */
export function tryCatch<T>(fn: () => T, errorMapper?: (error: unknown) => AppError): Result<T> {
  try {
    const data = fn();
    return ok(data);
  } catch (error) {
    const appError = errorMapper
      ? errorMapper(error)
      : error instanceof AppError
        ? error
        : new AppError(
            error instanceof Error ? error.message : 'Unknown error',
            ErrorCode.UNKNOWN_ERROR,
            500,
            { originalError: error },
          );
    return err(appError);
  }
}

/**
 * Assertion function
 * Throws ValidationError when condition is not met
 */
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new ValidationError(message);
  }
}

/**
 * Assert non-null
 * Throws ValidationError when value is null or undefined
 */
export function assertNonNull<T>(value: T | null | undefined, name: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new ValidationError(`${name} is required`);
  }
}

/**
 * Global error handler
 * Used to handle uncaught exceptions
 */
export function setupGlobalErrorHandlers(): void {
  // Handle unhandled Promise rejections
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise rejection', { reason });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', {
      error: error.message,
      stack: error.stack,
    });
    // Exit after giving time for logs to be written
    setTimeout(() => process.exit(1), 1000);
  });
}

/**
 * Error mapper
 * Converts database errors to application errors
 */
export function mapDatabaseError(error: unknown): DatabaseError {
  if (error instanceof DatabaseError) return error;

  const message = error instanceof Error ? error.message : 'Database operation failed';
  return new DatabaseError(message, error instanceof Error ? error : undefined);
}

/**
 * Error mapper
 * Converts network errors to application errors
 */
export function mapNetworkError(error: unknown, endpoint?: string): NetworkError {
  if (error instanceof NetworkError) return error;

  const message = error instanceof Error ? error.message : 'Network request failed';
  return new NetworkError(message, endpoint);
}
