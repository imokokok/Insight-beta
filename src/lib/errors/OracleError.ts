export type ErrorCode =
  | 'DATABASE_ERROR'
  | 'BLOCKCHAIN_ERROR'
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND'
  | 'RATE_LIMIT_ERROR'
  | 'TIMEOUT_ERROR'
  | 'NETWORK_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'UNKNOWN_ERROR';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorRecoveryAction {
  action: 'retry' | 'refresh' | 'contact_support' | 'check_config' | 'wait';
  label: string;
  delay?: number;
}

export const ErrorRecoveryGuide: Record<ErrorCode, ErrorRecoveryAction[]> = {
  DATABASE_ERROR: [
    { action: 'retry', label: '重试', delay: 3 },
    { action: 'contact_support', label: '联系支持' },
  ],
  BLOCKCHAIN_ERROR: [
    { action: 'retry', label: '重试', delay: 5 },
    { action: 'check_config', label: '检查配置' },
  ],
  VALIDATION_ERROR: [
    { action: 'refresh', label: '刷新页面' },
    { action: 'check_config', label: '检查输入' },
  ],
  AUTHENTICATION_ERROR: [{ action: 'refresh', label: '重新登录' }],
  AUTHORIZATION_ERROR: [{ action: 'contact_support', label: '申请权限' }],
  NOT_FOUND: [{ action: 'refresh', label: '返回首页' }],
  RATE_LIMIT_ERROR: [
    { action: 'wait', label: '等待后重试', delay: 60 },
    { action: 'contact_support', label: '升级套餐' },
  ],
  TIMEOUT_ERROR: [{ action: 'retry', label: '重试', delay: 3 }],
  NETWORK_ERROR: [
    { action: 'retry', label: '重试', delay: 3 },
    { action: 'check_config', label: '检查网络' },
  ],
  CONFIGURATION_ERROR: [
    { action: 'check_config', label: '检查配置' },
    { action: 'contact_support', label: '联系支持' },
  ],
  UNKNOWN_ERROR: [
    { action: 'retry', label: '重试', delay: 3 },
    { action: 'contact_support', label: '联系支持' },
  ],
};

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

export class OracleError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly retryable: boolean;
  public readonly context?: ErrorContext;
  public readonly originalError?: Error;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: ErrorCode = 'UNKNOWN_ERROR',
    severity: ErrorSeverity = 'medium',
    retryable: boolean = true,
    context?: ErrorContext,
    originalError?: Error,
  ) {
    super(message);
    this.name = 'OracleError';
    this.code = code;
    this.severity = severity;
    this.retryable = retryable;
    this.context = context;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OracleError);
    }
  }

  public getRecoveryActions(): ErrorRecoveryAction[] {
    return ErrorRecoveryGuide[this.code] || ErrorRecoveryGuide.UNKNOWN_ERROR;
  }

  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      retryable: this.retryable,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
      originalError: this.originalError?.message,
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
        'TIMEOUT_ERROR',
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
        'NETWORK_ERROR',
        'high',
        true,
        context,
        error,
      );
    }

    if (message.includes('rate limit') || message.includes('too many requests')) {
      return new OracleError(
        '请求过于频繁，请稍后再试',
        'RATE_LIMIT_ERROR',
        'medium',
        true,
        context,
        error,
      );
    }

    if (message.includes('authentication') || message.includes('unauthorized')) {
      return new OracleError(
        '认证失败，请重新登录',
        'AUTHENTICATION_ERROR',
        'high',
        false,
        context,
        error,
      );
    }

    if (message.includes('permission') || message.includes('forbidden')) {
      return new OracleError(
        '权限不足，无法执行此操作',
        'AUTHORIZATION_ERROR',
        'high',
        false,
        context,
        error,
      );
    }

    return new OracleError(
      error.message || '发生未知错误',
      'UNKNOWN_ERROR',
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
    return new OracleError(message, 'DATABASE_ERROR', 'critical', true, context, originalError);
  }

  public static blockchainError(
    message: string,
    originalError?: Error,
    context?: ErrorContext,
  ): OracleError {
    return new OracleError(message, 'BLOCKCHAIN_ERROR', 'high', true, context, originalError);
  }

  public static validationError(message: string, context?: ErrorContext): OracleError {
    return new OracleError(message, 'VALIDATION_ERROR', 'low', false, context);
  }

  public static notFound(resource: string, context?: ErrorContext): OracleError {
    return new OracleError(`${resource} 不存在`, 'NOT_FOUND', 'low', false, context);
  }
}
