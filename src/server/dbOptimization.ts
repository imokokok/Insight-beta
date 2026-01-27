import type pg from 'pg';
import { hasDatabase, query } from './db';
import { logger } from '@/lib/logger';

const OPTIMIZATION_DEFAULTS = {
  maxQueryTimeMs: 5000,
  slowQueryThresholdMs: 1000,
  connectionPoolSize: 20,
  idleTimeoutMs: 30000,
  maxUsesPerConnection: 1000,
};

interface QueryOptimizationHint {
  useIndex?: string;
  preferSeqScan?: boolean;
  enableNestLoop?: boolean;
  workMem?: string;
  effectiveCacheSize?: string;
}

interface OptimizedQueryResult<T> {
  rows: T[];
  queryTimeMs: number;
  isCached: boolean;
  rowCount: number;
}

const queryCache = new Map<string, { result: unknown; timestamp: number; ttlMs: number }>();
const globalForQueryCache = globalThis as unknown as {
  insightQueryCache?: Map<string, { result: unknown; timestamp: number; ttlMs: number }>;
};

const queryCacheRef = globalForQueryCache.insightQueryCache ?? queryCache;
if (process.env.NODE_ENV !== 'production') globalForQueryCache.insightQueryCache = queryCacheRef;

const slowQueries: Array<{ query: string; durationMs: number; timestamp: Date }> = [];
const globalForSlowQueries = globalThis as unknown as {
  insightSlowQueries?: Array<{ query: string; durationMs: number; timestamp: Date }>;
};

const slowQueriesRef = globalForSlowQueries.insightSlowQueries ?? slowQueries;
if (process.env.NODE_ENV !== 'production') globalForSlowQueries.insightSlowQueries = slowQueriesRef;

export function applyQueryHints(sql: string, hints: QueryOptimizationHint): string {
  if (!hasDatabase()) return sql;

  const hintComments: string[] = [];

  if (hints.useIndex) {
    hintComments.push(`/*+ IndexScan(${hints.useIndex}) */`);
  }

  if (hints.preferSeqScan) {
    hintComments.push('/*+ SeqScan(on) */');
  } else if (hints.preferSeqScan === false) {
    hintComments.push('/*+ SeqScan(off) */');
  }

  if (hints.enableNestLoop === false) {
    hintComments.push('/*+ NoNestLoop */');
  }

  if (hintComments.length > 0) {
    return `${hintComments.join(' ')} ${sql}`;
  }

  return sql;
}

export async function optimizedQuery<T extends pg.QueryResultRow>(
  sql: string,
  params: (string | number | boolean | Date | null | undefined | string[] | number[])[] = [],
  options: {
    cacheTtlMs?: number;
    queryName?: string;
    hints?: QueryOptimizationHint;
    timeoutMs?: number;
  } = {},
): Promise<OptimizedQueryResult<T>> {
  const startTime = performance.now();
  const cacheKey = options.queryName ?? `${sql}:${JSON.stringify(params)}`;

  const cached = queryCacheRef.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < cached.ttlMs) {
    const queryTimeMs = performance.now() - startTime;

    return {
      rows: cached.result as T[],
      queryTimeMs,
      isCached: true,
      rowCount: (cached.result as T[]).length,
    };
  }

  const optimizedSql = options.hints ? applyQueryHints(sql, options.hints) : sql;

  try {
    const result = await query<T>(optimizedSql, params);
    const queryTimeMs = performance.now() - startTime;

    if (queryTimeMs > OPTIMIZATION_DEFAULTS.slowQueryThresholdMs) {
      slowQueriesRef.push({
        query: optimizedSql.substring(0, 500),
        durationMs: queryTimeMs,
        timestamp: new Date(),
      });

      while (slowQueriesRef.length > 100) {
        slowQueriesRef.shift();
      }
    }

    if (options.cacheTtlMs && options.cacheTtlMs > 0) {
      queryCacheRef.set(cacheKey, {
        result: result.rows,
        timestamp: Date.now(),
        ttlMs: options.cacheTtlMs,
      });
    }

    return {
      rows: result.rows,
      queryTimeMs,
      isCached: false,
      rowCount: result.rows.length,
    };
  } catch (error) {
    const queryTimeMs = performance.now() - startTime;
    logger.error('Query execution failed', {
      query: optimizedSql.substring(0, 500),
      params: params.length,
      durationMs: queryTimeMs,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function batchQuery<T extends pg.QueryResultRow>(
  queries: Array<{
    sql: string;
    params?: (string | number | boolean | Date | null | undefined | string[] | number[])[];
    name?: string;
  }>,
  transaction: boolean = true,
): Promise<Map<string, OptimizedQueryResult<T>>> {
  const results = new Map<string, OptimizedQueryResult<T>>();

  if (queries.length === 0) return results;

  if (transaction && hasDatabase()) {
    try {
      await query('BEGIN');

      for (const q of queries) {
        const result = await optimizedQuery<T>(q.sql, q.params ?? [], { queryName: q.name });
        results.set(q.name ?? q.sql, result);
      }

      await query('COMMIT');
    } catch (error) {
      await query('ROLLBACK').catch(() => {});
      throw error;
    }
  } else {
    for (const q of queries) {
      const result = await optimizedQuery<T>(q.sql, q.params ?? [], { queryName: q.name });
      results.set(q.name ?? q.sql, result);
    }
  }

  return results;
}

export async function invalidateQueryCache(prefix?: string): Promise<number> {
  let deleted = 0;

  if (!prefix) {
    deleted = queryCacheRef.size;
    queryCacheRef.clear();
  } else {
    for (const key of queryCacheRef.keys()) {
      if (key.startsWith(prefix)) {
        queryCacheRef.delete(key);
        deleted++;
      }
    }
  }

  return deleted;
}

export function getQueryCacheStats(): {
  size: number;
  keys: string[];
  memoryEstimateBytes: number;
} {
  let memoryEstimate = 0;
  const keys: string[] = [];

  for (const [key, value] of queryCacheRef.entries()) {
    keys.push(key);
    memoryEstimate += key.length + JSON.stringify(value.result).length;
  }

  return {
    size: queryCacheRef.size,
    keys: keys.slice(0, 20),
    memoryEstimateBytes: memoryEstimate,
  };
}

export function getSlowQueries(
  limit: number = 20,
): Array<{ query: string; durationMs: number; timestamp: Date }> {
  return slowQueriesRef.sort((a, b) => b.durationMs - a.durationMs).slice(0, limit);
}

export async function analyzeQueryPerformance(
  sql: string,
  params: unknown[] = [],
): Promise<{
  planningTimeMs: number;
  executionTimeMs: number;
  rowsAffected: number;
  bufferHits: number;
  bufferMisses: number;
}> {
  if (!hasDatabase()) {
    return {
      planningTimeMs: 0,
      executionTimeMs: 0,
      rowsAffected: 0,
      bufferHits: 0,
      bufferMisses: 0,
    };
  }

  try {
    const explainResult = await query<{
      Plan?: {
        'Actual Rows'?: number;
        'Actual Total Time'?: number;
        'Planning Time'?: number;
        'Execution Time'?: number;
        'Shared Hit Blocks'?: number;
        'Shared Read Blocks'?: number;
      };
    }>(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`,
      params as (string | number | boolean | Date | null | undefined | string[] | number[])[],
    );

    const plan = explainResult.rows[0]?.['Plan'];

    return {
      planningTimeMs: plan?.['Planning Time'] ?? 0,
      executionTimeMs: plan?.['Actual Total Time'] ?? 0,
      rowsAffected: plan?.['Actual Rows'] ?? 0,
      bufferHits: plan?.['Shared Hit Blocks'] ?? 0,
      bufferMisses: plan?.['Shared Read Blocks'] ?? 0,
    };
  } catch {
    return {
      planningTimeMs: 0,
      executionTimeMs: 0,
      rowsAffected: 0,
      bufferHits: 0,
      bufferMisses: 0,
    };
  }
}

export async function getConnectionPoolStats(): Promise<{
  totalConnections: number;
  idleConnections: number;
  waitingConnections: number;
  maxConnections: number;
}> {
  if (!hasDatabase()) {
    return {
      totalConnections: 0,
      idleConnections: 0,
      waitingConnections: 0,
      maxConnections: 0,
    };
  }

  try {
    const result = await query<{
      total: number;
      idle: number;
      waiting: number;
      max: number;
    }>(`
      SELECT 
        count(*) as total,
        sum(CASE WHEN state = 'idle' THEN 1 ELSE 0 END) as idle,
        sum(CASE WHEN state = 'active' THEN 1 ELSE 0 END) as waiting,
        setting as max
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `);

    return {
      totalConnections: Number(result.rows[0]?.total ?? 0),
      idleConnections: Number(result.rows[0]?.idle ?? 0),
      waitingConnections: Number(result.rows[0]?.waiting ?? 0),
      maxConnections: Number(result.rows[0]?.max ?? 20),
    };
  } catch {
    return {
      totalConnections: 0,
      idleConnections: 0,
      waitingConnections: 0,
      maxConnections: 20,
    };
  }
}

export function clearSlowQueries(): void {
  slowQueriesRef.length = 0;
}

export const __TEST__ = {
  invalidateQueryCache,
  getQueryCacheStats,
  getSlowQueries,
  clearSlowQueries,
};
