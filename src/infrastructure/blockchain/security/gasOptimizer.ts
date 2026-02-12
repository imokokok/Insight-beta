/**
 * Gas Optimizer Module
 *
 * Gas 优化模块
 * 提供批量查询、缓存策略、多调用聚合等 Gas 优化功能
 */

import type { Address, PublicClient, EstimateGasParameters } from 'viem';
import { logger } from '@/shared/logger';

// ============================================================================
// 常量定义
// ============================================================================

export const GAS_CONSTANTS = {
  // Gas 限制
  DEFAULT_GAS_LIMIT: BigInt(500000),
  MAX_GAS_PER_TRANSACTION: BigInt(30000000),
  ESTIMATION_BUFFER_PERCENT: 20, // 20% buffer

  // 批量处理
  MAX_MULTICALL_SIZE: 100,
  OPTIMAL_BATCH_SIZE: 25,
  MIN_BATCH_SIZE: 5,

  // 缓存
  DEFAULT_CACHE_TTL: 30000, // 30 seconds
  MAX_CACHE_SIZE: 1000,

  // 区块
  BLOCK_CONFIRMATIONS: 1,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
} as const;

// ============================================================================
// 类型定义
// ============================================================================

export interface GasEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  estimatedCost: bigint;
  estimatedCostUSD?: number;
}

export interface BatchCallItem {
  address: Address;
  abi: unknown[];
  functionName: string;
  args: unknown[];
}

export interface BatchCallResult<T = unknown> {
  results: T[];
  errors: Array<{ index: number; error: string }>;
  totalGasUsed: bigint;
  durationMs: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  blockNumber?: bigint;
}

export interface GasOptimizerConfig {
  enableCache: boolean;
  cacheTtl: number;
  maxBatchSize: number;
  gasEstimationBuffer: number;
}

// ============================================================================
// 简单缓存实现
// ============================================================================

export class QueryCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = GAS_CONSTANTS.MAX_CACHE_SIZE, ttl: number = GAS_CONSTANTS.DEFAULT_CACHE_TTL) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: T, blockNumber?: bigint): void {
    // LRU 淘汰
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      blockNumber,
    });
  }

  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  invalidateByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
    };
  }
}

// ============================================================================
// Gas 估算器
// ============================================================================

export class GasEstimator {
  private publicClient: PublicClient;

  constructor(publicClient: PublicClient) {
    this.publicClient = publicClient;
  }

  async estimateGas(params: EstimateGasParameters): Promise<bigint> {
    try {
      const estimated = await this.publicClient.estimateGas(params);

      const buffer = (estimated * BigInt(GAS_CONSTANTS.ESTIMATION_BUFFER_PERCENT)) / BigInt(100);
      return estimated + buffer;
    } catch (error) {
      logger.warn('Gas estimation failed, using default', { error });
      return GAS_CONSTANTS.DEFAULT_GAS_LIMIT;
    }
  }

  async getGasPrice(): Promise<{
    gasPrice: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
  }> {
    try {
      const block = await this.publicClient.getBlock();
      const baseFee = block.baseFeePerGas;

      if (baseFee) {
        // EIP-1559
        const maxPriorityFeePerGas = BigInt(1000000000); // 1 Gwei
        const maxFeePerGas = baseFee * BigInt(2) + maxPriorityFeePerGas;

        return {
          gasPrice: maxFeePerGas,
          maxFeePerGas,
          maxPriorityFeePerGas,
        };
      } else {
        // Legacy
        const gasPrice = await this.publicClient.getGasPrice();
        return { gasPrice };
      }
    } catch (error) {
      logger.warn('Failed to get gas price', { error });
      return { gasPrice: BigInt(20000000000) }; // 20 Gwei default
    }
  }

  async getFullEstimate(params: { to: Address; data?: `0x${string}`; value?: bigint }): Promise<GasEstimate> {
    const [gasLimit, gasPriceInfo] = await Promise.all([
      this.estimateGas(params),
      this.getGasPrice(),
    ]);

    const estimatedCost = gasLimit * gasPriceInfo.gasPrice;

    return {
      gasLimit,
      gasPrice: gasPriceInfo.gasPrice,
      maxFeePerGas: gasPriceInfo.maxFeePerGas,
      maxPriorityFeePerGas: gasPriceInfo.maxPriorityFeePerGas,
      estimatedCost,
    };
  }
}

// ============================================================================
// 批量调用优化器
// ============================================================================

export class BatchCallOptimizer {
  private publicClient: PublicClient;
  private cache: QueryCache;
  private config: GasOptimizerConfig;

  constructor(
    publicClient: PublicClient,
    config: Partial<GasOptimizerConfig> = {},
  ) {
    this.publicClient = publicClient;
    this.config = {
      enableCache: config.enableCache ?? true,
      cacheTtl: config.cacheTtl ?? GAS_CONSTANTS.DEFAULT_CACHE_TTL,
      maxBatchSize: config.maxBatchSize ?? GAS_CONSTANTS.OPTIMAL_BATCH_SIZE,
      gasEstimationBuffer: config.gasEstimationBuffer ?? GAS_CONSTANTS.ESTIMATION_BUFFER_PERCENT,
    };
    this.cache = new QueryCache(GAS_CONSTANTS.MAX_CACHE_SIZE, this.config.cacheTtl);
  }

  /**
   * 执行批量合约调用（优化版本）
   */
  async executeBatch<T = unknown>(calls: BatchCallItem[]): Promise<BatchCallResult<T>> {
    const startTime = Date.now();
    const results: T[] = new Array(calls.length);
    const errors: Array<{ index: number; error: string }> = [];
    let totalGasUsed = BigInt(0);

    // 分批处理
    const batches = this.createBatches(calls);

    for (const batch of batches) {
      const batchResults = await this.executeBatchChunk<T>(batch);

      for (const { index, result, error } of batchResults) {
        if (error) {
          errors.push({ index, error });
        } else {
          results[index] = result as T;
        }
      }
    }

    return {
      results,
      errors,
      totalGasUsed,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * 创建批次
   */
  private createBatches(calls: BatchCallItem[]): Array<Array<BatchCallItem & { originalIndex: number }>> {
    const batches: Array<Array<BatchCallItem & { originalIndex: number }>> = [];
    const batchSize = this.config.maxBatchSize;

    for (let i = 0; i < calls.length; i += batchSize) {
      const batch = calls.slice(i, i + batchSize).map((call, j) => ({
        ...call,
        originalIndex: i + j,
      }));
      batches.push(batch);
    }

    return batches;
  }

  /**
   * 执行单个批次
   */
  private async executeBatchChunk<T>(
    batch: Array<BatchCallItem & { originalIndex: number }>,
  ): Promise<Array<{ index: number; result?: T; error?: string }>> {
    const results: Array<{ index: number; result?: T; error?: string }> = [];

    // 并行执行
    const promises = batch.map(async (call) => {
      const cacheKey = this.getCacheKey(call);

      // 检查缓存
      if (this.config.enableCache) {
        const cached = this.cache.get(cacheKey);
        if (cached !== null) {
          return { index: call.originalIndex, result: cached as T };
        }
      }

      try {
        const result = await this.publicClient.readContract({
          address: call.address,
          abi: call.abi,
          functionName: call.functionName,
          args: call.args,
        });

        // 缓存结果
        if (this.config.enableCache) {
          this.cache.set(cacheKey, result);
        }

        return { index: call.originalIndex, result: result as T };
      } catch (error) {
        return {
          index: call.originalIndex,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    const settled = await Promise.allSettled(promises);

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          index: -1,
          error: result.reason?.message || 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(call: BatchCallItem): string {
    return `${call.address}:${call.functionName}:${JSON.stringify(call.args)}`;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; maxSize: number; ttl: number } {
    return this.cache.getStats();
  }
}

// ============================================================================
// 智能重试机制
// ============================================================================

export class SmartRetry {
  private maxRetries: number;
  private baseDelayMs: number;
  private maxDelayMs: number;

  constructor(
    maxRetries: number = GAS_CONSTANTS.MAX_RETRIES,
    baseDelayMs: number = GAS_CONSTANTS.RETRY_DELAY_MS,
    maxDelayMs: number = 10000,
  ) {
    this.maxRetries = maxRetries;
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
  }

  async execute<T>(
    operation: () => Promise<T>,
    shouldRetry: (error: unknown) => boolean = this.defaultShouldRetry,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt < this.maxRetries && shouldRetry(error)) {
          const delay = this.calculateDelay(attempt);
          logger.warn(`Retrying operation (attempt ${attempt + 1}/${this.maxRetries})`, {
            delay,
            error: error instanceof Error ? error.message : String(error),
          });
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private calculateDelay(attempt: number): number {
    // 指数退避 + 随机抖动
    const exponentialDelay = this.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * this.baseDelayMs;
    return Math.min(exponentialDelay + jitter, this.maxDelayMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private defaultShouldRetry(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      // 网络错误、超时、速率限制等可重试
      return (
        message.includes('timeout') ||
        message.includes('network') ||
        message.includes('rate limit') ||
        message.includes('429') ||
        message.includes('503') ||
        message.includes('502') ||
        message.includes('connection')
      );
    }
    return false;
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createQueryCache<T = unknown>(
  maxSize?: number,
  ttl?: number,
): QueryCache<T> {
  return new QueryCache<T>(maxSize, ttl);
}

export function createGasEstimator(publicClient: PublicClient): GasEstimator {
  return new GasEstimator(publicClient);
}

export function createBatchCallOptimizer(
  publicClient: PublicClient,
  config?: Partial<GasOptimizerConfig>,
): BatchCallOptimizer {
  return new BatchCallOptimizer(publicClient, config);
}

export function createSmartRetry(
  maxRetries?: number,
  baseDelayMs?: number,
): SmartRetry {
  return new SmartRetry(maxRetries, baseDelayMs);
}
