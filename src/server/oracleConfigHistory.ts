import { logger } from '@/lib/logger';

import { hasDatabase, query } from './db';
import { getMemoryStore } from './memoryBackend';

import type { OracleConfig } from './oracleConfig';

export type ConfigChangeType = 'create' | 'update' | 'delete' | 'rollback';

export interface ConfigHistoryEntry {
  id: number;
  instanceId: string;
  changedBy: string | null;
  changeType: ConfigChangeType;
  previousValues: Partial<OracleConfig> | null;
  newValues: Partial<OracleConfig> | null;
  changeReason: string | null;
  createdAt: string;
}

interface DbConfigHistoryRow {
  id: number | string;
  instance_id: string;
  changed_by: string | null;
  change_type: ConfigChangeType;
  previous_values: unknown;
  new_values: unknown;
  change_reason: string | null;
  created_at: Date;
}

const MEMORY_MAX_HISTORY = 100;

function mapHistoryRow(row: DbConfigHistoryRow): ConfigHistoryEntry {
  return {
    id: Number(row.id),
    instanceId: row.instance_id,
    changedBy: row.changed_by,
    changeType: row.change_type,
    previousValues: row.previous_values as Partial<OracleConfig> | null,
    newValues: row.new_values as Partial<OracleConfig> | null,
    changeReason: row.change_reason,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * 记录配置变更历史
 */
export async function recordConfigChange(
  instanceId: string,
  changeType: ConfigChangeType,
  previousValues: Partial<OracleConfig> | null,
  newValues: Partial<OracleConfig> | null,
  options?: {
    changedBy?: string;
    changeReason?: string;
  },
): Promise<ConfigHistoryEntry | null> {
  const changedBy = options?.changedBy ?? null;
  const changeReason = options?.changeReason ?? null;

  // Always store in memory
  const mem = getMemoryStore();
  const entry: ConfigHistoryEntry = {
    id: Date.now(),
    instanceId,
    changedBy,
    changeType,
    previousValues,
    newValues,
    changeReason,
    createdAt: new Date().toISOString(),
  };

  const key = `config-history:${instanceId}`;
  const existing = mem.configHistory?.get(key) || [];
  existing.unshift(entry);

  // Keep only last N entries per instance
  if (existing.length > MEMORY_MAX_HISTORY) {
    existing.length = MEMORY_MAX_HISTORY;
  }

  if (!mem.configHistory) {
    mem.configHistory = new Map();
  }
  mem.configHistory.set(key, existing);

  // Store in database if available
  if (!hasDatabase()) {
    return entry;
  }

  try {
    const result = await query<DbConfigHistoryRow>(
      `
      INSERT INTO oracle_config_history (
        instance_id, changed_by, change_type, previous_values, new_values, change_reason, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
      `,
      [
        instanceId,
        changedBy,
        changeType,
        previousValues ? JSON.stringify(previousValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        changeReason,
      ],
    );

    if (result.rows[0]) {
      return mapHistoryRow(result.rows[0]);
    }
  } catch (error) {
    logger.error('Failed to record config history', {
      error: error instanceof Error ? error.message : String(error),
      instanceId,
      changeType,
    });
  }

  return entry;
}

/**
 * 获取配置变更历史
 */
export async function getConfigHistory(params: {
  instanceId?: string;
  limit?: number;
  cursor?: number;
  changeType?: ConfigChangeType;
}): Promise<{
  items: ConfigHistoryEntry[];
  total: number;
  nextCursor: number | null;
}> {
  const instanceId = params.instanceId || 'default';
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = Math.max(0, params.cursor || 0);

  if (!hasDatabase()) {
    // Return from memory
    const mem = getMemoryStore();
    const key = `config-history:${instanceId}`;
    const items = (mem.configHistory?.get(key) || []) as ConfigHistoryEntry[];

    let filtered = items;
    if (params.changeType) {
      filtered = items.filter((item) => item.changeType === params.changeType);
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      items: paginated,
      total,
      nextCursor: offset + paginated.length < total ? offset + limit : null,
    };
  }

  // Query from database
  const conditions: string[] = ['instance_id = $1'];
  const values: (string | number)[] = [instanceId];
  let idx = 2;

  if (params.changeType) {
    conditions.push(`change_type = $${idx++}`);
    values.push(params.changeType);
  }

  const whereClause = conditions.join(' AND ');

  try {
    const countResult = await query<{ total: string }>(
      `SELECT COUNT(*) as total FROM oracle_config_history WHERE ${whereClause}`,
      values,
    );
    const total = Number(countResult.rows[0]?.total || 0);

    const result = await query<DbConfigHistoryRow>(
      `
      SELECT * FROM oracle_config_history
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
      `,
      [...values, limit, offset],
    );

    const items = result.rows.map(mapHistoryRow);

    return {
      items,
      total,
      nextCursor: offset + items.length < total ? offset + limit : null,
    };
  } catch (error) {
    logger.error('Failed to fetch config history', {
      error: error instanceof Error ? error.message : String(error),
      instanceId,
    });

    // Fallback to memory
    const mem = getMemoryStore();
    const key = `config-history:${instanceId}`;
    const items = (mem.configHistory?.get(key) || []) as ConfigHistoryEntry[];

    return {
      items: items.slice(offset, offset + limit),
      total: items.length,
      nextCursor: null,
    };
  }
}

/**
 * 获取特定历史版本
 */
export async function getConfigHistoryEntry(id: number): Promise<ConfigHistoryEntry | null> {
  if (!hasDatabase()) {
    // Search in memory
    const mem = getMemoryStore();
    for (const entries of mem.configHistory?.values() || []) {
      const found = (entries as ConfigHistoryEntry[]).find((e) => e.id === id);
      if (found) return found;
    }
    return null;
  }

  try {
    const result = await query<DbConfigHistoryRow>(
      'SELECT * FROM oracle_config_history WHERE id = $1',
      [id],
    );

    if (result.rows[0]) {
      return mapHistoryRow(result.rows[0]);
    }
  } catch (error) {
    logger.error('Failed to fetch config history entry', {
      error: error instanceof Error ? error.message : String(error),
      id,
    });
  }

  return null;
}

/**
 * 回滚到特定版本
 */
export async function rollbackConfig(
  historyId: number,
  options?: {
    changedBy?: string;
    changeReason?: string;
  },
): Promise<{
  success: boolean;
  config?: Partial<OracleConfig>;
  error?: string;
}> {
  const entry = await getConfigHistoryEntry(historyId);

  if (!entry) {
    return { success: false, error: 'History entry not found' };
  }

  if (!entry.previousValues) {
    return { success: false, error: 'No previous values to rollback to' };
  }

  // Record the rollback action
  await recordConfigChange(entry.instanceId, 'rollback', entry.newValues, entry.previousValues, {
    changedBy: options?.changedBy,
    changeReason: options?.changeReason || `Rollback to version ${historyId}`,
  });

  return {
    success: true,
    config: entry.previousValues,
  };
}

/**
 * 清理旧的历史记录
 */
export async function pruneConfigHistory(olderThanDays: number = 90): Promise<{ deleted: number }> {
  if (!hasDatabase()) {
    // Clean up memory
    const mem = getMemoryStore();
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    let deleted = 0;

    for (const [key, entries] of mem.configHistory?.entries() || []) {
      const filtered = (entries as ConfigHistoryEntry[]).filter((e) => {
        const keep = new Date(e.createdAt).getTime() > cutoff;
        if (!keep) deleted++;
        return keep;
      });
      mem.configHistory?.set(key, filtered);
    }

    return { deleted };
  }

  try {
    const result = await query(
      "DELETE FROM oracle_config_history WHERE created_at < NOW() - INTERVAL '$1 days'",
      [olderThanDays],
    );

    return { deleted: result.rowCount || 0 };
  } catch (error) {
    logger.error('Failed to prune config history', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { deleted: 0 };
  }
}

/**
 * 获取配置版本统计
 */
export async function getConfigHistoryStats(instanceId?: string): Promise<{
  totalChanges: number;
  changesByType: Record<ConfigChangeType, number>;
  lastChangeAt: string | null;
}> {
  const targetInstance = instanceId || 'default';

  if (!hasDatabase()) {
    const mem = getMemoryStore();
    const key = `config-history:${targetInstance}`;
    const entries = (mem.configHistory?.get(key) || []) as ConfigHistoryEntry[];

    const changesByType: Record<ConfigChangeType, number> = {
      create: 0,
      update: 0,
      delete: 0,
      rollback: 0,
    };

    for (const entry of entries) {
      changesByType[entry.changeType]++;
    }

    return {
      totalChanges: entries.length,
      changesByType,
      lastChangeAt: entries[0]?.createdAt || null,
    };
  }

  try {
    const result = await query<{
      total: string;
      create_count: string;
      update_count: string;
      delete_count: string;
      rollback_count: string;
      last_change: Date | null;
    }>(
      `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE change_type = 'create') as create_count,
        COUNT(*) FILTER (WHERE change_type = 'update') as update_count,
        COUNT(*) FILTER (WHERE change_type = 'delete') as delete_count,
        COUNT(*) FILTER (WHERE change_type = 'rollback') as rollback_count,
        MAX(created_at) as last_change
      FROM oracle_config_history
      WHERE instance_id = $1
      `,
      [targetInstance],
    );

    const row = result.rows[0];

    return {
      totalChanges: Number(row?.total || 0),
      changesByType: {
        create: Number(row?.create_count || 0),
        update: Number(row?.update_count || 0),
        delete: Number(row?.delete_count || 0),
        rollback: Number(row?.rollback_count || 0),
      },
      lastChangeAt: row?.last_change?.toISOString() || null,
    };
  } catch (error) {
    logger.error('Failed to fetch config history stats', {
      error: error instanceof Error ? error.message : String(error),
      instanceId: targetInstance,
    });

    return {
      totalChanges: 0,
      changesByType: { create: 0, update: 0, delete: 0, rollback: 0 },
      lastChangeAt: null,
    };
  }
}
