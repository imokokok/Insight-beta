/**
 * Band Protocol Sync Service
 *
 * Band Protocol 数据同步服务
 */

import { query } from '@/server/db';
import { logger } from '@/lib/logger';
import { BandClient } from '@/lib/blockchain/bandOracle';
import type { SupportedChain, UnifiedPriceFeed } from '@/lib/types/unifiedOracleTypes';

export interface BandSyncConfig {
  instanceId: string;
  chain: SupportedChain;
  rpcUrl: string;
  bandEndpoint?: string;
  symbols: string[];
  intervalMs: number;
}

export class BandSyncService {
  private client: BandClient;
  private config: BandSyncConfig;
  private isRunning: boolean = false;
  private syncInterval?: NodeJS.Timeout;
  private lastSyncAt: Date | null = null;
  private lastError: string | null = null;

  constructor(config: BandSyncConfig) {
    this.config = config;
    this.client = new BandClient({
      chain: config.chain,
      rpcUrl: config.rpcUrl,
      bandEndpoint: config.bandEndpoint,
    });
    logger.info('BandSyncService initialized', { instanceId: config.instanceId });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Band sync already running', { instanceId: this.config.instanceId });
      return;
    }

    this.isRunning = true;
    logger.info('Starting Band sync', { instanceId: this.config.instanceId });

    // 立即执行一次同步
    await this.sync();

    // 设置定时同步
    this.syncInterval = setInterval(() => {
      this.sync();
    }, this.config.intervalMs);
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }

    logger.info('Band sync stopped', { instanceId: this.config.instanceId });
  }

  private async sync(): Promise<void> {
    const startTime = Date.now();

    try {
      // 获取多个价格
      const prices = await this.client.getMultiplePrices(this.config.symbols);

      // 保存到数据库
      for (const price of prices) {
        await this.savePrice(price);
      }

      this.lastSyncAt = new Date();
      this.lastError = null;

      // 更新同步状态
      await this.updateSyncState('healthy');

      logger.debug('Band sync completed', {
        instanceId: this.config.instanceId,
        pricesCount: prices.length,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      await this.updateSyncState('error', this.lastError);

      logger.error('Band sync failed', {
        error,
        instanceId: this.config.instanceId,
      });
    }
  }

  private async savePrice(price: UnifiedPriceFeed): Promise<void> {
    await query(
      `
      INSERT INTO unified_price_feeds (
        id, instance_id, protocol, chain, symbol, base_asset, quote_asset, 
        price, price_raw, decimals, timestamp, block_number, 
        confidence, sources, is_stale, staleness_seconds, tx_hash, log_index, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
      ON CONFLICT (id) DO UPDATE SET
        price = EXCLUDED.price,
        timestamp = EXCLUDED.timestamp,
        block_number = EXCLUDED.block_number,
        is_stale = EXCLUDED.is_stale,
        updated_at = NOW()
      `,
      [
        price.id,
        this.config.instanceId,
        price.protocol,
        price.chain,
        price.symbol,
        price.baseAsset,
        price.quoteAsset,
        price.price,
        price.priceRaw,
        price.decimals,
        price.timestamp,
        price.blockNumber || null,
        price.confidence,
        price.sources,
        price.isStale,
        price.stalenessSeconds,
        price.txHash,
        price.logIndex,
      ]
    );
  }

  private async updateSyncState(status: string, error?: string | null): Promise<void> {
    await query(
      `
      INSERT INTO unified_sync_state (
        instance_id, protocol, status, last_sync_at, last_error, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (instance_id) DO UPDATE SET
        status = EXCLUDED.status,
        last_sync_at = EXCLUDED.last_sync_at,
        last_error = EXCLUDED.last_error,
        updated_at = NOW()
      `,
      [this.config.instanceId, 'band', status, this.lastSyncAt, error || null]
    );
  }

  getStatus(): {
    isRunning: boolean;
    lastSyncAt: Date | null;
    lastError: string | null;
  } {
    return {
      isRunning: this.isRunning,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
    };
  }
}

// ============================================================================
// 同步管理器
// ============================================================================

class BandSyncManager {
  private syncs: Map<string, BandSyncService> = new Map();

  async startSync(config: BandSyncConfig): Promise<void> {
    // 如果已存在，先停止
    if (this.syncs.has(config.instanceId)) {
      this.syncs.get(config.instanceId)?.stop();
    }

    const sync = new BandSyncService(config);
    await sync.start();
    this.syncs.set(config.instanceId, sync);

    logger.info('Band sync started', { instanceId: config.instanceId });
  }

  stopSync(instanceId: string): void {
    const sync = this.syncs.get(instanceId);
    if (sync) {
      sync.stop();
      this.syncs.delete(instanceId);
      logger.info('Band sync stopped', { instanceId });
    }
  }

  stopAllSync(): void {
    for (const [instanceId, sync] of this.syncs.entries()) {
      sync.stop();
      logger.info('Band sync stopped', { instanceId });
    }
    this.syncs.clear();
  }

  getSyncStatus(instanceId: string): ReturnType<BandSyncService['getStatus']> | null {
    return this.syncs.get(instanceId)?.getStatus() || null;
  }

  getAllSyncStatuses(): Array<{ instanceId: string; status: ReturnType<BandSyncService['getStatus']> }> {
    return Array.from(this.syncs.entries()).map(([instanceId, sync]) => ({
      instanceId,
      status: sync.getStatus(),
    }));
  }
}

export const bandSyncManager = new BandSyncManager();
