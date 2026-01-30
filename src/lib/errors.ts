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
 * 错误恢复指南
 */
export const ErrorRecoveryGuide: Record<string, ErrorRecoveryAction[]> = {
  [ErrorCode.DB_CONNECTION_ERROR]: [
    { action: 'retry', label: '重试', delay: 3 },
    { action: 'contact_support', label: '联系支持' },
  ],
  [ErrorCode.DB_QUERY_ERROR]: [
    { action: 'retry', label: '重试', delay: 3 },
    { action: 'contact_support', label: '联系支持' },
  ],
  [ErrorCode.ORACLE_SYNC_ERROR]: [
    { action: 'retry', label: '重试', delay: 5 },
    { action: 'check_config', label: '检查配置' },
  ],
  [ErrorCode.VALIDATION_ERROR]: [
    { action: 'refresh', label: '刷新页面' },
    { action: 'check_config', label: '检查输入' },
  ],
  [ErrorCode.AUTHENTICATION_ERROR]: [{ action: 'refresh', label: '重新登录' }],
  [ErrorCode.AUTHORIZATION_ERROR]: [{ action: 'contact_support', label: '申请权限' }],
  [ErrorCode.NOT_FOUND]: [{ action: 'refresh', label: '返回首页' }],
  [ErrorCode.RATE_LIMIT_ERROR]: [
    { action: 'wait', label: '等待后重试', delay: 60 },
    { action: 'contact_support', label: '升级套餐' },
  ],
  [ErrorCode.TIMEOUT]: [{ action: 'retry', label: '重试', delay: 3 }],
  [ErrorCode.NETWORK_ERROR]: [
    { action: 'retry', label: '重试', delay: 3 },
    { action: 'check_config', label: '检查网络' },
  ],
  [ErrorCode.CONFIG_ERROR]: [
    { action: 'check_config', label: '检查配置' },
    { action: 'contact_support', label: '联系支持' },
  ],
  [ErrorCode.UNKNOWN_ERROR]: [
    { action: 'retry', label: '重试', delay: 3 },
    { action: 'contact_support', label: '联系支持' },
  ],
};

/**
 * 错误上下文
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
    super(`${resource}${id ? ` (${id})` : ''} 未找到`, ErrorCode.NOT_FOUND, 404, { resource, id });
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
        '请求超时，请稍后重试',
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
        '网络连接失败，请检查网络',
        ErrorCode.NETWORK_ERROR,
        'high',
        true,
        context,
        error,
      );
    }

    if (message.includes('rate limit') || message.includes('too many requests')) {
      return new OracleError(
        '请求过于频繁，请稍后再试',
        ErrorCode.RATE_LIMIT_ERROR,
        'medium',
        true,
        context,
        error,
      );
    }

    if (message.includes('authentication') || message.includes('unauthorized')) {
      return new OracleError(
        '认证失败，请重新登录',
        ErrorCode.AUTHENTICATION_ERROR,
        'high',
        false,
        context,
        error,
      );
    }

    if (message.includes('permission') || message.includes('forbidden')) {
      return new OracleError(
        '权限不足，无法执行此操作',
        ErrorCode.AUTHORIZATION_ERROR,
        'high',
        false,
        context,
        error,
      );
    }

    return new OracleError(
      error.message || '发生未知错误',
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
    return new OracleError(`${resource} 不存在`, ErrorCode.NOT_FOUND, 'low', false, context);
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
 * 异步操作的包装函数
 * 将可能抛出异常的异步操作转换为 Result 类型
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
            error instanceof Error ? error.message : '未知错误',
            ErrorCode.UNKNOWN_ERROR,
            500,
            { originalError: error },
          );
    return err(appError);
  }
}

/**
 * 同步操作的包装函数
 * 将可能抛出异常的同步操作转换为 Result 类型
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
            error instanceof Error ? error.message : '未知错误',
            ErrorCode.UNKNOWN_ERROR,
            500,
            { originalError: error },
          );
    return err(appError);
  }
}

/**
 * 断言函数
 * 条件不满足时抛出 ValidationError
 */
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new ValidationError(message);
  }
}

/**
 * 断言非空
 * 值为 null 或 undefined 时抛出 ValidationError
 */
export function assertNonNull<T>(value: T | null | undefined, name: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new ValidationError(`${name} 不能为空`);
  }
}

/**
 * 全局错误处理器
 * 用于处理未捕获的异常
 */
export function setupGlobalErrorHandlers(): void {
  // 处理未捕获的 Promise 异常
  process.on('unhandledRejection', (reason) => {
    logger.error('未处理的 Promise 拒绝', { reason });
  });

  // 处理未捕获的异常
  process.on('uncaughtException', (error) => {
    logger.error('未捕获的异常', {
      error: error.message,
      stack: error.stack,
    });
    // 给日志写入时间后退出
    setTimeout(() => process.exit(1), 1000);
  });
}

/**
 * 错误转换器
 * 将数据库错误转换为应用错误
 */
export function mapDatabaseError(error: unknown): DatabaseError {
  if (error instanceof DatabaseError) return error;

  const message = error instanceof Error ? error.message : '数据库操作失败';
  return new DatabaseError(message, error instanceof Error ? error : undefined);
}

/**
 * 错误转换器
 * 将网络错误转换为应用错误
 */
export function mapNetworkError(error: unknown, endpoint?: string): NetworkError {
  if (error instanceof NetworkError) return error;

  const message = error instanceof Error ? error.message : '网络请求失败';
  return new NetworkError(message, endpoint);
}
