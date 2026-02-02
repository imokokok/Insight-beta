/**
 * Batch Module - 批量操作模块
 *
 * 支持批量更新配置、事务处理、错误恢复
 */

import type { OracleConfig, BatchConfigUpdate, BatchUpdateResult } from '@/lib/types/oracleTypes';
import { hasDatabase, query, getClient } from '../db';
import { getMemoryInstance } from '@/server/memoryBackend';
import { encryptString } from '@/lib/security/encryption';
import type { PoolClient } from 'pg';
import { getConfigCacheManager } from './cache';
import { notifyConfigChange } from './webhook';

const configCacheManager = getConfigCacheManager();

/**
 * 批量更新配置
 */
export async function batchUpdateOracleConfigs(
  updates: BatchConfigUpdate[],
  options: {
    continueOnError?: boolean;
    useTransaction?: boolean;
  } = {},
): Promise<BatchUpdateResult> {
  const { continueOnError = true, useTransaction = true } = options;
  const result: BatchUpdateResult = {
    success: [],
    failed: [],
  };

  if (!hasDatabase()) {
    // 内存模式下的批量更新
    for (const update of updates) {
      try {
        const mem = getMemoryInstance(update.instanceId);
        mem.oracleConfig = { ...mem.oracleConfig, ...update.config };
        result.success.push(update.instanceId);

        // 使缓存失效
        await configCacheManager.invalidate(update.instanceId);
      } catch (error) {
        result.failed.push({
          instanceId: update.instanceId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        if (!continueOnError) break;
      }
    }
    return result;
  }

  if (useTransaction) {
    // 使用事务的批量更新
    const client = await getClient();
    try {
      await client.query('BEGIN');

      for (const update of updates) {
        try {
          await updateConfigInTransaction(client, update.instanceId, update.config);
          result.success.push(update.instanceId);
        } catch (error) {
          result.failed.push({
            instanceId: update.instanceId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          if (!continueOnError) {
            throw error; // 触发回滚
          }
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } else {
    // 非事务批量更新
    for (const update of updates) {
      try {
        await updateSingleConfig(update.instanceId, update.config);
        result.success.push(update.instanceId);
      } catch (error) {
        result.failed.push({
          instanceId: update.instanceId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        if (!continueOnError) break;
      }
    }
  }

  // 批量使缓存失效
  if (result.success.length > 0) {
    await configCacheManager.invalidateBatch(result.success);
  }

  // 发送 Webhook 通知
  if (result.success.length > 0) {
    await notifyConfigChange('config.batch_updated', {
      updatedCount: result.success.length,
      failedCount: result.failed.length,
      instanceIds: result.success,
    });
  }

  return result;
}

/**
 * 在事务中更新单个配置
 */
async function updateConfigInTransaction(
  client: PoolClient,
  instanceId: string,
  config: Partial<OracleConfig>,
): Promise<void> {
  const encryptedRpcUrl = config.rpcUrl
    ? (encryptString(config.rpcUrl) ?? config.rpcUrl)
    : undefined;

  const sets: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (config.rpcUrl !== undefined) {
    sets.push(`rpc_url = $${paramIndex++}`);
    values.push(encryptedRpcUrl);
  }
  if (config.contractAddress !== undefined) {
    sets.push(`contract_address = $${paramIndex++}`);
    values.push(config.contractAddress);
  }
  if (config.chain !== undefined) {
    sets.push(`chain = $${paramIndex++}`);
    values.push(config.chain);
  }
  if (config.startBlock !== undefined) {
    sets.push(`start_block = $${paramIndex++}`);
    values.push(config.startBlock);
  }
  if (config.maxBlockRange !== undefined) {
    sets.push(`max_block_range = $${paramIndex++}`);
    values.push(config.maxBlockRange);
  }
  if (config.votingPeriodHours !== undefined) {
    sets.push(`voting_period_hours = $${paramIndex++}`);
    values.push(config.votingPeriodHours);
  }
  if (config.confirmationBlocks !== undefined) {
    sets.push(`confirmation_blocks = $${paramIndex++}`);
    values.push(config.confirmationBlocks);
  }

  if (sets.length === 0) return;

  sets.push(`updated_at = $${paramIndex++}`);
  values.push(new Date());
  values.push(instanceId);

  await client.query(
    `UPDATE oracle_instances SET ${sets.join(', ')} WHERE id = $${paramIndex}`,
    values,
  );
}

/**
 * 更新单个配置（非事务）
 */
async function updateSingleConfig(
  instanceId: string,
  config: Partial<OracleConfig>,
): Promise<void> {
  const encryptedRpcUrl = config.rpcUrl
    ? (encryptString(config.rpcUrl) ?? config.rpcUrl)
    : undefined;

  const sets: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (config.rpcUrl !== undefined) {
    sets.push(`rpc_url = $${paramIndex++}`);
    values.push(encryptedRpcUrl);
  }
  if (config.contractAddress !== undefined) {
    sets.push(`contract_address = $${paramIndex++}`);
    values.push(config.contractAddress);
  }
  if (config.chain !== undefined) {
    sets.push(`chain = $${paramIndex++}`);
    values.push(config.chain);
  }
  if (config.startBlock !== undefined) {
    sets.push(`start_block = $${paramIndex++}`);
    values.push(config.startBlock);
  }
  if (config.maxBlockRange !== undefined) {
    sets.push(`max_block_range = $${paramIndex++}`);
    values.push(config.maxBlockRange);
  }
  if (config.votingPeriodHours !== undefined) {
    sets.push(`voting_period_hours = $${paramIndex++}`);
    values.push(config.votingPeriodHours);
  }
  if (config.confirmationBlocks !== undefined) {
    sets.push(`confirmation_blocks = $${paramIndex++}`);
    values.push(config.confirmationBlocks);
  }

  if (sets.length === 0) return;

  sets.push(`updated_at = $${paramIndex++}`);
  values.push(new Date());
  values.push(instanceId);

  await query(
    `UPDATE oracle_instances SET ${sets.join(', ')} WHERE id = $${paramIndex}`,
    values as (string | number | Date | null)[],
  );
}
