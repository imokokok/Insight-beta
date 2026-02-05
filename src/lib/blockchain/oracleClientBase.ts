/**
 * 预言机客户端基础类型和工具
 *
 * 提供共享的类型定义和工具函数
 */

import { type Address, formatUnits } from 'viem';
import { logger } from '@/lib/logger';
import { DEFAULT_STALENESS_THRESHOLDS } from '@/lib/config/constants';
import type { SupportedChain } from '@/lib/types/unifiedOracleTypes';

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
  /** 自定义合约地址 */
  contractAddress?: Address;
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
 * 格式化价格
 * @param price - 原始价格
 * @param decimals - 小数位数
 * @returns 格式化后的价格
 */
export function formatPriceValue(price: bigint, decimals: number = 8): number {
  return parseFloat(formatUnits(price, decimals));
}

/**
 * 解析交易对符号
 * @param symbol - 交易对符号 (如 "ETH/USD")
 * @returns 解析结果
 */
export function parseSymbolPair(symbol: string): { base: string; quote: string } | null {
  const parts = symbol.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return { base: parts[0], quote: parts[1] };
}

/**
 * 标准化交易对符号
 * @param symbol - 原始符号
 * @returns 标准化后的符号
 */
export function normalizeSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/-/g, '/');
}

/**
 * 验证地址格式
 * @param address - 地址字符串
 * @returns 是否有效
 */
export function isValidAddressFormat(address: string): address is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// ============================================================================
// 日志工具
// ============================================================================

/**
 * 创建带前缀的日志记录器
 * @param clientName - 客户端名称
 * @param chain - 链名称
 * @returns 日志记录函数
 */
export function createLogger(clientName: string, chain: SupportedChain) {
  const prefix = `${clientName}[${chain}]`;

  return {
    info: (message: string, meta?: Record<string, unknown>) => {
      logger.info(`${prefix}: ${message}`, meta);
    },
    warn: (message: string, meta?: Record<string, unknown>) => {
      logger.warn(`${prefix}: ${message}`, meta);
    },
    error: (message: string, meta?: Record<string, unknown>) => {
      logger.error(`${prefix}: ${message}`, meta);
    },
    debug: (message: string, meta?: Record<string, unknown>) => {
      logger.debug(`${prefix}: ${message}`, meta);
    },
  };
}

// ============================================================================
// 批量处理工具
// ============================================================================

/**
 * 批量处理请求
 * @param items - 待处理项
 * @param processor - 处理函数
 * @param batchSize - 批次大小
 * @returns 处理结果
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10,
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map((item) => processor(item)));

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        logger.warn('Batch processing error', { error: String(result.reason) });
      }
    }
  }

  return results;
}

/**
 * 带重试的异步操作
 * @param operation - 异步操作
 * @param retries - 重试次数
 * @param delayMs - 延迟时间 (毫秒)
 * @returns 操作结果
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 1000,
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (i < retries - 1) {
        const delay = delayMs * Math.pow(2, i); // 指数退避
        logger.warn(`Retry ${i + 1}/${retries} after ${delay}ms`, { error: lastError.message });
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
