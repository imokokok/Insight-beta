/**
 * DIA Oracle Sync Service
 *
 * DIA 预言机数据同步服务
 * 支持从 DIA API 获取价格数据并存储到数据库
 */

import { query } from '@/server/db';
import { logger } from '@/lib/logger';
import {
  DIAClient,
  DIA_ASSETS,
  type DIASupportedChain,
  type DIAPriceData,
} from '@/lib/blockchain/diaOracle';
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
 * 启动 DIA 同步任务
 */
export async function startDIASync(instanceId: string): Promise<void> {
  if (syncIntervals.has(instanceId)) {
    logger.warn(`DIA sync already running for instance ${instanceId}`);
    return;
  }

  const instance = await getUnifiedInstance(instanceId);
  if (!instance) {
    throw new Error(`Instance ${instanceId} not found`);
  }

  if (instance.protocol !== 'dia') {
    throw new Error(`Instance ${instanceId} is not a DIA instance`);
  }

  // 初始化同步状态
  syncStates.set(instanceId, {
    isRunning: false,
    lastSyncAt: null,
    lastPrice: null,
    consecutiveErrors: 0,
  });

  // 立即执行一次同步
  await syncDIAInstance(instanceId);

  // 设置定时同步
  const intervalMs = instance.config.syncIntervalMs || SYNC_CONFIG.defaultIntervalMs;
  const interval = setInterval(async () => {
    try {
      await syncDIAInstance(instanceId);
    } catch (error) {
      logger.error(`Scheduled DIA sync failed for instance ${instanceId}`, { error });
    }
  }, intervalMs);

  syncIntervals.set(instanceId, interval);

  logger.info(`DIA sync started for instance ${instanceId}`, {
    intervalMs,
    chain: instance.chain,
  });
}

/**
 * 停止 DIA 同步任务
 */
export function stopDIASync(instanceId: string): void {
  const interval = syncIntervals.get(instanceId);
  if (interval) {
    clearInterval(interval);
    syncIntervals.delete(instanceId);
    syncStates.delete(instanceId);
    logger.info(`DIA sync stopped for instance ${instanceId}`);
  }
}

/**
 * 同步单个 DIA 实例
 */
async function syncDIAInstance(instanceId: string): Promise<void> {
  const state = syncStates.get(instanceId);
  if (state?.isRunning) {
    logger.warn(`DIA sync already in progress for instance ${instanceId}`);
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

    const client = new DIAClient(instance.chain as DIASupportedChain, {
      rpcUrl: instance.config.rpcUrl,
    });

    // 获取配置的资产列表或使用默认值
    const assets = (instance.config as { assets?: string[] }).assets || Object.values(DIA_ASSETS);

    // 批量获取价格
    const prices = await client.fetchMultiplePrices(assets);

    if (prices.size === 0) {
      throw new Error('No prices fetched from DIA');
    }

    // 批量插入价格数据
    const records: PriceFeedRecord[] = [];
    for (const [asset, priceData] of prices) {
      const symbol = Object.keys(DIA_ASSETS).find(
        (key) => DIA_ASSETS[key] === asset
      ) || `${asset}/USD`;

      records.push({
        protocol: 'dia',
        chain: instance.chain,
        instanceId,
        symbol,
        baseAsset: asset,
        quoteAsset: 'USD',
        price: priceData.formattedPrice,
        timestamp: new Date(priceData.timestamp * 1000),
        blockNumber: null,
        confidence: 0.85,
        source: priceData.source,
        metadata: {
          decimals: priceData.decimals,
          asset,
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
      const firstPrice = prices.values().next().value as DIAPriceData | undefined;
      if (firstPrice) {
        state.lastPrice = firstPrice.formattedPrice;
      }
    }

    logger.info(`DIA sync completed for instance ${instanceId}`, {
      durationMs,
      pricesCount: prices.size,
      assets: Array.from(prices.keys()),
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
    await recordSyncError(instanceId, errorMessage, 'dia');

    // 更新本地状态
    if (state) {
      state.consecutiveErrors++;
    }

    logger.error(`DIA sync failed for instance ${instanceId}`, {
      error: errorMessage,
      durationMs,
      consecutiveErrors: state?.consecutiveErrors,
    });

    // 如果连续错误过多，停止同步
    if (state && state.consecutiveErrors >= SYNC_CONFIG.maxRetries) {
      logger.error(`Stopping DIA sync for instance ${instanceId} due to consecutive errors`);
      stopDIASync(instanceId);
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

  logger.debug(`Inserted ${records.length} DIA price records`);
}

// ============================================================================
// Management Functions
// ============================================================================

/**
 * 获取 DIA 同步状态
 */
export function getDIASyncStatus(instanceId: string): {
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
 * 停止所有 DIA 同步任务
 */
export function stopAllDIASyncs(): void {
  for (const [instanceId] of syncIntervals) {
    stopDIASync(instanceId);
  }
  logger.info('All DIA syncs stopped');
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * 启动时自动启动所有启用的 DIA 实例
 */
export async function initializeDIASyncs(): Promise<void> {
  try {
    const result = await query(
      `SELECT id FROM unified_oracle_instances WHERE protocol = 'dia' AND enabled = true`
    );

    for (const row of result.rows) {
      try {
        await startDIASync(row.id);
      } catch (error) {
        logger.error(`Failed to auto-start DIA sync for instance ${row.id}`, { error });
      }
    }

    logger.info(`Auto-started ${result.rows.length} DIA sync instances`);
  } catch (error) {
    logger.error('Failed to initialize DIA syncs', { error });
  }
}
