/**
 * ErrorHandler - 统一错误处理工具
 *
 * 提供标准化的错误处理功能：
 * - 错误标准化和转换
 * - 错误工厂函数
 * - 错误日志记录
 * - 装饰器支持
 */

import { OracleClientError, PriceFetchError, HealthCheckError } from '@/lib/blockchain/core/types';
import { sleep } from '@/lib/utils/common';
import type { Logger } from '@/lib/shared/logger/LoggerFactory';
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
   * 记录错误日志
   */
  static logError(
    logger: Logger,
    message: string,
    error: unknown,
    meta?: Record<string, unknown>,
  ): void {
    const normalized = normalizeError(error);
    logger.error(message, {
      error: normalized.message,
      stack: normalized.stack,
      ...meta,
    });
  }

  /**
   * 记录警告日志
   */
  static logWarn(
    logger: Logger,
    message: string,
    error: unknown,
    meta?: Record<string, unknown>,
  ): void {
    const normalized = normalizeError(error);
    logger.warn(message, {
      error: normalized.message,
      ...meta,
    });
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
          await sleep(delay);
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
  logger?: Logger;
}) {
  return function (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    const logger = options.logger;
    descriptor.value = async function (...args: unknown[]) {
      return ErrorHandler.withRetry(() => originalMethod.apply(this, args), {
        ...options,
        onRetry: logger
          ? (attempt, error) => {
              logger.warn(`${propertyKey} failed, retrying`, {
                attempt,
                maxRetries: options.maxRetries,
                error: error.message,
              });
            }
          : undefined,
      });
    };

    return descriptor;
  };
}

/**
 * 错误处理装饰器
 */
export function withErrorHandling(options: {
  errorFactory: (error: unknown) => Error;
  logger?: Logger;
  logMessage?: string;
}) {
  return function (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        if (options.logger) {
          const message = options.logMessage || `${propertyKey} failed`;
          ErrorHandler.logError(options.logger, message, error);
        }
        throw options.errorFactory(error);
      }
    };

    return descriptor;
  };
}
