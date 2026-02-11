import { logger } from '@/lib/logger';

import { getClient, hasDatabase, query } from './db';

import type { PoolClient } from 'pg';

export type QueryResultRow = Record<string, unknown>;

export interface QueryResult<T extends QueryResultRow = QueryResultRow> {
  rows: T[];
  rowCount: number;
}

interface SlowQuery {
  query: string;
  durationMs: number;
  timestamp: number;
  params?: unknown[];
}

interface QueryStats {
  query: string;
  count: number;
  totalTime: number;
  avgTime: number;
  maxTime: number;
  minTime: number;
}

const slowQueryLog: SlowQuery[] = [];
const queryStats = new Map<string, QueryStats>();
const MAX_SLOW_QUERIES = 100;
const SLOW_QUERY_THRESHOLD = 50; // ms

export function logSlowQuery(queryText: string, durationMs: number, params?: unknown[]) {
  if (durationMs < SLOW_QUERY_THRESHOLD) return;

  const entry: SlowQuery = {
    query: queryText.slice(0, 500),
    durationMs,
    timestamp: Date.now(),
    params: params?.slice(0, 10),
  };

  slowQueryLog.unshift(entry);
  if (slowQueryLog.length > MAX_SLOW_QUERIES) {
    slowQueryLog.pop();
  }

  logger.warn('Slow query detected', {
    query: entry.query,
    durationMs,
    params: entry.params,
  });
}

export function recordQueryStats(queryText: string, durationMs: number) {
  const normalized = queryText.replace(/\$\d+/g, '?').replace(/\s+/g, ' ').trim().slice(0, 200);

  const existing = queryStats.get(normalized);
  if (existing) {
    existing.count++;
    existing.totalTime += durationMs;
    existing.avgTime = existing.totalTime / existing.count;
    existing.maxTime = Math.max(existing.maxTime, durationMs);
    existing.minTime = Math.min(existing.minTime, durationMs);
  } else {
    queryStats.set(normalized, {
      query: normalized,
      count: 1,
      totalTime: durationMs,
      avgTime: durationMs,
      maxTime: durationMs,
      minTime: durationMs,
    });
  }
}

export function getSlowQueries(limit: number = 20): SlowQuery[] {
  return slowQueryLog.slice(0, limit);
}

export function getQueryStats(): QueryStats[] {
  return Array.from(queryStats.values())
    .sort((a, b) => b.avgTime - a.avgTime)
    .slice(0, 50);
}

export function clearQueryStats() {
  queryStats.clear();
}

export async function withQueryOptimization<T>(
  queryText: string,
  params: unknown[],
  executor: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await executor();
    const duration = Date.now() - start;

    recordQueryStats(queryText, duration);
    logSlowQuery(queryText, duration, params);

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    recordQueryStats(queryText, duration);
    throw error;
  }
}

interface BatchInsertOptions {
  batchSize?: number;
  onProgress?: (inserted: number, total: number) => void;
}

export async function batchInsert<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  options: BatchInsertOptions = {},
): Promise<number> {
  if (!hasDatabase() || rows.length === 0) return 0;

  const { batchSize = 1000, onProgress } = options;
  const firstRow = rows[0];
  if (!firstRow) return 0;
  const columns = Object.keys(firstRow);

  let inserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const placeholders: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const row of batch) {
      const rowPlaceholders: string[] = [];
      for (const col of columns) {
        rowPlaceholders.push(`$${paramIndex++}`);
        values.push(row[col]);
      }
      placeholders.push(`(${rowPlaceholders.join(', ')})`);
    }

    const queryText = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${placeholders.join(', ')}
      ON CONFLICT DO NOTHING
    `;

    try {
      await query(
        queryText,
        values as (string | number | boolean | string[] | number[] | Date | null | undefined)[],
      );
      inserted += batch.length;
      onProgress?.(inserted, rows.length);
    } catch (error) {
      logger.error('Batch insert failed', {
        table,
        batchIndex: i / batchSize,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  return inserted;
}

export async function batchUpdate<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  keyColumn: string,
  updateColumns: string[],
  options: BatchInsertOptions = {},
): Promise<number> {
  if (!hasDatabase() || rows.length === 0) return 0;

  const { batchSize = 500, onProgress } = options;
  let updated = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 使用 CASE WHEN 语法进行批量更新，避免 N+1 查询
      const caseStatements = updateColumns
        .map(
          (col) =>
            `${col} = CASE ${keyColumn} ${batch.map((_, idx) => `WHEN $${idx + 1} THEN $${batch.length + idx + 1}`).join(' ')} END`,
        )
        .join(', ');

      const keyValues = batch.map((row) => row[keyColumn]);
      const updateValues = updateColumns.flatMap((col) => batch.map((row) => row[col]));

      await client.query(
        `UPDATE ${table} SET ${caseStatements} WHERE ${keyColumn} IN (${batch.map((_, idx) => `$${idx + 1}`).join(',')})`,
        [...keyValues, ...updateValues],
      );

      await client.query('COMMIT');
      updated += batch.length;
      onProgress?.(updated, rows.length);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Batch update failed', {
        table,
        batchIndex: i / batchSize,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      client.release();
    }
  }

  return updated;
}

interface ConnectionPoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

export async function getConnectionPoolStats(): Promise<ConnectionPoolStats | null> {
  if (!hasDatabase()) return null;

  try {
    const result = await query<{
      total_count: number;
      idle_count: number;
      waiting_count: number;
    }>(`
      SELECT 
        count(*) as total_count,
        count(*) FILTER (WHERE state = 'idle') as idle_count,
        count(*) FILTER (WHERE wait_event_type = 'Client') as waiting_count
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);

    const row = result.rows[0];
    if (!row) {
      return { totalCount: 0, idleCount: 0, waitingCount: 0 };
    }
    return {
      totalCount: Number(row.total_count),
      idleCount: Number(row.idle_count),
      waitingCount: Number(row.waiting_count),
    };
  } catch (error) {
    logger.error('Failed to get connection pool stats', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function vacuumTable(tableName: string): Promise<boolean> {
  if (!hasDatabase()) return false;

  try {
    await query(`VACUUM ANALYZE ${tableName}`);
    logger.info('Vacuumed table', { table: tableName });
    return true;
  } catch (error) {
    logger.error('Failed to vacuum table', {
      table: tableName,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function vacuumAllTables(): Promise<{ vacuumed: number; failed: number }> {
  if (!hasDatabase()) return { vacuumed: 0, failed: 0 };

  try {
    const result = await query<{ tablename: string }>(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);

    let vacuumed = 0;
    let failed = 0;

    for (const { tablename } of result.rows) {
      const success = await vacuumTable(tablename);
      if (success) vacuumed++;
      else failed++;
    }

    return { vacuumed, failed };
  } catch (error) {
    logger.error('Failed to get table list for vacuum', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { vacuumed: 0, failed: 0 };
  }
}

interface TableBloatInfo {
  tableName: string;
  bloatRatio: number;
  estimatedRows: number;
}

export async function getTableBloat(): Promise<TableBloatInfo[]> {
  if (!hasDatabase()) return [];

  try {
    const result = await query<{
      tablename: string;
      bloat_ratio: number;
      estimated_rows: number;
    }>(`
      SELECT
        schemaname || '.' || relname as tablename,
        CASE WHEN n_live_tup > 0 
          THEN round(100.0 * n_dead_tup / n_live_tup, 2)
          ELSE 0 
        END as bloat_ratio,
        n_live_tup as estimated_rows
      FROM pg_stat_user_tables
      WHERE n_dead_tup > 1000
      ORDER BY n_dead_tup DESC
    `);

    return result.rows.map((row) => ({
      tableName: row.tablename,
      bloatRatio: Number(row.bloat_ratio),
      estimatedRows: Number(row.estimated_rows),
    }));
  } catch (error) {
    logger.error('Failed to get table bloat info', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export async function explainQuery(queryText: string, params?: unknown[]): Promise<unknown> {
  if (!hasDatabase()) return null;

  try {
    const result = await query(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${queryText}`,
      params as
        | (string | number | boolean | string[] | number[] | Date | null | undefined)[]
        | undefined,
    );
    return result.rows[0];
  } catch (error) {
    logger.error('Failed to explain query', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
  options: { timeout?: number } = {},
): Promise<T> {
  const client = await getClient();
  const timeout = options.timeout || 30000;

  try {
    await client.query('BEGIN');

    const timeoutId = setTimeout(async () => {
      try {
        await client.query('ROLLBACK');
        logger.error('Transaction timeout, rolled back');
      } catch (error: unknown) {
        logger.error('Failed to rollback timed out transaction', { error });
      }
    }, timeout);

    try {
      const result = await fn(client);
      await client.query('COMMIT');
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      logger.error('Transaction rollback failed', {
        rollbackError:
          rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
        originalError: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `Transaction rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
      );
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function getDatabaseSize(): Promise<{ size: string; bytes: number } | null> {
  if (!hasDatabase()) return null;

  try {
    const result = await query<{
      pg_size_pretty: string;
      pg_database_size: number;
    }>(`
      SELECT 
        pg_size_pretty(pg_database_size(current_database())),
        pg_database_size(current_database())
    `);

    const row = result.rows[0];
    if (!row) return null;
    return {
      size: row.pg_size_pretty,
      bytes: Number(row.pg_database_size),
    };
  } catch (error) {
    logger.error('Failed to get database size', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
