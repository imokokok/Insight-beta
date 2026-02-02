/**
 * Unified Oracle Config Manager
 *
 * 通用预言机配置管理模块
 * 支持多预言机协议的统一配置管理
 */

import { query } from '@/server/db';
import { logger } from '@/lib/logger';
import type {
  UnifiedOracleInstance,
  UnifiedOracleConfig,
  OracleProtocol,
  SupportedChain,
  ProtocolSpecificConfig,
} from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// 配置验证
// ============================================================================

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateUnifiedConfig(
  protocol: OracleProtocol,
  config: UnifiedOracleConfig,
): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 通用验证
  if (!config.rpcUrl) {
    errors.push('RPC URL is required');
  } else {
    try {
      new URL(config.rpcUrl);
    } catch {
      errors.push('Invalid RPC URL format');
    }
  }

  if (!config.chain) {
    errors.push('Chain is required');
  }

  // 协议特定验证
  switch (protocol) {
    case 'chainlink':
      // Chainlink 不需要合约地址（使用内置喂价地址）
      break;

    case 'uma': {
      const umaConfig = config.protocolConfig as {
        optimisticOracleV2Address?: string;
        optimisticOracleV3Address?: string;
      };
      if (!umaConfig?.optimisticOracleV2Address && !umaConfig?.optimisticOracleV3Address) {
        warnings.push('At least one Optimistic Oracle address (V2 or V3) is recommended');
      }
      break;
    }

    case 'pyth': {
      const pythConfig = config.protocolConfig as { pythContractAddress?: string };
      if (!pythConfig?.pythContractAddress) {
        errors.push('Pyth contract address is required');
      }
      break;
    }

    case 'insight':
      if (!config.contractAddress) {
        errors.push('Contract address is required for OracleMonitor');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// CRUD 操作
// ============================================================================

/**
 * 创建新的预言机实例
 */
export async function createUnifiedInstance(params: {
  name: string;
  protocol: OracleProtocol;
  chain: SupportedChain;
  config: UnifiedOracleConfig;
  metadata?: Record<string, unknown>;
}): Promise<UnifiedOracleInstance> {
  const { name, protocol, chain, config, metadata = {} } = params;

  // 验证配置
  const validation = validateUnifiedConfig(protocol, config);
  if (!validation.valid) {
    throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
  }

  const id = `${protocol}-${chain}-${Date.now()}`;
  const now = new Date().toISOString();

  try {
    await query(
      `INSERT INTO unified_oracle_instances (
        id, name, protocol, chain, enabled, config, protocol_config, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        name,
        protocol,
        chain,
        true,
        JSON.stringify({
          rpcUrl: config.rpcUrl,
          rpcUrls: config.rpcUrls,
          startBlock: config.startBlock,
          maxBlockRange: config.maxBlockRange,
          confirmationBlocks: config.confirmationBlocks,
          syncIntervalMs: config.syncIntervalMs,
        }),
        JSON.stringify(config.protocolConfig || {}),
        JSON.stringify(metadata),
        now,
        now,
      ],
    );

    logger.info('Created unified oracle instance', { id, protocol, chain, name });

    return {
      id,
      name,
      protocol,
      chain,
      enabled: true,
      config,
      metadata,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    logger.error('Failed to create unified instance', {
      error: error instanceof Error ? error.message : String(error),
      protocol,
      chain,
    });
    throw error;
  }
}

/**
 * 获取单个实例配置
 */
export async function getUnifiedInstance(id: string): Promise<UnifiedOracleInstance | null> {
  try {
    const result = await query(`SELECT * FROM unified_oracle_instances WHERE id = $1`, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;
    return rowToInstance(row);
  } catch (error) {
    logger.error('Failed to get unified instance', {
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * 列出所有实例
 */
export async function listUnifiedInstances(filters?: {
  protocol?: OracleProtocol;
  chain?: SupportedChain;
  enabled?: boolean;
}): Promise<UnifiedOracleInstance[]> {
  try {
    let sql = `SELECT * FROM unified_oracle_instances WHERE 1=1`;
    const params: (string | number | boolean | Date | null | undefined | string[] | number[])[] =
      [];
    let paramIndex = 1;

    if (filters?.protocol) {
      sql += ` AND protocol = $${paramIndex++}`;
      params.push(filters.protocol);
    }

    if (filters?.chain) {
      sql += ` AND chain = $${paramIndex++}`;
      params.push(filters.chain);
    }

    if (filters?.enabled !== undefined) {
      sql += ` AND enabled = $${paramIndex++}`;
      params.push(filters.enabled);
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await query(sql, params);

    return result.rows.map(rowToInstance);
  } catch (error) {
    logger.error('Failed to list unified instances', {
      error: error instanceof Error ? error.message : String(error),
      filters,
    });
    throw error;
  }
}

/**
 * 更新实例配置
 */
export async function updateUnifiedInstance(
  id: string,
  updates: {
    name?: string;
    enabled?: boolean;
    config?: Partial<UnifiedOracleConfig>;
    metadata?: Record<string, unknown>;
  },
): Promise<UnifiedOracleInstance | null> {
  try {
    const current = await getUnifiedInstance(id);
    if (!current) {
      return null;
    }

    const fields: string[] = [];
    const values: (string | number | boolean | Date | null | undefined | string[] | number[])[] =
      [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }

    if (updates.enabled !== undefined) {
      fields.push(`enabled = $${paramIndex++}`);
      values.push(updates.enabled);
    }

    if (updates.config) {
      const mergedConfig = {
        ...current.config,
        ...updates.config,
      };

      // 验证更新后的配置
      const validation = validateUnifiedConfig(current.protocol, mergedConfig);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      fields.push(`config = $${paramIndex++}`);
      values.push(
        JSON.stringify({
          rpcUrl: mergedConfig.rpcUrl,
          rpcUrls: mergedConfig.rpcUrls,
          startBlock: mergedConfig.startBlock,
          maxBlockRange: mergedConfig.maxBlockRange,
          confirmationBlocks: mergedConfig.confirmationBlocks,
          syncIntervalMs: mergedConfig.syncIntervalMs,
        }),
      );

      if (updates.config.protocolConfig) {
        fields.push(`protocol_config = $${paramIndex++}`);
        values.push(JSON.stringify(updates.config.protocolConfig));
      }
    }

    if (updates.metadata) {
      const mergedMetadata = { ...current.metadata, ...updates.metadata };
      fields.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(mergedMetadata));
    }

    if (fields.length === 0) {
      return current;
    }

    fields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());
    values.push(id);

    await query(
      `UPDATE unified_oracle_instances SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values,
    );

    logger.info('Updated unified oracle instance', { id, updates: Object.keys(updates) });

    return getUnifiedInstance(id);
  } catch (error) {
    logger.error('Failed to update unified instance', {
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * 删除实例
 */
export async function deleteUnifiedInstance(id: string): Promise<boolean> {
  try {
    const result = await query(`DELETE FROM unified_oracle_instances WHERE id = $1 RETURNING id`, [
      id,
    ]);

    const deleted = (result.rowCount ?? 0) > 0;

    if (deleted) {
      logger.info('Deleted unified oracle instance', { id });
    }

    return deleted;
  } catch (error) {
    logger.error('Failed to delete unified instance', {
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ============================================================================
// 批量操作
// ============================================================================

/**
 * 批量创建实例
 */
export async function batchCreateInstances(
  instances: Array<{
    name: string;
    protocol: OracleProtocol;
    chain: SupportedChain;
    config: UnifiedOracleConfig;
    metadata?: Record<string, unknown>;
  }>,
): Promise<{
  success: UnifiedOracleInstance[];
  failed: Array<{ params: (typeof instances)[0]; error: string }>;
}> {
  const success: UnifiedOracleInstance[] = [];
  const failed: Array<{ params: (typeof instances)[0]; error: string }> = [];

  for (const params of instances) {
    try {
      const instance = await createUnifiedInstance(params);
      success.push(instance);
    } catch (error) {
      failed.push({
        params,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info('Batch create instances completed', {
    total: instances.length,
    success: success.length,
    failed: failed.length,
  });

  return { success, failed };
}

/**
 * 批量更新实例状态
 */
export async function batchUpdateStatus(
  ids: string[],
  enabled: boolean,
): Promise<{ updated: string[]; failed: Array<{ id: string; error: string }> }> {
  const updated: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const id of ids) {
    try {
      const result = await updateUnifiedInstance(id, { enabled });
      if (result) {
        updated.push(id);
      } else {
        failed.push({ id, error: 'Instance not found' });
      }
    } catch (error) {
      failed.push({
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { updated, failed };
}

// ============================================================================
// 配置模板
// ============================================================================

/**
 * 获取配置模板
 */
export async function getConfigTemplate(
  protocol: OracleProtocol,
  chain: SupportedChain,
): Promise<Partial<UnifiedOracleConfig> | null> {
  try {
    const result = await query(
      `SELECT config FROM unified_config_templates
       WHERE protocol = $1 AND $2 = ANY(supported_chains) AND is_default = true
       LIMIT 1`,
      [protocol, chain],
    );

    if (result.rows.length === 0) {
      // 返回默认模板
      return getDefaultTemplate(protocol, chain);
    }

    const row = result.rows[0];
    if (!row || !('config' in row)) {
      return getDefaultTemplate(protocol, chain);
    }
    return row.config as object;
  } catch (error) {
    logger.error('Failed to get config template', {
      protocol,
      chain,
      error: error instanceof Error ? error.message : String(error),
    });
    return getDefaultTemplate(protocol, chain);
  }
}

/**
 * 获取默认模板
 */
function getDefaultTemplate(
  protocol: OracleProtocol,
  _chain: SupportedChain,
): Partial<UnifiedOracleConfig> {
  const defaults: Record<OracleProtocol, Partial<UnifiedOracleConfig>> = {
    chainlink: {
      maxBlockRange: 10000,
      confirmationBlocks: 12,
      syncIntervalMs: 60000,
      protocolConfig: {
        heartbeat: 3600,
        deviationThreshold: 0.5,
      },
    },
    pyth: {
      maxBlockRange: 5000,
      confirmationBlocks: 32,
      syncIntervalMs: 30000,
      protocolConfig: {
        stalenessThreshold: 60,
      },
    },
    uma: {
      maxBlockRange: 10000,
      confirmationBlocks: 12,
      syncIntervalMs: 60000,
      protocolConfig: {
        votingPeriodHours: 72,
      },
    },
    insight: {
      maxBlockRange: 5000,
      confirmationBlocks: 6,
      syncIntervalMs: 30000,
    },
    band: {
      maxBlockRange: 10000,
      confirmationBlocks: 12,
      syncIntervalMs: 60000,
    },
    api3: {
      maxBlockRange: 10000,
      confirmationBlocks: 12,
      syncIntervalMs: 60000,
    },
    redstone: {
      maxBlockRange: 5000,
      confirmationBlocks: 12,
      syncIntervalMs: 30000,
    },
    switchboard: {
      maxBlockRange: 5000,
      confirmationBlocks: 32,
      syncIntervalMs: 30000,
    },
    flux: {
      maxBlockRange: 10000,
      confirmationBlocks: 12,
      syncIntervalMs: 60000,
    },
    dia: {
      maxBlockRange: 10000,
      confirmationBlocks: 12,
      syncIntervalMs: 60000,
    },
  };

  return defaults[protocol] || {};
}

// ============================================================================
// 统计信息
// ============================================================================

/**
 * 获取实例统计
 */
export async function getInstanceStats(): Promise<{
  total: number;
  byProtocol: Record<OracleProtocol, number>;
  byChain: Record<SupportedChain, number>;
  enabled: number;
  disabled: number;
}> {
  try {
    const result = await query(`
      SELECT
        COUNT(*) as total,
        protocol,
        chain,
        enabled,
        COUNT(*) FILTER (WHERE enabled = true) as enabled_count,
        COUNT(*) FILTER (WHERE enabled = false) as disabled_count
      FROM unified_oracle_instances
      GROUP BY protocol, chain, enabled
    `);

    const stats = {
      total: 0,
      byProtocol: {} as Record<OracleProtocol, number>,
      byChain: {} as Record<SupportedChain, number>,
      enabled: 0,
      disabled: 0,
    };

    for (const row of result.rows) {
      stats.total += parseInt(row.count);
      stats.byProtocol[row.protocol as OracleProtocol] =
        (stats.byProtocol[row.protocol as OracleProtocol] || 0) + parseInt(row.count);
      stats.byChain[row.chain as SupportedChain] =
        (stats.byChain[row.chain as SupportedChain] || 0) + parseInt(row.count);
    }

    // 重新查询获取准确的 enabled/disabled 数量
    const enabledResult = await query(
      `SELECT COUNT(*) as count FROM unified_oracle_instances WHERE enabled = true`,
    );
    const disabledResult = await query(
      `SELECT COUNT(*) as count FROM unified_oracle_instances WHERE enabled = false`,
    );

    stats.enabled = parseInt(enabledResult.rows[0]?.count || 0);
    stats.disabled = parseInt(disabledResult.rows[0]?.count || 0);

    return stats;
  } catch (error) {
    logger.error('Failed to get instance stats', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ============================================================================
// 同步状态管理
// ============================================================================

export interface SyncStateUpdate {
  status: 'healthy' | 'error' | 'syncing';
  lastSyncAt?: Date;
  lastSyncDurationMs?: number;
  lastProcessedBlock?: number;
  latestBlock?: number;
  lagBlocks?: number;
  errorMessage?: string | null;
}

/**
 * 更新同步状态
 */
export async function updateSyncState(instanceId: string, updates: SyncStateUpdate): Promise<void> {
  try {
    const fields: string[] = [];
    const values: (string | number | boolean | Date | null | undefined)[] = [];
    let paramIndex = 1;

    fields.push(`status = $${paramIndex++}`);
    values.push(updates.status);

    if (updates.lastSyncAt !== undefined) {
      fields.push(`last_sync_at = $${paramIndex++}`);
      values.push(updates.lastSyncAt);
    }

    if (updates.lastSyncDurationMs !== undefined) {
      fields.push(`last_sync_duration_ms = $${paramIndex++}`);
      values.push(updates.lastSyncDurationMs);
    }

    if (updates.lastProcessedBlock !== undefined) {
      fields.push(`last_processed_block = $${paramIndex++}`);
      values.push(updates.lastProcessedBlock);
    }

    if (updates.latestBlock !== undefined) {
      fields.push(`latest_block = $${paramIndex++}`);
      values.push(updates.latestBlock);
    }

    if (updates.lagBlocks !== undefined) {
      fields.push(`lag_blocks = $${paramIndex++}`);
      values.push(updates.lagBlocks);
    }

    if (updates.errorMessage !== undefined) {
      fields.push(`error_message = $${paramIndex++}`);
      values.push(updates.errorMessage);
    }

    // 获取实例信息以更新 protocol 和 chain
    const instanceResult = await query(
      `SELECT protocol, chain FROM unified_oracle_instances WHERE id = $1`,
      [instanceId],
    );

    if (instanceResult.rows.length === 0) {
      logger.warn(`Cannot update sync state: instance ${instanceId} not found`);
      return;
    }

    const instanceRow = instanceResult.rows[0];
    if (!instanceRow) {
      logger.warn(`Cannot update sync state: instance ${instanceId} not found`);
      return;
    }
    const { protocol, chain } = instanceRow as { protocol: string; chain: string };

    // 使用 UPSERT 语法
    await query(
      `
      INSERT INTO unified_sync_state (
        instance_id, protocol, chain, status, last_sync_at, last_sync_duration_ms,
        last_processed_block, latest_block, lag_blocks, error_message, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (instance_id) DO UPDATE SET
        status = EXCLUDED.status,
        last_sync_at = EXCLUDED.last_sync_at,
        last_sync_duration_ms = EXCLUDED.last_sync_duration_ms,
        last_processed_block = EXCLUDED.last_processed_block,
        latest_block = EXCLUDED.latest_block,
        lag_blocks = EXCLUDED.lag_blocks,
        error_message = EXCLUDED.error_message,
        updated_at = NOW()
      `,
      [
        instanceId,
        protocol,
        chain,
        updates.status,
        updates.lastSyncAt || null,
        updates.lastSyncDurationMs || null,
        updates.lastProcessedBlock || null,
        updates.latestBlock || null,
        updates.lagBlocks || null,
        updates.errorMessage || null,
      ],
    );

    logger.debug('Updated sync state', { instanceId, status: updates.status });
  } catch (error) {
    logger.error('Failed to update sync state', {
      instanceId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * 记录同步错误
 */
export async function recordSyncError(
  instanceId: string,
  error: string,
  protocol?: string,
): Promise<void> {
  try {
    // 获取实例信息
    let protocolName = protocol;
    let chainName: string | null = null;

    if (!protocolName) {
      const instanceResult = await query(
        `SELECT protocol, chain FROM unified_oracle_instances WHERE id = $1`,
        [instanceId],
      );
      if (instanceResult.rows.length > 0) {
        const row = instanceResult.rows[0];
        if (row) {
          protocolName = row.protocol as string;
          chainName = row.chain as string;
        }
      }
    }

    // 插入错误日志
    await query(
      `
      INSERT INTO unified_sync_errors (
        instance_id, protocol, chain, error_message, created_at
      ) VALUES ($1, $2, $3, $4, NOW())
      `,
      [instanceId, protocolName || 'unknown', chainName, error],
    );

    // 更新同步状态中的错误信息
    await updateSyncState(instanceId, {
      status: 'error',
      errorMessage: error,
    });

    // 增加连续失败计数
    await query(
      `
      UPDATE unified_sync_state
      SET consecutive_failures = consecutive_failures + 1,
          last_error = $1,
          last_error_at = NOW()
      WHERE instance_id = $2
      `,
      [error, instanceId],
    );

    logger.warn('Recorded sync error', { instanceId, protocol: protocolName, error });
  } catch (err) {
    logger.error('Failed to record sync error', {
      instanceId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * 获取同步状态
 */
export async function getSyncState(instanceId: string): Promise<{
  status: string;
  lastSyncAt: Date | null;
  lastSyncDurationMs: number | null;
  consecutiveFailures: number;
  errorMessage: string | null;
} | null> {
  try {
    const result = await query(`SELECT * FROM unified_sync_state WHERE instance_id = $1`, [
      instanceId,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;
    return {
      status: row.status as string,
      lastSyncAt: row.last_sync_at as Date,
      lastSyncDurationMs: row.last_sync_duration_ms as number,
      consecutiveFailures: (row.consecutive_failures as number) || 0,
      errorMessage: row.error_message ? (row.error_message as string) : null,
    };
  } catch (error) {
    logger.error('Failed to get sync state', {
      instanceId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * 清除同步错误
 */
export async function clearSyncError(instanceId: string): Promise<void> {
  try {
    await query(
      `
      UPDATE unified_sync_state
      SET consecutive_failures = 0,
          error_message = NULL,
          last_error = NULL,
          last_error_at = NULL
      WHERE instance_id = $1
      `,
      [instanceId],
    );

    logger.debug('Cleared sync error', { instanceId });
  } catch (error) {
    logger.error('Failed to clear sync error', {
      instanceId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ============================================================================
// 辅助函数
// ============================================================================

function rowToInstance(row: Record<string, unknown>): UnifiedOracleInstance {
  const config = typeof row.config === 'string' ? JSON.parse(row.config) : row.config;
  const protocolConfig =
    typeof row.protocol_config === 'string' ? JSON.parse(row.protocol_config) : row.protocol_config;
  const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;

  return {
    id: row.id as string,
    name: row.name as string,
    protocol: row.protocol as OracleProtocol,
    chain: row.chain as SupportedChain,
    enabled: row.enabled as boolean,
    config: {
      rpcUrl: config?.rpcUrl || '',
      rpcUrls: config?.rpcUrls,
      chain: row.chain as SupportedChain,
      startBlock: config?.startBlock,
      maxBlockRange: config?.maxBlockRange,
      confirmationBlocks: config?.confirmationBlocks,
      syncIntervalMs: config?.syncIntervalMs,
      protocolConfig: protocolConfig as ProtocolSpecificConfig,
    },
    metadata: metadata as Record<string, unknown>,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
