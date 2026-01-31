/**
 * Switchboard Sync Service
 *
 * Switchboard 数据同步服务
 */

import { query } from '@/server/db';
import { logger } from '@/lib/logger';
import { SwitchboardClient } from '@/lib/blockchain/switchboardOracle';
import type { SupportedChain, UnifiedPriceFeed } from '@/lib/types/unifiedOracleTypes';

export interface SwitchboardSyncConfig {
  instanceId: string;
  chain: SupportedChain;
  rpcUrl: string;
  apiEndpoint?: string;
  apiKey?: string;
  queueAddress?: string;
  symbols: string[];
  intervalMs: number;
}

export class SwitchboardSyncService {
  private client: SwitchboardClient;
  private config: SwitchboardSyncConfig;
  private isRunning: boolean = false;
  private syncInterval?: NodeJS.Timeout;
  private lastSyncAt: Date | null = null;
  private lastError: string | null = null;

  constructor(config: SwitchboardSyncConfig) {
    this.config = config;
    this.client = new SwitchboardClient({
      chain: config.chain,
      rpcUrl: config.rpcUrl,
      apiEndpoint: config.apiEndpoint,
      apiKey: config.apiKey,
      queueAddress: config.queueAddress,
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    logger.info('Switchboard sync service starting', {
      instanceId: this.config.instanceId,
      chain: this.config.chain,
    });

    // 立即执行一次同步
    await this.sync();

    // 设置定时同步
    this.syncInterval = setInterval(async () => {
      await this.sync();
    }, this.config.intervalMs);

    // 更新同步状态
    await this.updateSyncState('active');
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }

    logger.info('Switchboard sync service stopped', {
      instanceId: this.config.instanceId,
    });
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

      logger.debug('Switchboard sync completed', {
        instanceId: this.config.instanceId,
        pricesCount: prices.length,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      await this.updateSyncState('error', this.lastError);

      logger.error('Switchboard sync failed', {
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
        price.blockNumber,
        price.confidence,
        price.sources,
        price.isStale,
        price.stalenessSeconds,
        price.txHash,
        price.logIndex,
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
      [
        this.config.instanceId,
        'switchboard',
        status,
        this.lastSyncAt,
        error || null,
      ]
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

// 同步服务管理器
const syncServices: Map<string, SwitchboardSyncService> = new Map();

export async function startSwitchboardSync(
  config: SwitchboardSyncConfig
): Promise<SwitchboardSyncService> {
  // 停止现有的同步服务
  const existing = syncServices.get(config.instanceId);
  if (existing) {
    existing.stop();
  }

  // 创建新的同步服务
  const service = new SwitchboardSyncService(config);
  await service.start();

  syncServices.set(config.instanceId, service);
  return service;
}

export function stopSwitchboardSync(instanceId: string): void {
  const service = syncServices.get(instanceId);
  if (service) {
    service.stop();
    syncServices.delete(instanceId);
  }
}

export function getSwitchboardSyncStatus(instanceId: string): {
  isRunning: boolean;
  lastSyncAt: Date | null;
  lastError: string | null;
} | null {
  const service = syncServices.get(instanceId);
  return service ? service.getStatus() : null;
}
