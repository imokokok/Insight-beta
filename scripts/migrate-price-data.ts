/**
 * Price Data Migration Script
 * 价格数据迁移脚本
 *
 * 将现有数据从旧表迁移到新的统一表结构
 * 支持：
 * - 从 unified_price_feeds 迁移当前价格
 * - 从 price_history_raw 迁移历史数据
 * - 从 unified_price_updates 迁移更新事件
 * - 数据一致性验证
 */

import { createClient } from '@supabase/supabase-js';

import { logger } from '../src/lib/logger';

// ============================================================================
// 配置
// ============================================================================

const BATCH_SIZE = 1000;
const MIGRATION_TIMEOUT_MS = 300000; // 5分钟

interface MigrationConfig {
  sourceTables: {
    unifiedPriceFeeds: boolean;
    priceHistoryRaw: boolean;
    unifiedPriceUpdates: boolean;
  };
  dryRun: boolean;
  batchSize: number;
}

const DEFAULT_CONFIG: MigrationConfig = {
  sourceTables: {
    unifiedPriceFeeds: true,
    priceHistoryRaw: true,
    unifiedPriceUpdates: true,
  },
  dryRun: process.env.DRY_RUN === 'true',
  batchSize: BATCH_SIZE,
};

// ============================================================================
// 类型定义
// ============================================================================

interface UnifiedPriceFeed {
  id: string;
  instance_id: string;
  protocol: string;
  chain: string;
  symbol: string;
  base_asset: string;
  quote_asset: string;
  price: number;
  price_raw: string;
  decimals: number;
  timestamp: string;
  block_number?: number;
  confidence?: number;
  sources?: number;
  is_stale?: boolean;
  staleness_seconds?: number;
  tx_hash?: string;
  log_index?: number;
  created_at: string;
}

interface PriceHistoryRaw {
  id: number;
  symbol: string;
  protocol: string;
  chain: string;
  price: number;
  price_raw: string;
  decimals: number;
  timestamp: string;
  block_number?: number;
  confidence?: number;
  volume_24h?: number;
  change_24h?: number;
  created_at: string;
}

interface UnifiedPriceUpdate {
  id: string;
  feed_id: string;
  instance_id: string;
  protocol: string;
  previous_price: number;
  current_price: number;
  price_change: number;
  price_change_percent: number;
  timestamp: string;
  block_number?: number;
  tx_hash?: string;
  created_at: string;
}

interface MigrationResult {
  table: string;
  sourceCount: number;
  migratedCount: number;
  failedCount: number;
  durationMs: number;
}

// ============================================================================
// 迁移服务
// ============================================================================

class PriceDataMigrationService {
  private supabase;
  private config: MigrationConfig;
  private results: MigrationResult[] = [];

  constructor(config: Partial<MigrationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
  }

  /**
   * 执行完整迁移
   */
  async migrate(): Promise<MigrationResult[]> {
    logger.info('Starting price data migration', {
      dryRun: this.config.dryRun,
      config: this.config.sourceTables,
    });

    const startTime = Date.now();

    try {
      // 1. 迁移 unified_price_feeds
      if (this.config.sourceTables.unifiedPriceFeeds) {
        await this.migrateUnifiedPriceFeeds();
      }

      // 2. 迁移 price_history_raw
      if (this.config.sourceTables.priceHistoryRaw) {
        await this.migratePriceHistoryRaw();
      }

      // 3. 迁移 unified_price_updates
      if (this.config.sourceTables.unifiedPriceUpdates) {
        await this.migrateUnifiedPriceUpdates();
      }

      const duration = Date.now() - startTime;
      logger.info('Migration completed', {
        durationMs: duration,
        results: this.results,
      });

      return this.results;
    } catch (error) {
      logger.error('Migration failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 迁移 unified_price_feeds 到 price_history
   */
  private async migrateUnifiedPriceFeeds(): Promise<void> {
    logger.info('Migrating unified_price_feeds...');
    const startTime = Date.now();

    let offset = 0;
    let totalMigrated = 0;
    let totalFailed = 0;

    while (true) {
      // 查询源数据
      const { data: feeds, error } = await this.supabase
        .from('unified_price_feeds')
        .select('*')
        .range(offset, offset + this.config.batchSize - 1);

      if (error) {
        throw new Error(`Failed to fetch unified_price_feeds: ${error.message}`);
      }

      if (!feeds || feeds.length === 0) {
        break;
      }

      // 转换数据
      const records = feeds.map((feed: UnifiedPriceFeed) => ({
        feed_id: `${feed.protocol}:${feed.chain}:${feed.symbol}`,
        protocol: feed.protocol,
        chain: feed.chain,
        symbol: feed.symbol,
        base_asset: feed.base_asset,
        quote_asset: feed.quote_asset,
        price: feed.price,
        price_raw: feed.price_raw,
        decimals: feed.decimals,
        timestamp: feed.timestamp,
        block_number: feed.block_number,
        confidence: feed.confidence,
        sources: feed.sources || 1,
        is_stale: feed.is_stale || false,
        staleness_seconds: feed.staleness_seconds || 0,
        tx_hash: feed.tx_hash,
        log_index: feed.log_index,
        created_at: feed.created_at,
      }));

      if (!this.config.dryRun) {
        // 插入目标表
        const { error: insertError } = await this.supabase.from('price_history').insert(records);

        if (insertError) {
          logger.error('Failed to insert price_history records', {
            error: insertError.message,
            count: records.length,
          });
          totalFailed += records.length;
        } else {
          totalMigrated += records.length;
        }
      } else {
        logger.info(`[DRY RUN] Would migrate ${records.length} records`);
        totalMigrated += records.length;
      }

      offset += feeds.length;
      logger.info(`Processed ${offset} unified_price_feeds records`);

      // 检查是否还有更多数据
      if (feeds.length < this.config.batchSize) {
        break;
      }
    }

    const sourceCount = await this.getTableCount('unified_price_feeds');

    this.results.push({
      table: 'unified_price_feeds -> price_history',
      sourceCount,
      migratedCount: totalMigrated,
      failedCount: totalFailed,
      durationMs: Date.now() - startTime,
    });

    logger.info('Unified price feeds migration completed', {
      migrated: totalMigrated,
      failed: totalFailed,
    });
  }

  /**
   * 迁移 price_history_raw 到 price_history
   */
  private async migratePriceHistoryRaw(): Promise<void> {
    logger.info('Migrating price_history_raw...');
    const startTime = Date.now();

    let offset = 0;
    let totalMigrated = 0;
    let totalFailed = 0;

    while (true) {
      // 查询源数据
      const { data: records, error } = await this.supabase
        .from('price_history_raw')
        .select('*')
        .order('timestamp', { ascending: false })
        .range(offset, offset + this.config.batchSize - 1);

      if (error) {
        throw new Error(`Failed to fetch price_history_raw: ${error.message}`);
      }

      if (!records || records.length === 0) {
        break;
      }

      // 转换数据
      const priceHistoryRecords = records.map((record: PriceHistoryRaw) => {
        const [baseAsset, quoteAsset] = record.symbol.split('/');
        return {
          feed_id: `${record.protocol}:${record.chain}:${record.symbol}`,
          protocol: record.protocol,
          chain: record.chain,
          symbol: record.symbol,
          base_asset: baseAsset || record.symbol,
          quote_asset: quoteAsset || 'USD',
          price: record.price,
          price_raw: record.price_raw,
          decimals: record.decimals,
          timestamp: record.timestamp,
          block_number: record.block_number,
          confidence: record.confidence,
          sources: 1,
          volume_24h: record.volume_24h,
          change_24h: record.change_24h,
          created_at: record.created_at,
        };
      });

      if (!this.config.dryRun) {
        // 插入目标表
        const { error: insertError } = await this.supabase
          .from('price_history')
          .insert(priceHistoryRecords);

        if (insertError) {
          logger.error('Failed to insert price_history records', {
            error: insertError.message,
            count: priceHistoryRecords.length,
          });
          totalFailed += priceHistoryRecords.length;
        } else {
          totalMigrated += priceHistoryRecords.length;
        }
      } else {
        logger.info(`[DRY RUN] Would migrate ${priceHistoryRecords.length} records`);
        totalMigrated += priceHistoryRecords.length;
      }

      offset += records.length;
      logger.info(`Processed ${offset} price_history_raw records`);

      // 检查是否还有更多数据
      if (records.length < this.config.batchSize) {
        break;
      }
    }

    const sourceCount = await this.getTableCount('price_history_raw');

    this.results.push({
      table: 'price_history_raw -> price_history',
      sourceCount,
      migratedCount: totalMigrated,
      failedCount: totalFailed,
      durationMs: Date.now() - startTime,
    });

    logger.info('Price history raw migration completed', {
      migrated: totalMigrated,
      failed: totalFailed,
    });
  }

  /**
   * 迁移 unified_price_updates 到 price_update_events
   */
  private async migrateUnifiedPriceUpdates(): Promise<void> {
    logger.info('Migrating unified_price_updates...');
    const startTime = Date.now();

    let offset = 0;
    let totalMigrated = 0;
    let totalFailed = 0;

    while (true) {
      // 查询源数据
      const { data: updates, error } = await this.supabase
        .from('unified_price_updates')
        .select('*')
        .range(offset, offset + this.config.batchSize - 1);

      if (error) {
        throw new Error(`Failed to fetch unified_price_updates: ${error.message}`);
      }

      if (!updates || updates.length === 0) {
        break;
      }

      // 转换数据
      const eventRecords = updates.map((update: UnifiedPriceUpdate) => ({
        feed_id: update.feed_id,
        protocol: update.protocol,
        chain: '', // 需要从 feed_id 解析或从其他表查询
        symbol: '', // 需要从 feed_id 解析或从其他表查询
        previous_price: update.previous_price,
        current_price: update.current_price,
        price_change: update.price_change,
        price_change_percent: update.price_change_percent,
        timestamp: update.timestamp,
        block_number: update.block_number,
        tx_hash: update.tx_hash,
        created_at: update.created_at,
      }));

      // 补充 chain 和 symbol 信息
      for (const record of eventRecords) {
        const parts = record.feed_id.split(':');
        if (parts.length >= 3) {
          record.chain = parts[1];
          record.symbol = parts.slice(2).join(':');
        }
      }

      if (!this.config.dryRun) {
        // 插入目标表
        const { error: insertError } = await this.supabase
          .from('price_update_events')
          .insert(eventRecords);

        if (insertError) {
          logger.error('Failed to insert price_update_events records', {
            error: insertError.message,
            count: eventRecords.length,
          });
          totalFailed += eventRecords.length;
        } else {
          totalMigrated += eventRecords.length;
        }
      } else {
        logger.info(`[DRY RUN] Would migrate ${eventRecords.length} records`);
        totalMigrated += eventRecords.length;
      }

      offset += updates.length;
      logger.info(`Processed ${offset} unified_price_updates records`);

      // 检查是否还有更多数据
      if (updates.length < this.config.batchSize) {
        break;
      }
    }

    const sourceCount = await this.getTableCount('unified_price_updates');

    this.results.push({
      table: 'unified_price_updates -> price_update_events',
      sourceCount,
      migratedCount: totalMigrated,
      failedCount: totalFailed,
      durationMs: Date.now() - startTime,
    });

    logger.info('Unified price updates migration completed', {
      migrated: totalMigrated,
      failed: totalFailed,
    });
  }

  /**
   * 获取表的总记录数
   */
  private async getTableCount(tableName: string): Promise<number> {
    const { count, error } = await this.supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      logger.warn(`Failed to get count for ${tableName}`, { error: error.message });
      return 0;
    }

    return count || 0;
  }

  /**
   * 验证数据一致性
   */
  async verifyConsistency(): Promise<{
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    details: string[];
  }> {
    logger.info('Starting data consistency verification...');

    const details: string[] = [];
    let passedChecks = 0;
    let failedChecks = 0;

    // 检查1: price_history 记录数
    const priceHistoryCount = await this.getTableCount('price_history');
    const unifiedFeedsCount = await this.getTableCount('unified_price_feeds');
    const rawHistoryCount = await this.getTableCount('price_history_raw');

    const expectedMinCount = unifiedFeedsCount + rawHistoryCount * 0.8; // 允许20%的重复

    if (priceHistoryCount >= expectedMinCount) {
      passedChecks++;
      details.push(
        `✓ price_history count (${priceHistoryCount}) >= expected minimum (${Math.floor(expectedMinCount)})`,
      );
    } else {
      failedChecks++;
      details.push(
        `✗ price_history count (${priceHistoryCount}) < expected minimum (${Math.floor(expectedMinCount)})`,
      );
    }

    // 检查2: current_price_feeds 视图
    const { count: currentFeedsCount, error: viewError } = await this.supabase
      .from('current_price_feeds')
      .select('*', { count: 'exact', head: true });

    if (!viewError && currentFeedsCount && currentFeedsCount > 0) {
      passedChecks++;
      details.push(`✓ current_price_feeds view has ${currentFeedsCount} records`);
    } else {
      failedChecks++;
      details.push(`✗ current_price_feeds view is empty or error: ${viewError?.message}`);
    }

    // 检查3: 物化视图
    const matViews = [
      'price_history_1min',
      'price_history_5min',
      'price_history_1hour',
      'price_history_1day',
    ];
    for (const view of matViews) {
      const { count, error } = await this.supabase
        .from(view)
        .select('*', { count: 'exact', head: true });

      if (!error && count && count > 0) {
        passedChecks++;
        details.push(`✓ ${view} has ${count} records`);
      } else {
        failedChecks++;
        details.push(`✗ ${view} is empty or error: ${error?.message}`);
      }
    }

    logger.info('Consistency verification completed', {
      passedChecks,
      failedChecks,
    });

    return {
      totalChecks: passedChecks + failedChecks,
      passedChecks,
      failedChecks,
      details,
    };
  }
}

// ============================================================================
// 主函数
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verifyOnly = args.includes('--verify-only');

  const config: Partial<MigrationConfig> = {
    dryRun,
    sourceTables: {
      unifiedPriceFeeds: !args.includes('--skip-feeds'),
      priceHistoryRaw: !args.includes('--skip-history'),
      unifiedPriceUpdates: !args.includes('--skip-updates'),
    },
  };

  const migration = new PriceDataMigrationService(config);

  try {
    if (verifyOnly) {
      const verification = await migration.verifyConsistency();
      console.log('\n=== Verification Results ===');
      console.log(`Total Checks: ${verification.totalChecks}`);
      console.log(`Passed: ${verification.passedChecks}`);
      console.log(`Failed: ${verification.failedChecks}`);
      console.log('\nDetails:');
      verification.details.forEach((detail) => console.log(detail));
    } else {
      const results = await migration.migrate();

      console.log('\n=== Migration Results ===');
      results.forEach((result) => {
        console.log(`\n${result.table}:`);
        console.log(`  Source Count: ${result.sourceCount}`);
        console.log(`  Migrated: ${result.migratedCount}`);
        console.log(`  Failed: ${result.failedCount}`);
        console.log(`  Duration: ${result.durationMs}ms`);
      });

      // 验证
      const verification = await migration.verifyConsistency();
      console.log('\n=== Verification Results ===');
      console.log(`Total Checks: ${verification.totalChecks}`);
      console.log(`Passed: ${verification.passedChecks}`);
      console.log(`Failed: ${verification.failedChecks}`);
    }

    process.exit(0);
  } catch (error) {
    logger.error('Migration script failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

export { PriceDataMigrationService, type MigrationConfig, type MigrationResult };
