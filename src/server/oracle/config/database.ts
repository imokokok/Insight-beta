import { hasDatabase, query } from '@/server/db';
import { ensureSchema } from '@/server/schema';
import { logger } from '@/lib/logger';
import { encryptString, decryptString, isEncryptionEnabled } from '@/lib/security/encryption';
import { withTransaction } from '@/server/dbOptimization';
import type { OracleConfig } from './types';

let schemaEnsured = false;

/**
 * 确保数据库连接和 schema 已初始化
 */
export async function ensureDb(): Promise<void> {
  if (!hasDatabase()) return;
  if (!schemaEnsured) {
    try {
      await Promise.race([
        ensureSchema(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('database_connection_timeout')), 10000),
        ),
      ]);
      schemaEnsured = true;
    } catch (error) {
      logger.warn('Database connection failed, skipping schema initialization', {
        error: error instanceof Error ? error.message : String(error),
      });
      schemaEnsured = true;
    }
  }
}

/**
 * 加密敏感配置字段
 */
function encryptConfig(config: OracleConfig): OracleConfig {
  if (!isEncryptionEnabled()) return config;

  const encrypted = { ...config };
  if (config.rpcUrl) {
    const encryptedUrl = encryptString(config.rpcUrl);
    if (encryptedUrl) {
      encrypted.rpcUrl = encryptedUrl;
    }
  }
  return encrypted;
}

/**
 * 解密敏感配置字段
 */
function decryptConfig(config: OracleConfig): OracleConfig {
  if (!isEncryptionEnabled()) return config;

  const decrypted = { ...config };
  if (config.rpcUrl) {
    try {
      const decryptedUrl = decryptString(config.rpcUrl);
      if (decryptedUrl) {
        decrypted.rpcUrl = decryptedUrl;
      }
    } catch {
      // 如果解密失败，保持原值
      logger.warn('Failed to decrypt RPC URL');
    }
  }
  return decrypted;
}

interface DbOracleConfig {
  instance_id: string;
  rpc_url: string;
  contract_address: string;
  chain: string;
  max_block_range: number;
  voting_period_hours: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * 从数据库获取 Oracle 配置
 */
export async function getOracleConfigFromDb(instanceId: string): Promise<OracleConfig | null> {
  if (!hasDatabase()) return null;
  await ensureDb();

  try {
    const result = await query<DbOracleConfig>(
      `SELECT * FROM oracle_configs WHERE instance_id = $1`,
      [instanceId],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    if (!row) return null;
    const config: OracleConfig = {
      instanceId: row.instance_id,
      rpcUrl: row.rpc_url,
      contractAddress: row.contract_address,
      chain: row.chain as OracleConfig['chain'],
      maxBlockRange: row.max_block_range,
      votingPeriodHours: row.voting_period_hours,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };

    return decryptConfig(config);
  } catch (error) {
    logger.error('Failed to get oracle config from database', { error, instanceId });
    return null;
  }
}

/**
 * 保存 Oracle 配置到数据库
 */
export async function saveOracleConfigToDb(config: OracleConfig): Promise<void> {
  if (!hasDatabase()) {
    throw new Error('Database not available');
  }
  await ensureDb();

  const encryptedConfig = encryptConfig(config);

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO oracle_configs (
        instance_id, rpc_url, contract_address, chain, 
        max_block_range, voting_period_hours, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (instance_id) DO UPDATE SET
        rpc_url = EXCLUDED.rpc_url,
        contract_address = EXCLUDED.contract_address,
        chain = EXCLUDED.chain,
        max_block_range = EXCLUDED.max_block_range,
        voting_period_hours = EXCLUDED.voting_period_hours,
        updated_at = NOW()`,
      [
        config.instanceId,
        encryptedConfig.rpcUrl,
        config.contractAddress,
        config.chain,
        config.maxBlockRange,
        config.votingPeriodHours,
      ],
    );
  });

  logger.info('Oracle config saved to database', { instanceId: config.instanceId });
}

/**
 * 从数据库删除 Oracle 配置
 */
export async function deleteOracleConfigFromDb(instanceId: string): Promise<void> {
  if (!hasDatabase()) {
    throw new Error('Database not available');
  }
  await ensureDb();

  await query('DELETE FROM oracle_configs WHERE instance_id = $1', [instanceId]);
  logger.info('Oracle config deleted from database', { instanceId });
}

/**
 * 获取所有 Oracle 配置列表
 */
export async function listOracleConfigsFromDb(): Promise<OracleConfig[]> {
  if (!hasDatabase()) return [];
  await ensureDb();

  try {
    const result = await query<DbOracleConfig>(
      `SELECT * FROM oracle_configs ORDER BY created_at DESC`,
    );

    return result.rows.map((row) => {
      const config: OracleConfig = {
        instanceId: row.instance_id,
        rpcUrl: row.rpc_url,
        contractAddress: row.contract_address,
        chain: row.chain as OracleConfig['chain'],
        maxBlockRange: row.max_block_range,
        votingPeriodHours: row.voting_period_hours,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      };
      return decryptConfig(config);
    });
  } catch (error) {
    logger.error('Failed to list oracle configs from database', { error });
    return [];
  }
}

/**
 * 检查配置是否存在
 */
export async function configExistsInDb(instanceId: string): Promise<boolean> {
  if (!hasDatabase()) return false;
  await ensureDb();

  const result = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM oracle_configs WHERE instance_id = $1',
    [instanceId],
  );

  return parseInt(result.rows[0]?.count ?? '0', 10) > 0;
}
