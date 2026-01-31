/**
 * Unified Oracle Migration Tool
 *
 * 从旧 Schema 迁移到统一 Schema 的工具
 * 支持 Insight Oracle 和 UMA Oracle 的数据迁移
 */

import { query } from '@/server/db';
import { logger } from '@/lib/logger';
import type { OracleProtocol, SupportedChain } from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// 迁移配置
// ============================================================================

interface MigrationConfig {
  dryRun: boolean;
  batchSize: number;
  skipErrors: boolean;
}

const DEFAULT_CONFIG: MigrationConfig = {
  dryRun: false,
  batchSize: 100,
  skipErrors: true,
};

// ============================================================================
// 迁移结果
// ============================================================================

interface MigrationResult {
  success: boolean;
  migrated: {
    instances: number;
    priceFeeds: number;
    assertions: number;
    disputes: number;
    syncStates: number;
  };
  errors: Array<{
    table: string;
    id: string;
    error: string;
  }>;
  duration: number;
}

// ============================================================================
// 主迁移函数
// ============================================================================

export async function runMigration(
  config: Partial<MigrationConfig> = {},
): Promise<MigrationResult> {
  const startTime = Date.now();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  logger.info('Starting unified oracle migration', {
    dryRun: finalConfig.dryRun,
    batchSize: finalConfig.batchSize,
  });

  const result: MigrationResult = {
    success: true,
    migrated: {
      instances: 0,
      priceFeeds: 0,
      assertions: 0,
      disputes: 0,
      syncStates: 0,
    },
    errors: [],
    duration: 0,
  };

  try {
    // 1. 迁移 Insight Oracle 实例
    await migrateInsightInstances(result, finalConfig);

    // 2. 迁移 UMA Oracle 实例
    await migrateUMAInstances(result, finalConfig);

    // 3. 迁移同步状态
    await migrateSyncStates(result, finalConfig);

    // 4. 迁移统计数据
    await migrateStatistics(result, finalConfig);

    result.duration = Date.now() - startTime;

    logger.info('Migration completed', {
      duration: `${result.duration}ms`,
      migrated: result.migrated,
      errors: result.errors.length,
    });

    return result;
  } catch (error) {
    result.success = false;
    result.duration = Date.now() - startTime;

    logger.error('Migration failed', {
      error: error instanceof Error ? error.message : String(error),
      duration: `${result.duration}ms`,
    });

    throw error;
  }
}

// ============================================================================
// Insight Oracle 迁移
// ============================================================================

async function migrateInsightInstances(
  result: MigrationResult,
  config: MigrationConfig,
): Promise<void> {
  logger.info('Migrating Insight Oracle instances...');

  try {
    // 获取所有 Insight Oracle 实例
    const instancesResult = await query(`
      SELECT * FROM oracle_instances
      WHERE id NOT IN (SELECT instance_id FROM unified_oracle_instances WHERE protocol = 'insight')
    `);

    logger.info(`Found ${instancesResult.rows.length} Insight instances to migrate`);

    for (const row of instancesResult.rows) {
      try {
        const instanceId = row.id as string;
        const chain = (row.chain || 'local') as SupportedChain;

        if (!config.dryRun) {
          await query(
            `INSERT INTO unified_oracle_instances (
              id, name, protocol, chain, enabled, config, protocol_config, metadata, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO NOTHING`,
            [
              instanceId,
              row.name || 'Default',
              'insight' as OracleProtocol,
              chain,
              row.enabled ?? true,
              JSON.stringify({
                rpcUrl: row.rpc_url || '',
                contractAddress: row.contract_address,
                startBlock: row.start_block,
                maxBlockRange: row.max_block_range,
                votingPeriodHours: row.voting_period_hours,
                confirmationBlocks: row.confirmation_blocks,
              }),
              JSON.stringify({}),
              JSON.stringify({ migrated: true, migratedAt: new Date().toISOString() }),
              row.created_at || new Date().toISOString(),
              row.updated_at || new Date().toISOString(),
            ],
          );
        }

        result.migrated.instances++;
        logger.debug(`Migrated Insight instance: ${instanceId}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors.push({
          table: 'oracle_instances',
          id: row.id as string,
          error: errorMsg,
        });

        if (!config.skipErrors) {
          throw error;
        }
      }
    }
  } catch (error) {
    logger.error('Failed to migrate Insight instances', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ============================================================================
// UMA Oracle 迁移
// ============================================================================

async function migrateUMAInstances(
  result: MigrationResult,
  config: MigrationConfig,
): Promise<void> {
  logger.info('Migrating UMA Oracle instances...');

  try {
    // 获取所有 UMA Oracle 配置
    const umaResult = await query(`
      SELECT * FROM uma_oracle_config
      WHERE id NOT IN (SELECT instance_id FROM unified_oracle_instances WHERE protocol = 'uma')
    `);

    logger.info(`Found ${umaResult.rows.length} UMA instances to migrate`);

    for (const row of umaResult.rows) {
      try {
        const instanceId = row.id as string;
        const chain = row.chain as SupportedChain;

        if (!config.dryRun) {
          await query(
            `INSERT INTO unified_oracle_instances (
              id, name, protocol, chain, enabled, config, protocol_config, metadata, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO NOTHING`,
            [
              instanceId,
              instanceId, // 使用 ID 作为名称
              'uma' as OracleProtocol,
              chain,
              row.enabled ?? true,
              JSON.stringify({
                rpcUrl: row.rpc_url || '',
                startBlock: row.start_block,
                maxBlockRange: row.max_block_range,
                confirmationBlocks: row.confirmation_blocks,
              }),
              JSON.stringify({
                optimisticOracleV2Address: row.optimistic_oracle_v2_address,
                optimisticOracleV3Address: row.optimistic_oracle_v3_address,
                votingPeriodHours: row.voting_period_hours,
              }),
              JSON.stringify({ migrated: true, migratedAt: new Date().toISOString() }),
              row.created_at || new Date().toISOString(),
              row.updated_at || new Date().toISOString(),
            ],
          );
        }

        result.migrated.instances++;
        logger.debug(`Migrated UMA instance: ${instanceId}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors.push({
          table: 'uma_oracle_config',
          id: row.id as string,
          error: errorMsg,
        });

        if (!config.skipErrors) {
          throw error;
        }
      }
    }
  } catch (error) {
    logger.error('Failed to migrate UMA instances', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ============================================================================
// 同步状态迁移
// ============================================================================

async function migrateSyncStates(result: MigrationResult, config: MigrationConfig): Promise<void> {
  logger.info('Migrating sync states...');

  try {
    // 迁移 Insight Oracle 同步状态
    const insightSyncResult = await query(`
      SELECT * FROM oracle_sync_state
      WHERE instance_id NOT IN (SELECT instance_id FROM unified_sync_state)
    `);

    for (const row of insightSyncResult.rows) {
      try {
        if (!config.dryRun) {
          await query(
            `INSERT INTO unified_sync_state (
              instance_id, protocol, chain, last_processed_block, latest_block, safe_block,
              lag_blocks, last_sync_at, last_sync_duration_ms, avg_sync_duration_ms,
              status, consecutive_failures, last_error, last_error_at, active_rpc_url, rpc_health
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (instance_id) DO NOTHING`,
            [
              row.instance_id,
              'insight',
              row.chain || 'local',
              row.last_processed_block || 0,
              row.latest_block,
              row.safe_block,
              row.lag_blocks,
              row.last_attempt_at,
              row.last_duration_ms,
              null, // avg_sync_duration_ms
              row.last_error ? 'error' : 'healthy',
              row.consecutive_failures || 0,
              row.last_error,
              row.last_error ? row.last_attempt_at : null,
              row.rpc_active_url,
              'healthy',
            ],
          );
        }

        result.migrated.syncStates++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors.push({
          table: 'oracle_sync_state',
          id: row.instance_id as string,
          error: errorMsg,
        });

        if (!config.skipErrors) {
          throw error;
        }
      }
    }

    // 迁移 UMA 同步状态
    const umaSyncResult = await query(`
      SELECT * FROM uma_sync_state
      WHERE instance_id NOT IN (SELECT instance_id FROM unified_sync_state)
    `);

    for (const row of umaSyncResult.rows) {
      try {
        // 获取对应的 chain
        const chainResult = await query(`SELECT chain FROM uma_oracle_config WHERE id = $1`, [
          row.instance_id,
        ]);
        const chain = chainResult.rows[0]?.chain || 'ethereum';

        if (!config.dryRun) {
          await query(
            `INSERT INTO unified_sync_state (
              instance_id, protocol, chain, last_processed_block, latest_block, safe_block,
              lag_blocks, last_sync_at, last_sync_duration_ms, avg_sync_duration_ms,
              status, consecutive_failures, last_error, last_error_at, active_rpc_url, rpc_health
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (instance_id) DO NOTHING`,
            [
              row.instance_id,
              'uma',
              chain,
              row.last_processed_block || 0,
              row.latest_block,
              row.safe_block,
              row.lag_blocks,
              row.last_attempt_at,
              row.last_duration_ms,
              null,
              row.last_error ? 'error' : 'healthy',
              row.consecutive_failures || 0,
              row.last_error,
              row.last_error ? row.last_attempt_at : null,
              row.rpc_active_url,
              'healthy',
            ],
          );
        }

        result.migrated.syncStates++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors.push({
          table: 'uma_sync_state',
          id: row.instance_id as string,
          error: errorMsg,
        });

        if (!config.skipErrors) {
          throw error;
        }
      }
    }

    logger.info(`Migrated ${result.migrated.syncStates} sync states`);
  } catch (error) {
    logger.error('Failed to migrate sync states', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ============================================================================
// 统计数据迁移
// ============================================================================

async function migrateStatistics(
  _result: MigrationResult,
  _config: MigrationConfig,
): Promise<void> {
  logger.info('Migrating statistics...');

  // 统计迁移后的数据
  try {
    const stats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM unified_oracle_instances) as instances,
        (SELECT COUNT(*) FROM unified_sync_state) as sync_states
    `);

    logger.info('Migration statistics', {
      totalInstances: stats.rows[0]?.instances,
      totalSyncStates: stats.rows[0]?.sync_states,
    });
  } catch (error) {
    logger.warn('Failed to get migration statistics', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// 回滚功能
// ============================================================================

export async function rollbackMigration(): Promise<{
  success: boolean;
  deleted: {
    instances: number;
    syncStates: number;
  };
}> {
  logger.warn('Starting migration rollback...');

  const result = {
    success: true,
    deleted: {
      instances: 0,
      syncStates: 0,
    },
  };

  try {
    // 删除迁移的实例
    const instancesResult = await query(`
      DELETE FROM unified_oracle_instances
      WHERE metadata->>'migrated' = 'true'
      RETURNING id
    `);
    result.deleted.instances = instancesResult.rowCount || 0;

    // 删除迁移的同步状态
    const syncResult = await query(`
      DELETE FROM unified_sync_state
      WHERE instance_id NOT IN (SELECT id FROM unified_oracle_instances)
      RETURNING instance_id
    `);
    result.deleted.syncStates = syncResult.rowCount || 0;

    logger.info('Rollback completed', result.deleted);

    return result;
  } catch (error) {
    result.success = false;
    logger.error('Rollback failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ============================================================================
// 验证迁移
// ============================================================================

export async function verifyMigration(): Promise<{
  valid: boolean;
  issues: string[];
  stats: {
    unifiedInstances: number;
    unifiedSyncStates: number;
    legacyInstances: number;
    legacyUMAConfigs: number;
  };
}> {
  logger.info('Verifying migration...');

  const issues: string[] = [];

  try {
    // 获取统计
    const unifiedInstances = await query(`SELECT COUNT(*) as count FROM unified_oracle_instances`);
    const unifiedSyncStates = await query(`SELECT COUNT(*) as count FROM unified_sync_state`);
    const legacyInstances = await query(`SELECT COUNT(*) as count FROM oracle_instances`);
    const legacyUMAConfigs = await query(`SELECT COUNT(*) as count FROM uma_oracle_config`);

    const stats = {
      unifiedInstances: parseInt(unifiedInstances.rows[0]?.count || 0),
      unifiedSyncStates: parseInt(unifiedSyncStates.rows[0]?.count || 0),
      legacyInstances: parseInt(legacyInstances.rows[0]?.count || 0),
      legacyUMAConfigs: parseInt(legacyUMAConfigs.rows[0]?.count || 0),
    };

    // 验证数据一致性
    if (stats.unifiedInstances < stats.legacyInstances + stats.legacyUMAConfigs) {
      issues.push(
        `Instance count mismatch: unified=${stats.unifiedInstances}, legacy=${stats.legacyInstances + stats.legacyUMAConfigs}`,
      );
    }

    // 验证同步状态
    const orphanedSyncStates = await query(`
      SELECT COUNT(*) as count FROM unified_sync_state
      WHERE instance_id NOT IN (SELECT id FROM unified_oracle_instances)
    `);

    if (parseInt(orphanedSyncStates.rows[0]?.count) > 0) {
      issues.push(`Found ${orphanedSyncStates.rows[0]?.count} orphaned sync states`);
    }

    const valid = issues.length === 0;

    logger.info('Migration verification completed', {
      valid,
      issues: issues.length,
      stats,
    });

    return { valid, issues, stats };
  } catch (error) {
    logger.error('Migration verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ============================================================================
// CLI 支持
// ============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'migrate': {
      const dryRun = args.includes('--dry-run');
      runMigration({ dryRun })
        .then((result) => {
          console.log('Migration result:', JSON.stringify(result, null, 2));
          process.exit(result.success ? 0 : 1);
        })
        .catch((error) => {
          console.error('Migration failed:', error);
          process.exit(1);
        });
      break;
    }

    case 'rollback': {
      rollbackMigration()
        .then((result) => {
          console.log('Rollback result:', JSON.stringify(result, null, 2));
          process.exit(result.success ? 0 : 1);
        })
        .catch((error) => {
          console.error('Rollback failed:', error);
          process.exit(1);
        });
      break;
    }

    case 'verify': {
      verifyMigration()
        .then((result) => {
          console.log('Verification result:', JSON.stringify(result, null, 2));
          process.exit(result.valid ? 0 : 1);
        })
        .catch((error) => {
          console.error('Verification failed:', error);
          process.exit(1);
        });
      break;
    }

    default:
      console.log(`
Usage: tsx unifiedMigration.ts <command> [options]

Commands:
  migrate [--dry-run]   Run migration
  rollback             Rollback migration
  verify               Verify migration

Examples:
  tsx unifiedMigration.ts migrate
  tsx unifiedMigration.ts migrate --dry-run
  tsx unifiedMigration.ts rollback
  tsx unifiedMigration.ts verify
      `);
      process.exit(0);
  }
}
