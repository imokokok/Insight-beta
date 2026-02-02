/**
 * API3 Sync Module
 *
 * API3 价格喂价同步模块
 * 负责定时同步价格数据到数据库
 */

import { logger } from '@/lib/logger';
import { query } from '@/server/db';
import { createAPI3Client, getAvailableAPI3Symbols } from '@/lib/blockchain/api3Oracle';
import type {
  SupportedChain,
  UnifiedPriceFeed,
  UnifiedSyncState,
  OracleProtocol,
} from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// 同步配置
// ============================================================================

const SYNC_CONFIG = {
  // 默认同步间隔（毫秒）
  defaultIntervalMs: 60000, // 1分钟

  // 批量插入大小
  batchSize: 100,

  // 价格变化阈值（触发更新）
  priceChangeThreshold: 0.001, // 0.1%

  // 数据保留时间
  dataRetentionDays: 90,
};

// ============================================================================
// API3 Sync Manager
// ============================================================================

export class API3SyncManager {
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: Map<string, boolean> = new Map();
  private lastPrices: Map<string, number> = new Map();

  /**
   * 启动实例同步
   */
  async startSync(instanceId: string): Promise<void> {
    if (this.isRunning.get(instanceId)) {
      logger.warn(`API3 sync already running for instance ${instanceId}`);
      return;
    }

    // 获取实例配置
    const instance = await this.getInstanceConfig(instanceId);
    if (!instance) {
      logger.error(`Instance ${instanceId} not found`);
      return;
    }

    if (!instance.enabled) {
      logger.info(`Instance ${instanceId} is disabled, skipping sync`);
      return;
    }

    logger.info(`Starting API3 sync for instance ${instanceId}`, {
      chain: instance.chain,
    });

    this.isRunning.set(instanceId, true);

    // 立即执行一次同步
    await this.syncInstance(instanceId);

    // 设置定时同步
    const intervalMs = instance.config.syncIntervalMs || SYNC_CONFIG.defaultIntervalMs;
    const interval = setInterval(() => {
      this.syncInstance(instanceId).catch((error) => {
        logger.error(`Scheduled sync failed for instance ${instanceId}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }, intervalMs);

    this.syncIntervals.set(instanceId, interval);

    // 更新同步状态
    await this.updateSyncState(instanceId, {
      status: 'healthy',
      lastSyncAt: new Date().toISOString(),
    });
  }

  /**
   * 停止实例同步
   */
  stopSync(instanceId: string): void {
    const interval = this.syncIntervals.get(instanceId);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(instanceId);
    }
    this.isRunning.set(instanceId, false);
    logger.info(`Stopped API3 sync for instance ${instanceId}`);
  }

  /**
   * 停止所有同步
   */
  stopAllSync(): void {
    for (const [instanceId, interval] of this.syncIntervals.entries()) {
      clearInterval(interval);
      this.isRunning.set(instanceId, false);
      logger.info(`Stopped API3 sync for instance ${instanceId}`);
    }
    this.syncIntervals.clear();
  }

  /**
   * 同步单个实例
   */
  private async syncInstance(instanceId: string): Promise<void> {
    const startTime = Date.now();

    try {
      const instance = await this.getInstanceConfig(instanceId);
      if (!instance) {
        throw new Error(`Instance ${instanceId} not found`);
      }

      // 创建 API3 客户端
      const client = createAPI3Client({
        chain: instance.chain as SupportedChain,
        rpcUrl: instance.config.rpcUrl,
        ...instance.config.protocolConfig,
      });

      // API3 使用 API 获取数据，不需要区块号
      const blockNumber = 0;

      // 获取所有可用价格喂价
      const symbols = getAvailableAPI3Symbols();

      if (symbols.length === 0) {
        logger.warn(`No available feeds for API3 on ${instance.chain}`);
        return;
      }

      logger.debug(`Syncing ${symbols.length} feeds for API3 instance ${instanceId}`);

      // 批量获取价格
      const priceFeeds = await client.getMultiplePrices(symbols);

      // 保存到数据库
      await this.savePriceFeeds(instanceId, priceFeeds);

      // 检查价格变化并保存更新记录
      await this.savePriceUpdates(instanceId, priceFeeds);

      // 更新同步状态
      const duration = Date.now() - startTime;
      await this.updateSyncState(instanceId, {
        status: 'healthy',
        lastProcessedBlock: Number(blockNumber),
        lastSyncAt: new Date().toISOString(),
        lastSyncDurationMs: duration,
        consecutiveFailures: 0,
      });

      logger.info(`API3 sync completed for instance ${instanceId}`, {
        feedsCount: priceFeeds.length,
        duration: `${duration}ms`,
        blockNumber: Number(blockNumber),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`API3 sync failed for instance ${instanceId}`, {
        error: errorMessage,
      });

      // 更新同步状态
      const currentState = await this.getSyncState(instanceId);
      await this.updateSyncState(instanceId, {
        status: 'error',
        consecutiveFailures: (currentState?.consecutiveFailures || 0) + 1,
        lastError: errorMessage,
        lastErrorAt: new Date().toISOString(),
      });

      throw error;
    }
  }

  /**
   * 保存价格喂价到数据库
   */
  private async savePriceFeeds(instanceId: string, feeds: UnifiedPriceFeed[]): Promise<void> {
    if (feeds.length === 0) return;

    const values = feeds.map((feed) => [
      feed.id,
      instanceId,
      feed.protocol,
      feed.chain,
      feed.symbol,
      feed.baseAsset,
      feed.quoteAsset,
      feed.price,
      feed.priceRaw,
      feed.decimals,
      feed.timestamp,
      feed.blockNumber || 0,
      feed.confidence || null,
      feed.sources || null,
      feed.isStale,
      feed.stalenessSeconds || 0,
      feed.txHash || null,
      feed.logIndex || null,
    ]);

    // 批量插入
    for (let i = 0; i < values.length; i += SYNC_CONFIG.batchSize) {
      const batch = values.slice(i, i + SYNC_CONFIG.batchSize);

      const placeholders = batch
        .map(
          (_, idx) =>
            `($${idx * 18 + 1}, $${idx * 18 + 2}, $${idx * 18 + 3}, $${idx * 18 + 4},
            $${idx * 18 + 5}, $${idx * 18 + 6}, $${idx * 18 + 7}, $${idx * 18 + 8},
            $${idx * 18 + 9}, $${idx * 18 + 10}, $${idx * 18 + 11}, $${idx * 18 + 12},
            $${idx * 18 + 13}, $${idx * 18 + 14}, $${idx * 18 + 15}, $${idx * 18 + 16},
            $${idx * 18 + 17}, $${idx * 18 + 18})`,
        )
        .join(',');

      const flatValues = batch.flat();

      await query(
        `INSERT INTO unified_price_feeds (
          id, instance_id, protocol, chain, symbol, base_asset, quote_asset,
          price, price_raw, decimals, timestamp, block_number, confidence,
          sources, is_stale, staleness_seconds, tx_hash, log_index
        ) VALUES ${placeholders}
        ON CONFLICT (id) DO UPDATE SET
          price = EXCLUDED.price,
          price_raw = EXCLUDED.price_raw,
          timestamp = EXCLUDED.timestamp,
          block_number = EXCLUDED.block_number,
          is_stale = EXCLUDED.is_stale,
          staleness_seconds = EXCLUDED.staleness_seconds,
          updated_at = NOW()`,
        flatValues,
      );
    }
  }

  /**
   * 保存价格更新记录
   */
  private async savePriceUpdates(instanceId: string, feeds: UnifiedPriceFeed[]): Promise<void> {
    for (const feed of feeds) {
      const lastPrice = this.lastPrices.get(feed.symbol);

      // 如果是新价格或价格变化超过阈值
      if (lastPrice !== undefined) {
        const priceChange = Math.abs(feed.price - lastPrice) / lastPrice;

        if (priceChange >= SYNC_CONFIG.priceChangeThreshold) {
          const updateId = `update-${feed.id}`;

          await query(
            `INSERT INTO unified_price_updates (
              id, feed_id, instance_id, protocol, previous_price,
              current_price, price_change, price_change_percent, timestamp, block_number
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO NOTHING`,
            [
              updateId,
              feed.id,
              instanceId,
              feed.protocol,
              lastPrice,
              feed.price,
              feed.price - lastPrice,
              priceChange * 100,
              feed.timestamp,
              feed.blockNumber || 0,
            ],
          );
        }
      }

      // 更新缓存的价格
      this.lastPrices.set(feed.symbol, feed.price);
    }
  }

  /**
   * 获取实例配置
   */
  private async getInstanceConfig(instanceId: string): Promise<{
    id: string;
    chain: SupportedChain;
    enabled: boolean;
    config: {
      rpcUrl: string;
      protocolConfig?: Record<string, unknown>;
      syncIntervalMs?: number;
    };
  } | null> {
    const result = await query(
      `SELECT id, chain, enabled, config, protocol_config
       FROM unified_oracle_instances
       WHERE id = $1 AND protocol = 'api3'`,
      [instanceId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id as string,
      chain: row.chain as SupportedChain,
      enabled: row.enabled as boolean,
      config: {
        rpcUrl: (row.config as Record<string, string>)?.rpcUrl || '',
        protocolConfig: (row.protocol_config as Record<string, unknown>) || {},
        syncIntervalMs: (row.config as Record<string, number>)?.syncIntervalMs,
      },
    };
  }

  /**
   * 获取同步状态
   */
  private async getSyncState(instanceId: string): Promise<Partial<UnifiedSyncState> | null> {
    const result = await query(`SELECT * FROM unified_sync_state WHERE instance_id = $1`, [
      instanceId,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;
    return {
      instanceId: row.instance_id as string,
      protocol: row.protocol as OracleProtocol,
      chain: row.chain as SupportedChain,
      lastProcessedBlock: row.last_processed_block as number,
      status: row.status as 'healthy' | 'lagging' | 'stalled' | 'error',
      consecutiveFailures: row.consecutive_failures as number,
      lastError: row.last_error as string,
      lastErrorAt: row.last_error_at as string,
    };
  }

  /**
   * 更新同步状态
   */
  private async updateSyncState(
    instanceId: string,
    updates: Partial<UnifiedSyncState>,
  ): Promise<void> {
    const instance = await this.getInstanceConfig(instanceId);
    if (!instance) return;

    const fields: string[] = [];
    const values: (string | number | boolean | Date | null | undefined | string[] | number[])[] =
      [];
    let paramIndex = 1;

    if (updates.lastProcessedBlock !== undefined) {
      fields.push(`last_processed_block = $${paramIndex++}`);
      values.push(updates.lastProcessedBlock);
    }
    if (updates.lastSyncAt !== undefined) {
      fields.push(`last_sync_at = $${paramIndex++}`);
      values.push(updates.lastSyncAt);
    }
    if (updates.lastSyncDurationMs !== undefined) {
      fields.push(`last_sync_duration_ms = $${paramIndex++}`);
      values.push(updates.lastSyncDurationMs);
    }
    if (updates.avgSyncDurationMs !== undefined) {
      fields.push(`avg_sync_duration_ms = $${paramIndex++}`);
      values.push(updates.avgSyncDurationMs);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.consecutiveFailures !== undefined) {
      fields.push(`consecutive_failures = $${paramIndex++}`);
      values.push(updates.consecutiveFailures);
    }
    if (updates.lastError !== undefined) {
      fields.push(`last_error = $${paramIndex++}`);
      values.push(updates.lastError);
    }
    if (updates.lastErrorAt !== undefined) {
      fields.push(`last_error_at = $${paramIndex++}`);
      values.push(updates.lastErrorAt);
    }

    if (fields.length === 0) return;

    fields.push(`updated_at = NOW()`);
    values.push(instanceId);

    await query(
      `INSERT INTO unified_sync_state (
        instance_id, protocol, chain, last_processed_block, status, consecutive_failures
      ) VALUES ($1, 'api3', $2, 0, 'healthy', 0)
      ON CONFLICT (instance_id) DO UPDATE SET
        ${fields.join(', ')}`,
      [instanceId, instance.chain, ...values],
    );
  }

  /**
   * 清理过期数据
   */
  async cleanupOldData(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - SYNC_CONFIG.dataRetentionDays);

    logger.info(`Cleaning up API3 data older than ${SYNC_CONFIG.dataRetentionDays} days`);

    // 清理旧的价格喂价数据
    const feedsResult = await query(
      `DELETE FROM unified_price_feeds
       WHERE protocol = 'api3' AND timestamp < $1
       RETURNING id`,
      [cutoffDate.toISOString()],
    );

    // 清理旧的价格更新记录
    const updatesResult = await query(
      `DELETE FROM unified_price_updates
       WHERE protocol = 'api3' AND timestamp < $1
       RETURNING id`,
      [cutoffDate.toISOString()],
    );

    logger.info(`API3 cleanup completed`, {
      deletedFeeds: feedsResult.rowCount,
      deletedUpdates: updatesResult.rowCount,
    });
  }
}

// ============================================================================
// 单例导出
// ============================================================================

export const api3SyncManager = new API3SyncManager();

// ============================================================================
// 便捷函数
// ============================================================================

export async function startAPI3Sync(instanceId: string): Promise<void> {
  return api3SyncManager.startSync(instanceId);
}

export function stopAPI3Sync(instanceId: string): void {
  return api3SyncManager.stopSync(instanceId);
}

export function stopAllAPI3Sync(): void {
  return api3SyncManager.stopAllSync();
}

export async function cleanupAPI3Data(): Promise<void> {
  return api3SyncManager.cleanupOldData();
}
