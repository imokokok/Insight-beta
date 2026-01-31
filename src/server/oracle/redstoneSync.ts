/**
 * RedStone Oracle Sync Service
 *
 * RedStone 预言机数据同步服务
 * 支持从 RedStone API 获取价格数据并存储到数据库
 */

import { query } from '@/server/db';
import { logger } from '@/lib/logger';
import {
  RedStoneClient,
  REDSTONE_FEED_IDS,
  type RedStoneSupportedChain,
  type RedStonePriceData,
} from '@/lib/blockchain/redstoneOracle';
import {
  getUnifiedInstance,
} from '@/server/oracle/unifiedConfig';

// TODO: These functions need to be implemented in unifiedConfig.ts
// import { updateSyncState, recordSyncError } from '@/server/oracle/unifiedConfig';
const updateSyncState = async (_instanceId: string, _updates: unknown): Promise<void> => {
  logger.warn('updateSyncState not implemented');
};
const recordSyncError = async (_instanceId: string, _error: string, _protocol?: string): Promise<void> => {
  logger.warn('recordSyncError not implemented');
};

// Local type definition until properly exported
type PriceFeedRecord = {
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
};

// ============================================================================
// Configuration
// ============================================================================

const SYNC_CONFIG = {
  defaultIntervalMs: 60_000, // 1 minute
  maxRetries: 3,
  retryDelayMs: 5_000,
  batchSize: 20,
};

// ============================================================================
// Sync Manager
// ============================================================================

interface SyncState {
  isRunning: boolean;
  lastSyncAt: Date | null;
  lastPrice: number | null;
  consecutiveErrors: number;
}

const syncStates = new Map<string, SyncState>();
const syncIntervals = new Map<string, NodeJS.Timeout>();

// ============================================================================
// Core Sync Functions
// ============================================================================

/**
 * 启动 RedStone 同步任务
 */
export async function startRedStoneSync(instanceId: string): Promise<void> {
  if (syncIntervals.has(instanceId)) {
    logger.warn(`RedStone sync already running for instance ${instanceId}`);
    return;
  }

  const instance = await getUnifiedInstance(instanceId);
  if (!instance) {
    throw new Error(`Instance ${instanceId} not found`);
  }

  if (instance.protocol !== 'redstone') {
    throw new Error(`Instance ${instanceId} is not a RedStone instance`);
  }

  // 初始化同步状态
  syncStates.set(instanceId, {
    isRunning: false,
    lastSyncAt: null,
    lastPrice: null,
    consecutiveErrors: 0,
  });

  // 立即执行一次同步
  await syncRedStoneInstance(instanceId);

  // 设置定时同步
  const intervalMs = instance.config.syncIntervalMs || SYNC_CONFIG.defaultIntervalMs;
  const interval = setInterval(async () => {
    try {
      await syncRedStoneInstance(instanceId);
    } catch (error) {
      logger.error(`Scheduled RedStone sync failed for instance ${instanceId}`, { error });
    }
  }, intervalMs);

  syncIntervals.set(instanceId, interval);

  logger.info(`RedStone sync started for instance ${instanceId}`, {
    intervalMs,
    chain: instance.chain,
  });
}

/**
 * 停止 RedStone 同步任务
 */
export function stopRedStoneSync(instanceId: string): void {
  const interval = syncIntervals.get(instanceId);
  if (interval) {
    clearInterval(interval);
    syncIntervals.delete(instanceId);
    syncStates.delete(instanceId);
    logger.info(`RedStone sync stopped for instance ${instanceId}`);
  }
}

/**
 * 同步单个 RedStone 实例
 */
async function syncRedStoneInstance(instanceId: string): Promise<void> {
  const state = syncStates.get(instanceId);
  if (state?.isRunning) {
    logger.warn(`RedStone sync already in progress for instance ${instanceId}`);
    return;
  }

  if (state) {
    state.isRunning = true;
  }

  const startTime = Date.now();

  try {
    const instance = await getUnifiedInstance(instanceId);
    if (!instance || !instance.enabled) {
      throw new Error(`Instance ${instanceId} not found or disabled`);
    }

    const client = new RedStoneClient(instance.chain as RedStoneSupportedChain, {
      rpcUrl: instance.config.rpcUrl,
    });

    // 获取配置的 Feed IDs 或使用默认值
    const feedIds = (instance.config as { feedIds?: string[] }).feedIds || Object.keys(REDSTONE_FEED_IDS);

    // 批量获取价格
    const prices = await client.fetchMultiplePrices(feedIds);

    if (prices.size === 0) {
      throw new Error('No prices fetched from RedStone');
    }

    // 批量插入价格数据
    const records: PriceFeedRecord[] = [];
    for (const [feedId, priceData] of prices) {
      const symbol = REDSTONE_FEED_IDS[feedId] || feedId;
      
      records.push({
        protocol: 'redstone',
        chain: instance.chain,
        instanceId,
        symbol,
        baseAsset: symbol.split('/')[0] || symbol,
        quoteAsset: symbol.split('/')[1] || 'USD',
        price: priceData.formattedPrice,
        timestamp: new Date(priceData.timestamp * 1000),
        blockNumber: null, // RedStone 不依赖区块号
        confidence: 0.9, // RedStone 默认置信度
        source: 'redstone-api',
        metadata: {
          decimals: priceData.decimals,
          feedId,
        },
      });
    }

    // 批量插入数据库
    await batchInsertPriceFeeds(records);

    // 更新同步状态
    const durationMs = Date.now() - startTime;
    await updateSyncState(instanceId, {
      status: 'healthy',
      lastSyncAt: new Date(),
      lastSyncDurationMs: durationMs,
      errorMessage: null,
    });

    // 更新本地状态
    if (state) {
      state.lastSyncAt = new Date();
      state.consecutiveErrors = 0;
      const firstPrice = prices.values().next().value as RedStonePriceData | undefined;
      if (firstPrice) {
        state.lastPrice = firstPrice.formattedPrice;
      }
    }

    logger.info(`RedStone sync completed for instance ${instanceId}`, {
      durationMs,
      pricesCount: prices.size,
      feeds: Array.from(prices.keys()),
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 更新同步状态为错误
    await updateSyncState(instanceId, {
      status: 'error',
      lastSyncAt: new Date(),
      lastSyncDurationMs: durationMs,
      errorMessage,
    });

    // 记录错误
    await recordSyncError(instanceId, errorMessage, 'redstone');

    // 更新本地状态
    if (state) {
      state.consecutiveErrors++;
    }

    logger.error(`RedStone sync failed for instance ${instanceId}`, {
      error: errorMessage,
      durationMs,
      consecutiveErrors: state?.consecutiveErrors,
    });

    // 如果连续错误过多，停止同步
    if (state && state.consecutiveErrors >= SYNC_CONFIG.maxRetries) {
      logger.error(`Stopping RedStone sync for instance ${instanceId} due to consecutive errors`);
      stopRedStoneSync(instanceId);
    }

    throw error;
  } finally {
    if (state) {
      state.isRunning = false;
    }
  }
}

/**
 * 批量插入价格数据
 */
async function batchInsertPriceFeeds(records: PriceFeedRecord[]): Promise<void> {
  if (records.length === 0) return;

  const BATCH_SIZE = SYNC_CONFIG.batchSize;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    const values: (string | number | boolean | Date | null | undefined | string[] | number[])[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    for (const record of batch) {
      placeholders.push(`(
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}
      )`);
      values.push(
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
        JSON.stringify(record.metadata),
      );
    }

    const sql = `
      INSERT INTO unified_price_feeds (
        protocol, chain, instance_id, symbol, base_asset, quote_asset,
        price, timestamp, block_number, confidence, source, metadata
      ) VALUES ${placeholders.join(', ')}
      ON CONFLICT (protocol, chain, symbol, timestamp)
      DO UPDATE SET
        price = EXCLUDED.price,
        confidence = EXCLUDED.confidence,
        metadata = EXCLUDED.metadata
    `;

    await query(sql, values);
  }

  logger.debug(`Inserted ${records.length} RedStone price records`);
}

// ============================================================================
// Management Functions
// ============================================================================

/**
 * 获取 RedStone 同步状态
 */
export function getRedStoneSyncStatus(instanceId: string): {
  isRunning: boolean;
  isScheduled: boolean;
  lastSyncAt: Date | null;
  lastPrice: number | null;
  consecutiveErrors: number;
} {
  const state = syncStates.get(instanceId);
  const isScheduled = syncIntervals.has(instanceId);

  return {
    isRunning: state?.isRunning || false,
    isScheduled,
    lastSyncAt: state?.lastSyncAt || null,
    lastPrice: state?.lastPrice || null,
    consecutiveErrors: state?.consecutiveErrors || 0,
  };
}

/**
 * 获取所有活跃的 RedStone 同步任务
 */
export function getActiveRedStoneSyncs(): Array<{
  instanceId: string;
  chain: string;
  status: string;
  lastSyncAt: Date | null;
}> {
  const active: Array<{
    instanceId: string;
    chain: string;
    status: string;
    lastSyncAt: Date | null;
  }> = [];

  for (const [instanceId, state] of syncStates) {
    active.push({
      instanceId,
      chain: 'unknown', // Would need to fetch from instance
      status: state.isRunning ? 'running' : 'idle',
      lastSyncAt: state.lastSyncAt,
    });
  }

  return active;
}

/**
 * 停止所有 RedStone 同步任务
 */
export function stopAllRedStoneSyncs(): void {
  for (const [instanceId] of syncIntervals) {
    stopRedStoneSync(instanceId);
  }
  logger.info('All RedStone syncs stopped');
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * 启动时自动启动所有启用的 RedStone 实例
 */
export async function initializeRedStoneSyncs(): Promise<void> {
  try {
    const result = await query(
      `SELECT id FROM unified_oracle_instances WHERE protocol = 'redstone' AND enabled = true`
    );

    for (const row of result.rows) {
      try {
        await startRedStoneSync(row.id);
      } catch (error) {
        logger.error(`Failed to auto-start RedStone sync for instance ${row.id}`, { error });
      }
    }

    logger.info(`Auto-started ${result.rows.length} RedStone sync instances`);
  } catch (error) {
    logger.error('Failed to initialize RedStone syncs', { error });
  }
}
