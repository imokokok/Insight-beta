/**
 * Oracle Sync Framework
 *
 * 通用 Oracle 同步框架
 * 提供统一的同步任务管理、状态跟踪和错误处理
 */

import crypto from 'crypto';

import { query } from '@/lib/database/db';
import {
  getUnifiedInstance,
  updateSyncState,
  recordSyncError,
} from '@/features/oracle/services/unifiedConfig';
import { logger } from '@/shared/logger';
import type { SupportedChain } from '@/types/oracle/chain';
import type { OracleProtocol } from '@/types/oracle/protocol';

// ============================================================================
// Types
// ============================================================================

export interface SyncState {
  isRunning: boolean;
  lastSyncAt: Date | null;
  lastPrice: number | null;
  consecutiveErrors: number;
}

export interface SyncConfig {
  defaultIntervalMs: number;
  maxRetries: number;
  retryDelayMs: number;
  batchSize: number;
}

export interface PriceFeedRecord {
  protocol: string;
  chain: string;
  instanceId: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  timestamp: Date;
  blockNumber: number | null;
  confidence: number;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface SyncContext {
  instanceId: string;
  protocol: OracleProtocol;
  chain: SupportedChain;
  rpcUrl: string;
  config: Record<string, unknown>;
}

export type SyncFunction = (context: SyncContext) => Promise<PriceFeedRecord[]>;
export type PriceWriter = (records: PriceFeedRecord[]) => Promise<void>;

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  defaultIntervalMs: 60_000,
  maxRetries: 3,
  retryDelayMs: 5_000,
  batchSize: 20,
};

// ============================================================================
// Sync Manager
// ============================================================================

class SyncManager {
  private syncStates = new Map<string, SyncState>();
  private syncIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private syncFunctions = new Map<OracleProtocol, SyncFunction>();
  private priceWriter: PriceWriter | null = null;
  private syncExecutionLocks = new Map<string, Promise<void>>();
  private syncLockSet = new Set<string>(); // 原子锁集合

  /**
   * 获取同步锁（原子操作）
   * @returns 是否成功获取锁
   */
  private acquireSyncLock(instanceId: string): boolean {
    if (this.syncLockSet.has(instanceId)) {
      return false;
    }
    this.syncLockSet.add(instanceId);
    return true;
  }

  /**
   * 释放同步锁
   */
  private releaseSyncLock(instanceId: string): void {
    this.syncLockSet.delete(instanceId);
  }

  /**
   * 注册协议特定的同步函数
   */
  registerSyncFunction(protocol: OracleProtocol, fn: SyncFunction): void {
    this.syncFunctions.set(protocol, fn);
    logger.debug(`Registered sync function for protocol: ${protocol}`);
  }

  /**
   * 注册价格写入函数
   */
  registerPriceWriter(writer: PriceWriter): void {
    this.priceWriter = writer;
  }

  /**
   * 启动同步任务
   */
  async startSync(instanceId: string, config: Partial<SyncConfig> = {}): Promise<void> {
    if (this.syncIntervals.has(instanceId)) {
      logger.warn(`Sync already running for instance ${instanceId}`);
      return;
    }

    const instance = await getUnifiedInstance(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    const syncFn = this.syncFunctions.get(instance.protocol);
    if (!syncFn) {
      throw new Error(`No sync function registered for protocol: ${instance.protocol}`);
    }

    // Initialize sync state
    this.syncStates.set(instanceId, {
      isRunning: false,
      lastSyncAt: null,
      lastPrice: null,
      consecutiveErrors: 0,
    });

    const syncConfig = { ...DEFAULT_SYNC_CONFIG, ...config };

    // Execute initial sync
    await this.executeSync(instanceId, instance, syncFn, syncConfig);

    // Set up interval sync
    const intervalMs = (instance.config.syncIntervalMs as number) || syncConfig.defaultIntervalMs;
    const interval = setInterval(async () => {
      try {
        await this.executeSync(instanceId, instance, syncFn, syncConfig);
      } catch (error) {
        logger.error(`Scheduled sync failed for instance ${instanceId}`, { error });
      }
    }, intervalMs);

    this.syncIntervals.set(instanceId, interval);

    logger.info(`Sync started for instance ${instanceId}`, {
      intervalMs,
      chain: instance.chain,
      protocol: instance.protocol,
    });
  }

  /**
   * 停止同步任务
   */
  stopSync(instanceId: string): void {
    const interval = this.syncIntervals.get(instanceId);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(instanceId);
      this.syncStates.delete(instanceId);
      logger.info(`Sync stopped for instance ${instanceId}`);
    }
  }

  /**
   * 停止所有同步任务
   */
  stopAllSyncs(): void {
    for (const [instanceId] of this.syncIntervals) {
      this.stopSync(instanceId);
    }
  }

  /**
   * 获取同步状态
   */
  getSyncState(instanceId: string): SyncState | undefined {
    return this.syncStates.get(instanceId);
  }

  /**
   * 获取所有运行中的同步任务
   */
  getRunningSyncs(): string[] {
    return Array.from(this.syncIntervals.keys());
  }

  /**
   * 执行同步
   */
  private async executeSync(
    instanceId: string,
    instance: Awaited<ReturnType<typeof getUnifiedInstance>>,
    syncFn: SyncFunction,
    config: SyncConfig,
  ): Promise<void> {
    // 使用原子锁机制防止竞态条件

    // 尝试获取锁
    if (!this.acquireSyncLock(instanceId)) {
      logger.debug('Sync already in progress, skipping', { instanceId });
      return;
    }

    const state = this.syncStates.get(instanceId);
    if (!state) {
      this.releaseSyncLock(instanceId);
      return;
    }

    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    try {
      const context: SyncContext = {
        instanceId,
        protocol: instance.protocol as OracleProtocol,
        chain: instance.chain as SupportedChain,
        rpcUrl: instance.config.rpcUrl as string,
        config: instance.config,
      };

      const records = await syncFn(context);

      if (records.length > 0 && this.priceWriter) {
        await this.priceWriter(records);
      }

      // Update state
      state.lastSyncAt = new Date();
      state.consecutiveErrors = 0;
      if (records.length > 0 && records[0]) {
        state.lastPrice = records[0].price;
      }

      // Update database sync state
      await updateSyncState(instanceId, {
        lastSyncAt: state.lastSyncAt,
        lastProcessedBlock: records[0]?.blockNumber ?? undefined,
        status: 'healthy',
      });

      logger.debug(`Sync completed for instance ${instanceId}`, {
        recordsCount: records.length,
      });
    } catch (error) {
      state.consecutiveErrors++;

      const errorMessage = error instanceof Error ? error.message : String(error);
      await recordSyncError(instanceId, errorMessage);

      logger.error(`Sync failed for instance ${instanceId}`, {
        error,
        consecutiveErrors: state.consecutiveErrors,
      });

      // Update database sync state
      await updateSyncState(instanceId, {
        lastSyncAt: new Date(),
        status: 'error',
        errorMessage,
      });

      // Retry logic with exponential backoff and jitter
      if (state.consecutiveErrors < config.maxRetries) {
        const backoffMs = Math.min(
          config.retryDelayMs * Math.pow(2, state.consecutiveErrors - 1),
          60000, // 最大 60 秒
        );
        // 使用 crypto 生成更安全的抖动值
        const jitter = (crypto.randomInt(0, 0xffffffff) / 0xffffffff) * 0.1 * backoffMs;

        logger.info(`Retrying sync for instance ${instanceId}`, {
          attempt: state.consecutiveErrors,
          maxRetries: config.maxRetries,
          delayMs: Math.round(backoffMs + jitter),
        });
        await new Promise((resolve) => setTimeout(resolve, backoffMs + jitter));
        // 使用 setImmediate 避免递归调用栈溢出
        state.isRunning = false;
        this.syncExecutionLocks.delete(instanceId);
        this.releaseSyncLock(instanceId); // 释放原子锁
        // 使用 setImmediate 将重试放入事件循环，避免递归栈溢出
        // 检查实例是否仍在运行，防止服务停止后仍执行重试
        if (this.syncIntervals.has(instanceId)) {
          setImmediate(() => {
            // 再次检查，确保在 setImmediate 回调执行时实例仍然存在
            if (this.syncIntervals.has(instanceId)) {
              void this.executeSync(instanceId, instance, syncFn, config);
            }
          });
        }
        return;
      }
    } finally {
      state.isRunning = false;
      this.syncExecutionLocks.delete(instanceId);
      this.releaseSyncLock(instanceId); // 释放原子锁
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const syncManager = new SyncManager();

// ============================================================================
// Utility Functions
// ============================================================================

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries: number;
    retryDelayMs: number;
    onRetry?: (attempt: number, error: Error) => void;
  },
): Promise<T> {
  const { maxRetries, retryDelayMs, onRetry } = options;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries - 1) {
        const delay = retryDelayMs * Math.pow(2, attempt);
        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// ============================================================================
// Default Price Writer
// ============================================================================

export async function writePriceFeeds(records: PriceFeedRecord[]): Promise<void> {
  if (records.length === 0) return;

  try {
    // 批量插入优化：每批最多100条记录
    const BATCH_SIZE = 100;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);

      // 构建批量插入的占位符
      const placeholders = batch
        .map(
          (_, idx) =>
            `($${idx * 12 + 1}, $${idx * 12 + 2}, $${idx * 12 + 3}, $${idx * 12 + 4}, $${idx * 12 + 5}, $${idx * 12 + 6}, ` +
            `$${idx * 12 + 7}, $${idx * 12 + 8}, $${idx * 12 + 9}, $${idx * 12 + 10}, $${idx * 12 + 11}, $${idx * 12 + 12})`,
        )
        .join(', ');

      // 展平参数数组
      const params = batch.flatMap((record) => [
        record.protocol,
        record.chain,
        record.instanceId,
        record.symbol,
        record.baseAsset,
        record.quoteAsset,
        record.price,
        record.timestamp,
        record.blockNumber,
        record.confidence,
        record.source,
        JSON.stringify(record.metadata || {}),
      ]);

      await query(
        `INSERT INTO oracle_price_feeds (
          protocol, chain, instance_id, symbol, base_asset, quote_asset,
          price, timestamp, block_number, confidence, source, metadata
        ) VALUES ${placeholders}
        ON CONFLICT (protocol, chain, instance_id, symbol, timestamp)
        DO UPDATE SET
          price = EXCLUDED.price,
          block_number = EXCLUDED.block_number,
          confidence = EXCLUDED.confidence,
          metadata = EXCLUDED.metadata`,
        params,
      );
    }

    logger.debug(`Wrote ${records.length} price records to database in batches`);
  } catch (error) {
    logger.error('Failed to write price feeds', { error, count: records.length });
    throw error;
  }
}

// Register default price writer
syncManager.registerPriceWriter(writePriceFeeds);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 创建价格喂价记录
 */
export function createPriceFeedRecord(
  context: SyncContext,
  symbol: string,
  baseAsset: string,
  quoteAsset: string,
  price: number,
  blockNumber: number | null,
  confidence: number,
  metadata?: Record<string, unknown>,
): PriceFeedRecord {
  return {
    protocol: context.protocol,
    chain: context.chain,
    instanceId: context.instanceId,
    symbol,
    baseAsset,
    quoteAsset,
    price,
    timestamp: new Date(),
    blockNumber,
    confidence,
    source: context.protocol,
    metadata,
  };
}

/**
 * 带超时的 Promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(errorMessage || `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}
