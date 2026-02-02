/**
 * Versioning Module - 配置版本控制模块
 *
 * 支持配置版本保存、历史查询、回滚功能
 */

import type { OracleConfig } from '@/lib/types/oracleTypes';
import { hasDatabase, query } from '../db';

export interface ConfigVersion {
  id: number;
  instanceId: string;
  version: number;
  config: OracleConfig;
  changeType: 'create' | 'update' | 'rollback';
  changeReason?: string;
  createdBy?: string;
  createdAt: string;
}

/**
 * 保存配置版本
 */
export async function saveConfigVersion(
  instanceId: string,
  config: OracleConfig,
  changeType: 'create' | 'update' | 'rollback',
  options: {
    changeReason?: string;
    createdBy?: string;
  } = {},
): Promise<ConfigVersion> {
  if (!hasDatabase()) {
    throw new Error('Database not available');
  }

  const { changeReason, createdBy } = options;

  // 获取当前版本号
  const versionRes = await query<{ max_version: number }>(
    'SELECT COALESCE(MAX(version), 0) as max_version FROM config_versions WHERE instance_id = $1',
    [instanceId],
  );
  const version = (versionRes.rows[0]?.max_version || 0) + 1;

  const res = await query<{
    id: number;
    instance_id: string;
    version: number;
    config: string;
    change_type: string;
    change_reason: string | null;
    created_by: string | null;
    created_at: Date;
  }>(
    `INSERT INTO config_versions 
     (instance_id, version, config, change_type, change_reason, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING *`,
    [
      instanceId,
      version,
      JSON.stringify(config),
      changeType,
      changeReason || null,
      createdBy || null,
    ],
  );

  const row = res.rows[0];
  if (!row) {
    throw new Error('Failed to save config version');
  }
  return {
    id: row.id,
    instanceId: row.instance_id,
    version: row.version,
    config: JSON.parse(row.config) as OracleConfig,
    changeType: row.change_type as 'create' | 'update' | 'rollback',
    changeReason: row.change_reason || undefined,
    createdBy: row.created_by || undefined,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * 获取配置版本历史
 */
export async function getConfigVersions(
  instanceId: string,
  options: {
    limit?: number;
    offset?: number;
  } = {},
): Promise<{ versions: ConfigVersion[]; total: number }> {
  if (!hasDatabase()) {
    return { versions: [], total: 0 };
  }

  const { limit = 50, offset = 0 } = options;

  const [countRes, dataRes] = await Promise.all([
    query<{ count: number }>(
      'SELECT COUNT(*) as count FROM config_versions WHERE instance_id = $1',
      [instanceId],
    ),
    query<{
      id: number;
      instance_id: string;
      version: number;
      config: string;
      change_type: string;
      change_reason: string | null;
      created_by: string | null;
      created_at: Date;
    }>(
      `SELECT * FROM config_versions 
       WHERE instance_id = $1 
       ORDER BY version DESC 
       LIMIT $2 OFFSET $3`,
      [instanceId, limit, offset],
    ),
  ]);

  const versions = dataRes.rows.map((row) => ({
    id: row.id,
    instanceId: row.instance_id,
    version: row.version,
    config: JSON.parse(row.config) as OracleConfig,
    changeType: row.change_type as 'create' | 'update' | 'rollback',
    changeReason: row.change_reason || undefined,
    createdBy: row.created_by || undefined,
    createdAt: row.created_at.toISOString(),
  }));

  return {
    versions,
    total: parseInt(String(countRes.rows[0]?.count || '0'), 10),
  };
}

/**
 * 回滚到指定版本
 */
export async function rollbackConfigVersion(
  instanceId: string,
  version: number,
  options: {
    reason?: string;
    createdBy?: string;
  } = {},
): Promise<OracleConfig | null> {
  if (!hasDatabase()) {
    throw new Error('Database not available');
  }

  // 获取指定版本
  const res = await query<{
    config: string;
  }>('SELECT config FROM config_versions WHERE instance_id = $1 AND version = $2', [
    instanceId,
    version,
  ]);

  if (!res.rows[0]) {
    return null;
  }

  const config = JSON.parse(res.rows[0].config) as OracleConfig;

  // 保存回滚版本
  await saveConfigVersion(instanceId, config, 'rollback', {
    changeReason: options.reason || `Rollback to version ${version}`,
    createdBy: options.createdBy,
  });

  return config;
}
