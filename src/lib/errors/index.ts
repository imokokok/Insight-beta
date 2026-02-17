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
  NotFoundError,
  isAppError,
  toAppError,
  getHttpStatusCode,
  createErrorResponse,
} from './AppError';

// ============================================================================
// 从 apiErrors 导出
// ============================================================================

export { ApiError, ApiErrorCode, ErrorCodeToHttpStatus, ErrorCodeToMessage } from './apiErrors';

export type { ApiErrorResponse, ApiResponse } from './apiErrors';

// ============================================================================
// 从 walletErrors 导出
// ============================================================================

export { normalizeWalletError } from './walletErrors';

export type { WalletErrorDetail, NormalizedWalletErrorKind } from './walletErrors';

// ============================================================================
// 错误处理器（从 shared/errors/ErrorHandler 迁移）
// ============================================================================

import { PriceFetchError } from '@/lib/blockchain/core/types';
import type { OracleProtocol, SupportedChain } from '@/types/unifiedOracleTypes';

// 从 resilience.ts 导入 withRetry（统一实现）
export { withRetry } from '@/shared/utils/resilience';
export type { RetryOptions } from '@/shared/utils/resilience';

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
}
