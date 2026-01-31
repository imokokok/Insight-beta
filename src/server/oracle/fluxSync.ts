/**
 * Flux Oracle Sync Service
 *
 * Flux 预言机数据同步服务
 */

import { query } from '@/server/db';
import { logger } from '@/lib/logger';
import {
  FluxClient,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  FLUX_ASSETS,
  type FluxSupportedChain,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type FluxPriceData,
} from '@/lib/blockchain/fluxOracle';
import {
  getUnifiedInstance,
  updateSyncState,
  recordSyncError,
} from '@/server/oracle/unifiedConfig';
import type { PriceFeedRecord } from '@/lib/types/unifiedOracleTypes';

const SYNC_CONFIG = {
  defaultIntervalMs: 60_000,
  maxRetries: 3,
  batchSize: 20,
};

interface SyncState {
  isRunning: boolean;
  lastSyncAt: Date | null;
  lastPrice: number | null;
  consecutiveErrors: number;
}

const syncStates = new Map<string, SyncState>();
const syncIntervals = new Map<string, NodeJS.Timeout>();

export async function startFluxSync(instanceId: string): Promise<void> {
  if (syncIntervals.has(instanceId)) {
    logger.warn(`Flux sync already running for instance ${instanceId}`);
    return;
  }

  const instance = await getUnifiedInstance(instanceId);
  if (!instance) {
    throw new Error(`Instance ${instanceId} not found`);
  }

  if (instance.protocol !== 'flux') {
    throw new Error(`Instance ${instanceId} is not a Flux instance`);
  }

  syncStates.set(instanceId, {
    isRunning: false,
    lastSyncAt: null,
    lastPrice: null,
    consecutiveErrors: 0,
  });

  await syncFluxInstance(instanceId);

  const intervalMs = instance.config.syncIntervalMs || SYNC_CONFIG.defaultIntervalMs;
  const interval = setInterval(async () => {
    try {
      await syncFluxInstance(instanceId);
    } catch (error) {
      logger.error(`Scheduled Flux sync failed for instance ${instanceId}`, { error });
    }
  }, intervalMs);

  syncIntervals.set(instanceId, interval);

  logger.info(`Flux sync started for instance ${instanceId}`, {
    intervalMs,
    chain: instance.chain,
  });
}

export function stopFluxSync(instanceId: string): void {
  const interval = syncIntervals.get(instanceId);
  if (interval) {
    clearInterval(interval);
    syncIntervals.delete(instanceId);
    syncStates.delete(instanceId);
    logger.info(`Flux sync stopped for instance ${instanceId}`);
  }
}

async function syncFluxInstance(instanceId: string): Promise<void> {
  const state = syncStates.get(instanceId);
  if (state?.isRunning) {
    logger.warn(`Flux sync already in progress for instance ${instanceId}`);
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

    const client = new FluxClient(instance.chain as FluxSupportedChain, {
      rpcUrl: instance.config.rpcUrl,
    });

    // 获取价格
    const priceData = await client.fetchPriceFromAPI(instance.config.symbol || 'ETH/USD');

    if (!priceData) {
      throw new Error('No price fetched from Flux');
    }

    // 插入价格数据
    const record: PriceFeedRecord = {
      protocol: 'flux',
      chain: instance.chain,
      instanceId,
      symbol: instance.config.symbol || 'ETH/USD',
      baseAsset: (instance.config.symbol || 'ETH/USD').split('/')[0] || 'ETH',
      quoteAsset: (instance.config.symbol || 'ETH/USD').split('/')[1] || 'USD',
      price: priceData.formattedPrice,
      timestamp: new Date(priceData.timestamp * 1000),
      blockNumber: null,
      confidence: 0.8,
      source: 'flux-api',
      metadata: {
        decimals: priceData.decimals,
        roundId: priceData.roundId.toString(),
        answeredInRound: priceData.answeredInRound.toString(),
      },
    };

    await insertPriceFeed(record);

    const durationMs = Date.now() - startTime;
    await updateSyncState(instanceId, {
      status: 'healthy',
      lastSyncAt: new Date(),
      lastSyncDurationMs: durationMs,
      errorMessage: null,
    });

    if (state) {
      state.lastSyncAt = new Date();
      state.consecutiveErrors = 0;
      state.lastPrice = priceData.formattedPrice;
    }

    logger.info(`Flux sync completed for instance ${instanceId}`, {
      durationMs,
      price: priceData.formattedPrice,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    await updateSyncState(instanceId, {
      status: 'error',
      lastSyncAt: new Date(),
      lastSyncDurationMs: durationMs,
      errorMessage,
    });

    await recordSyncError(instanceId, errorMessage, 'flux');

    if (state) {
      state.consecutiveErrors++;
    }

    logger.error(`Flux sync failed for instance ${instanceId}`, {
      error: errorMessage,
      durationMs,
    });

    if (state && state.consecutiveErrors >= SYNC_CONFIG.maxRetries) {
      logger.error(`Stopping Flux sync for instance ${instanceId} due to consecutive errors`);
      stopFluxSync(instanceId);
    }

    throw error;
  } finally {
    if (state) {
      state.isRunning = false;
    }
  }
}

async function insertPriceFeed(record: PriceFeedRecord): Promise<void> {
  const sql = `
    INSERT INTO unified_price_feeds (
      protocol, chain, instance_id, symbol, base_asset, quote_asset,
      price, timestamp, block_number, confidence, source, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (protocol, chain, symbol, timestamp)
    DO UPDATE SET
      price = EXCLUDED.price,
      confidence = EXCLUDED.confidence,
      metadata = EXCLUDED.metadata
  `;

  await query(sql, [
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
  ]);

  logger.debug(`Inserted Flux price record for ${record.symbol}`);
}

export function getFluxSyncStatus(instanceId: string) {
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

export function stopAllFluxSyncs(): void {
  for (const [instanceId] of syncIntervals) {
    stopFluxSync(instanceId);
  }
  logger.info('All Flux syncs stopped');
}

export async function initializeFluxSyncs(): Promise<void> {
  try {
    const result = await query(
      `SELECT id FROM unified_oracle_instances WHERE protocol = 'flux' AND enabled = true`
    );

    for (const row of result.rows) {
      try {
        await startFluxSync(row.id);
      } catch (error) {
        logger.error(`Failed to auto-start Flux sync for instance ${row.id}`, { error });
      }
    }

    logger.info(`Auto-started ${result.rows.length} Flux sync instances`);
  } catch (error) {
    logger.error('Failed to initialize Flux syncs', { error });
  }
}
