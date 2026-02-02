/**
 * Oracle Sync Framework
 *
 * 通用 Oracle 同步框架
 * 提供统一的同步任务管理、状态跟踪和错误处理
 */

import { query } from '@/server/db';
import { logger } from '@/lib/logger';
import {
  getUnifiedInstance,
  updateSyncState,
  recordSyncError,
} from '@/server/oracle/unifiedConfig';
import type { OracleProtocol } from '@/lib/types/oracle/protocol';
import type { SupportedChain } from '@/lib/types/oracle/chain';

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
  private syncIntervals = new Map<string, NodeJS.Timeout>();
  private syncFunctions = new Map<OracleProtocol, SyncFunction>();
  private priceWriter: PriceWriter | null = null;

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
    const state = this.syncStates.get(instanceId);
    if (!state || state.isRunning) {
      return;
    }

    state.isRunning = true;

    try {
      const context: SyncContext = {
        instanceId,
        protocol: instance!.protocol as OracleProtocol,
        chain: instance!.chain as SupportedChain,
        rpcUrl: instance!.config.rpcUrl as string,
        config: instance!.config,
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

      // Retry logic
      if (state.consecutiveErrors < config.maxRetries) {
        logger.info(`Retrying sync for instance ${instanceId}`, {
          attempt: state.consecutiveErrors,
          maxRetries: config.maxRetries,
        });
        await new Promise((resolve) => setTimeout(resolve, config.retryDelayMs));
        state.isRunning = false;
        await this.executeSync(instanceId, instance, syncFn, config);
        return;
      }
    } finally {
      state.isRunning = false;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const syncManager = new SyncManager();

// ============================================================================
// Default Price Writer
// ============================================================================

export async function writePriceFeeds(records: PriceFeedRecord[]): Promise<void> {
  if (records.length === 0) return;

  try {
    for (const record of records) {
      await query(
        `INSERT INTO oracle_price_feeds (
          protocol, chain, instance_id, symbol, base_asset, quote_asset,
          price, timestamp, block_number, confidence, source, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (protocol, chain, instance_id, symbol, timestamp)
        DO UPDATE SET
          price = EXCLUDED.price,
          block_number = EXCLUDED.block_number,
          confidence = EXCLUDED.confidence,
          metadata = EXCLUDED.metadata`,
        [
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
        ],
      );
    }

    logger.debug(`Wrote ${records.length} price records to database`);
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

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs)),
  ]);
}

// ============================================================================
// Retry Utility
// ============================================================================

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelayMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {},
): Promise<T> {
  const { maxRetries = 3, retryDelayMs = 1000, onRetry } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        onRetry?.(attempt, lastError);
        await sleep(retryDelayMs * attempt); // Exponential backoff
      }
    }
  }

  throw lastError;
}
