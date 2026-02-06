/**
 * Timeout Utilities - 超时控制工具
 *
 * 提供 Promise 超时控制功能
 * - 数据库查询超时
 * - API 请求超时
 * - 计算任务超时
 */

import { logger } from '@/lib/logger';

export interface TimeoutOptions {
  /** 超时时间（毫秒） */
  timeoutMs: number;
  /** 超时错误信息 */
  errorMessage?: string;
  /** 是否在超时后记录日志 */
  logOnTimeout?: boolean;
}

export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
  ) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * 为 Promise 添加超时控制
 */
export async function withTimeout<T>(promise: Promise<T>, options: TimeoutOptions): Promise<T> {
  const { timeoutMs, errorMessage = 'Operation timed out', logOnTimeout = true } = options;

  const timeoutPromise = new Promise<never>((_, reject) => {
    const timeoutId = setTimeout(() => {
      if (logOnTimeout) {
        logger.warn('Operation timed out', { timeoutMs, errorMessage });
      }
      reject(new TimeoutError(errorMessage, 'withTimeout'));
    }, timeoutMs);

    // 清理定时器
    promise.finally(() => clearTimeout(timeoutId)).catch(() => {});
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * 数据库查询超时包装器
 */
export async function withDbTimeout<T>(
  query: Promise<T>,
  operationName: string,
  timeoutMs: number = 5000,
): Promise<T> {
  return withTimeout(query, {
    timeoutMs,
    errorMessage: `Database query "${operationName}" timed out after ${timeoutMs}ms`,
    logOnTimeout: true,
  });
}

/**
 * API 请求超时包装器
 */
export async function withApiTimeout<T>(
  request: Promise<T>,
  endpoint: string,
  timeoutMs: number = 10000,
): Promise<T> {
  return withTimeout(request, {
    timeoutMs,
    errorMessage: `API request to "${endpoint}" timed out after ${timeoutMs}ms`,
    logOnTimeout: true,
  });
}

/**
 * 计算任务超时包装器
 */
export async function withComputeTimeout<T>(
  computation: Promise<T>,
  taskName: string,
  timeoutMs: number = 30000,
): Promise<T> {
  return withTimeout(computation, {
    timeoutMs,
    errorMessage: `Computation "${taskName}" timed out after ${timeoutMs}ms`,
    logOnTimeout: true,
  });
}

/**
 * 创建带超时的函数包装器
 */
export function createTimeoutWrapper<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  defaultTimeoutMs: number,
  operationName: string,
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return withTimeout(fn(...args) as Promise<ReturnType<T>>, {
      timeoutMs: defaultTimeoutMs,
      errorMessage: `Operation "${operationName}" timed out after ${defaultTimeoutMs}ms`,
      logOnTimeout: true,
    });
  };
}

/**
 * 重试机制
 */
export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { maxAttempts, delayMs, backoffMultiplier = 2, onRetry } = options;

  let lastError: Error | undefined;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        logger.error('Operation failed after max retries', {
          attempts: maxAttempts,
          lastError: lastError.message,
        });
        throw lastError;
      }

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      logger.warn(`Retry attempt ${attempt}/${maxAttempts}`, {
        error: lastError.message,
        nextDelay: currentDelay,
      });

      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay *= backoffMultiplier;
    }
  }

  throw lastError;
}

/**
 * 带超时和重试的操作
 */
export async function withTimeoutAndRetry<T>(
  operation: () => Promise<T>,
  timeoutOptions: TimeoutOptions,
  retryOptions: RetryOptions,
): Promise<T> {
  return withRetry(() => withTimeout(operation(), timeoutOptions), retryOptions);
}

const timeoutUtils = {
  withTimeout,
  withDbTimeout,
  withApiTimeout,
  withComputeTimeout,
  withRetry,
  withTimeoutAndRetry,
  TimeoutError,
};

export default timeoutUtils;
