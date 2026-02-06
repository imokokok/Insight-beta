/**
 * Base Sync Manager - 通用同步管理器基类
 *
 * 为所有预言机协议同步服务提供统一的抽象层
 * 消除 Chainlink/Pyth/Band 等同步服务的重复代码
 */

import { logger } from '@/lib/logger';
import { query } from '@/server/db';
import type {
  SupportedChain,
  UnifiedPriceFeed,
  UnifiedSyncState,
  OracleProtocol,
} from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// 同步配置
// ============================================================================

export interface SyncConfig {
  // 默认同步间隔（毫秒）
  defaultIntervalMs: number;

  // 批量插入大小
  batchSize: number;

  // 最大并发请求数
  maxConcurrency: number;

  // 价格变化阈值（触发更新记录）
  priceChangeThreshold: number;

  // 数据保留时间（天）
  dataRetentionDays: number;
}

// 默认配置
export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  defaultIntervalMs: 60000, // 1分钟
  batchSize: 100,
  maxConcurrency: 5,
  priceChangeThreshold: 0.001, // 0.1%
  dataRetentionDays: 90,
};

// ============================================================================
// 客户端接口定义
// ============================================================================

export interface IOracleClient {
  getBlockNumber(): Promise<bigint>;
  getPriceForSymbol(symbol: string): Promise<UnifiedPriceFeed | null>;
}

// ============================================================================
// 实例配置类型
// ============================================================================

export interface InstanceConfig {
  id: string;
  chain: SupportedChain;
  enabled: boolean;
  config: {
    rpcUrl: string;
    protocolConfig?: Record<string, unknown>;
    syncIntervalMs?: number;
  };
}

// ============================================================================
// 抽象基类
// ============================================================================

export abstract class BaseSyncManager {
  // 协议标识（子类必须实现）
  protected abstract readonly protocol: OracleProtocol;

  // 同步配置（子类可覆盖）
  protected syncConfig: SyncConfig = { ...DEFAULT_SYNC_CONFIG };

  // 运行状态
  protected syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  protected isRunning: Map<string, boolean> = new Map();
  protected lastPrices: Map<string, number> = new Map();

  /**
   * 获取客户端实例 - 子类必须实现
   */
  protected abstract createClient(
    chain: SupportedChain,
    rpcUrl: string,
    protocolConfig?: Record<string, unknown>,
  ): IOracleClient;

  /**
   * 获取所有可用价格符号 - 子类必须实现
   */
  protected abstract getAvailableSymbols(chain: SupportedChain): string[];

  /**
   * 获取实例配置 - 可从数据库或配置中心获取
   */
  protected async getInstanceConfig(instanceId: string): Promise<InstanceConfig | null> {
    const result = await query(
      `SELECT id, chain, enabled, config, protocol_config 
       FROM unified_oracle_instances 
       WHERE id = $1 AND protocol = $2`,
      [instanceId, this.protocol],
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
   * 启动实例同步
   */
  async startSync(instanceId: string): Promise<void> {
    if (this.isRunning.get(instanceId)) {
      logger.warn(`${this.protocol} sync already running for instance ${instanceId}`);
      return;
    }

    const instance = await this.getInstanceConfig(instanceId);
    if (!instance) {
      logger.error(`Instance ${instanceId} not found for ${this.protocol}`);
      return;
    }

    if (!instance.enabled) {
      logger.info(`Instance ${instanceId} is disabled, skipping ${this.protocol} sync`);
      return;
    }

    logger.info(`Starting ${this.protocol} sync for instance ${instanceId}`, {
      chain: instance.chain,
    });

    this.isRunning.set(instanceId, true);

    // 立即执行一次同步
    await this.syncInstance(instanceId);

    // 设置定时同步
    const intervalMs = instance.config.syncIntervalMs || this.syncConfig.defaultIntervalMs;
    const interval = setInterval(() => {
      this.syncInstance(instanceId).catch((error) => {
        logger.error(`Scheduled ${this.protocol} sync failed for instance ${instanceId}`, {
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
    logger.info(`Stopped ${this.protocol} sync for instance ${instanceId}`);
  }

  /**
   * 停止所有同步
   */
  stopAllSync(): void {
    for (const [instanceId, interval] of this.syncIntervals.entries()) {
      clearInterval(interval);
      this.isRunning.set(instanceId, false);
      logger.info(`Stopped ${this.protocol} sync for instance ${instanceId}`);
    }
    this.syncIntervals.clear();
  }

  /**
   * 同步单个实例
   */
  protected async syncInstance(instanceId: string): Promise<void> {
    const startTime = Date.now();

    try {
      const instance = await this.getInstanceConfig(instanceId);
      if (!instance) {
        throw new Error(`Instance ${instanceId} not found`);
      }

      // 创建客户端
      const client = this.createClient(
        instance.chain,
        instance.config.rpcUrl,
        instance.config.protocolConfig,
      );

      // 获取当前区块号
      const blockNumber = await client.getBlockNumber();

      // 获取所有可用价格喂价
      const symbols = this.getAvailableSymbols(instance.chain);

      if (symbols.length === 0) {
        logger.warn(`No available feeds for ${this.protocol} on ${instance.chain}`);
        return;
      }

      logger.debug(`Syncing ${symbols.length} feeds for ${this.protocol} instance ${instanceId}`);

      // 批量获取价格
      const priceFeeds: UnifiedPriceFeed[] = [];
      for (const symbol of symbols) {
        try {
          const feed = await client.getPriceForSymbol(symbol);
          if (feed) {
            priceFeeds.push(feed);
          }
        } catch (error) {
          logger.error(`Failed to get ${this.protocol} price for ${symbol}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

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

      logger.info(`${this.protocol} sync completed for instance ${instanceId}`, {
        feedsCount: priceFeeds.length,
        duration: `${duration}ms`,
        blockNumber: Number(blockNumber),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`${this.protocol} sync failed for instance ${instanceId}`, {
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
  protected async savePriceFeeds(instanceId: string, feeds: UnifiedPriceFeed[]): Promise<void> {
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
      feed.priceRaw?.toString(),
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
    for (let i = 0; i < values.length; i += this.syncConfig.batchSize) {
      const batch = values.slice(i, i + this.syncConfig.batchSize);
      await this.insertPriceFeedBatch(batch);
    }
  }

  /**
   * 批量插入价格喂价数据
   * 使用辅助函数生成占位符，代码更清晰易维护
   */
  private async insertPriceFeedBatch(batch: unknown[][]): Promise<void> {
    const columns = 18;
    const placeholders = this.buildPlaceholders(batch.length, columns);
    const flatValues = batch.flat() as (
      | string
      | number
      | boolean
      | Date
      | null
      | undefined
      | string[]
      | number[]
    )[];

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

  /**
   * 构建 SQL 占位符字符串
   * @param rowCount 行数
   * @param columnCount 列数
   * @returns 占位符字符串，如 "($1,$2,...),($3,$4,...)"
   */
  private buildPlaceholders(rowCount: number, columnCount: number): string {
    const rows: string[] = [];
    let paramIndex = 1;

    for (let i = 0; i < rowCount; i++) {
      const params: string[] = [];
      for (let j = 0; j < columnCount; j++) {
        params.push(`$${paramIndex++}`);
      }
      rows.push(`(${params.join(',')})`);
    }

    return rows.join(',');
  }

  /**
   * 保存价格更新记录
   */
  protected async savePriceUpdates(instanceId: string, feeds: UnifiedPriceFeed[]): Promise<void> {
    for (const feed of feeds) {
      const lastPrice = this.lastPrices.get(feed.symbol);

      // 如果是新价格或价格变化超过阈值
      if (lastPrice !== undefined) {
        const priceChange = Math.abs(feed.price - lastPrice) / lastPrice;

        if (priceChange >= this.syncConfig.priceChangeThreshold) {
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
   * 获取同步状态
   */
  protected async getSyncState(instanceId: string): Promise<Partial<UnifiedSyncState> | null> {
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
  protected async updateSyncState(
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
      ) VALUES ($1, $2, $3, 0, 'healthy', 0)
      ON CONFLICT (instance_id) DO UPDATE SET
        ${fields.join(', ')}`,
      [instanceId, this.protocol, instance.chain, ...values],
    );
  }

  /**
   * 清理过期数据
   */
  async cleanupOldData(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.syncConfig.dataRetentionDays);

    logger.info(
      `Cleaning up ${this.protocol} data older than ${this.syncConfig.dataRetentionDays} days`,
    );

    // 清理旧的价格喂价数据
    const feedsResult = await query(
      `DELETE FROM unified_price_feeds 
       WHERE protocol = $1 AND timestamp < $2 
       RETURNING id`,
      [this.protocol, cutoffDate.toISOString()],
    );

    // 清理旧的价格更新记录
    const updatesResult = await query(
      `DELETE FROM unified_price_updates 
       WHERE protocol = $1 AND timestamp < $2 
       RETURNING id`,
      [this.protocol, cutoffDate.toISOString()],
    );

    logger.info(`${this.protocol} cleanup completed`, {
      deletedFeeds: feedsResult.rowCount,
      deletedUpdates: updatesResult.rowCount,
    });
  }
}
