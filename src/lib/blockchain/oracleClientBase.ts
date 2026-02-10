/**
 * 预言机客户端基础类型和工具
 *
 * 提供共享的类型定义和工具函数
 */

import { DEFAULT_STALENESS_THRESHOLDS } from '@/lib/config/constants';
import { logger } from '@/lib/logger';

// ============================================================================
// 类型定义
// ============================================================================

/** 健康状态 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastUpdate: number;
  issues?: string[];
}

/** 预言机客户端配置 */
export interface OracleClientConfig {
  /** 陈旧阈值 (秒) */
  stalenessThreshold?: number;
  /** 置信度阈值 */
  confidenceThreshold?: number;
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 检查价格是否过期
 * @param timestamp - 价格时间戳 (秒)
 * @param threshold - 陈旧阈值 (秒)
 * @returns 是否过期
 */
export function isPriceStale(timestamp: number, threshold: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now - timestamp > threshold;
}

/**
 * 计算数据新鲜度状态
 * @param timestamp - 数据时间戳 (Date 或毫秒时间戳)
 * @param thresholdSeconds - 陈旧阈值 (秒)，默认 300 (5分钟)
 * @returns 包含 isStale 和 stalenessSeconds 的对象
 */
export function calculateDataFreshness(
  timestamp: Date | number,
  thresholdSeconds: number = 300,
): { isStale: boolean; stalenessSeconds: number } {
  const timestampMs = timestamp instanceof Date ? timestamp.getTime() : timestamp;
  const now = Date.now();
  const stalenessSeconds = Math.floor((now - timestampMs) / 1000);
  const isStale = stalenessSeconds > thresholdSeconds;
  return { isStale, stalenessSeconds: isStale ? stalenessSeconds : 0 };
}

/**
 * 标准化交易对符号
 * @param symbol - 原始符号
 * @returns 标准化后的符号
 */
export function normalizeSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/-/g, '/');
}

// ============================================================================
// 重试工具
// ============================================================================

/**
 * 带重试机制的操作执行
 * @param operation - 要执行的操作
 * @param maxRetries - 最大重试次数，默认 3
 * @param baseDelayMs - 基础延迟时间（毫秒），默认 1000
 * @returns 操作结果
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        logger.warn(`Operation failed, retrying (${attempt}/${maxRetries})`, {
          error: lastError.message,
          delay,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// ============================================================================
// 导出常量
// ============================================================================

export { DEFAULT_STALENESS_THRESHOLDS };
