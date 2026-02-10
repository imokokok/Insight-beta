/**
 * Errors Module - 统一错误处理模块
 *
 * 提供完整的错误处理功能：
 * - 基础错误类和具体错误类型
 * - 错误工具函数
 * - 错误处理器（从 shared/errors 迁移）
 */

// ============================================================================
// 从 AppError 导出
// ============================================================================

export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  TimeoutError,
  ServiceUnavailableError,
  DatabaseError,
  OracleError,
  isAppError,
  toAppError,
  getHttpStatusCode,
  createErrorResponse,
} from './AppError';

export type { ErrorCategory } from './AppError';

// ============================================================================
// 从 apiErrors 导出
// ============================================================================

export {
  ApiError,
  ApiErrorCode,
  ErrorCodeToHttpStatus,
  ErrorCodeToMessage,
  apiErrors,
} from './apiErrors';

export type { ApiErrorResponse, ApiSuccessResponse, ApiResponse } from './apiErrors';

// ============================================================================
// 从 walletErrors 导出
// ============================================================================

export { normalizeWalletError } from './walletErrors';

export type { WalletErrorDetail, NormalizedWalletErrorKind } from './walletErrors';

// ============================================================================
// 错误处理器（从 shared/errors/ErrorHandler 迁移）
// ============================================================================

import { OracleClientError, PriceFetchError, HealthCheckError } from '@/lib/blockchain/core/types';
import type { OracleProtocol, SupportedChain } from '@/lib/types/unifiedOracleTypes';

/**
 * 标准化错误对象
 */
export function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

/**
 * 获取错误消息
 */
export function getErrorMessage(error: unknown): string {
  return normalizeError(error).message;
}

/**
 * 错误处理器类
 */
export class ErrorHandler {
  /**
   * 记录错误日志
   */
  static logError(
    logger: { error: (message: string, meta?: Record<string, unknown>) => void },
    message: string,
    error: unknown,
    context?: Record<string, unknown>,
  ): void {
    const normalizedError = normalizeError(error);
    logger.error(message, {
      error: normalizedError.message,
      stack: normalizedError.stack,
      ...context,
    });
  }

  /**
   * 创建价格获取错误
   */
  static createPriceFetchError(
    error: unknown,
    protocol: OracleProtocol,
    chain: SupportedChain,
    symbol: string,
  ): PriceFetchError {
    const normalized = normalizeError(error);
    return new PriceFetchError(
      `Failed to fetch price: ${normalized.message}`,
      protocol,
      chain,
      symbol,
      normalized,
    );
  }

  /**
   * 创建健康检查错误
   */
  static createHealthCheckError(
    error: unknown,
    protocol: OracleProtocol,
    chain: SupportedChain,
  ): HealthCheckError {
    const normalized = normalizeError(error);
    return new HealthCheckError(
      `Health check failed: ${normalized.message}`,
      protocol,
      chain,
      normalized,
    );
  }

  /**
   * 创建通用 Oracle 客户端错误
   */
  static createOracleError(
    message: string,
    code: string,
    protocol: OracleProtocol,
    chain: SupportedChain,
    cause?: unknown,
  ): OracleClientError {
    return new OracleClientError(message, code, protocol, chain, cause);
  }

  /**
   * 带重试的错误处理
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries: number;
      baseDelay: number;
      maxDelay: number;
      onRetry?: (attempt: number, error: Error) => void;
    },
  ): Promise<T> {
    const { maxRetries, baseDelay, maxDelay, onRetry } = options;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = normalizeError(error);

        if (attempt < maxRetries - 1) {
          const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
          if (onRetry) {
            onRetry(attempt + 1, lastError);
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}

/**
 * 重试装饰器
 */
export function withRetry(options: {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  onRetry?: (attempt: number, error: Error) => void;
}) {
  return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      return ErrorHandler.withRetry(() => originalMethod.apply(this, args), {
        ...options,
        onRetry: options.onRetry
          ? (attempt, error) => {
              options.onRetry?.(attempt, error);
            }
          : undefined,
      });
    };

    return descriptor;
  };
}

/**
 * 错误处理装饰器 - 包装函数并捕获错误
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  handler: (error: Error) => void,
) {
  return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value as T;

    descriptor.value = async function (...args: Parameters<T>) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        const normalizedError = normalizeError(error);
        handler(normalizedError);
        throw normalizedError;
      }
    };

    return descriptor;
  };
}
