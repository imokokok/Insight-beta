import pg from 'pg';

import { DATABASE_CONFIG } from '@/lib/config/constants';
import { logger } from '@/lib/logger';

const { Pool } = pg;

const globalForDb = globalThis as unknown as {
  conn: pg.Pool | undefined;
};

function getDbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  return null;
}

export function getDatabaseUrl() {
  return getDbUrl();
}

export function hasDatabase() {
  return Boolean(getDbUrl());
}

const poolConfig = {
  connectionString: getDbUrl() || undefined,
  max: Math.max(
    10,
    Math.min(100, Number(process.env.INSIGHT_DB_POOL_SIZE) || DATABASE_CONFIG.DEFAULT_POOL_SIZE),
  ),
  min: Math.max(2, Math.min(10, Number(process.env.INSIGHT_DB_MIN_POOL) || 5)),
  idleTimeoutMillis: Math.max(
    10000,
    Number(process.env.INSIGHT_DB_IDLE_TIMEOUT) || DATABASE_CONFIG.DEFAULT_IDLE_TIMEOUT,
  ),
  connectionTimeoutMillis: Math.max(
    DATABASE_CONFIG.DEFAULT_CONNECTION_TIMEOUT,
    Number(process.env.INSIGHT_DB_CONNECTION_TIMEOUT) || 10000,
  ),
  acquireTimeoutMillis: Math.max(5000, Number(process.env.INSIGHT_DB_ACQUIRE_TIMEOUT) || 10000),
  maxUses: Math.max(
    1000,
    Number(process.env.INSIGHT_DB_MAX_USES) || DATABASE_CONFIG.DEFAULT_MAX_USES,
  ),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  statement_timeout: Math.max(5000, Number(process.env.INSIGHT_DB_STATEMENT_TIMEOUT) || 30000),
  query_timeout: Math.max(5000, Number(process.env.INSIGHT_DB_QUERY_TIMEOUT) || 30000),
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  application_name: `oracle-monitor-${process.env.NODE_ENV || 'development'}`,
  preparedStatements: true,
};

export const db = globalForDb.conn ?? new Pool(poolConfig);

if (process.env.NODE_ENV !== 'production') globalForDb.conn = db;

interface DatabaseError extends Error {
  message: string;
  code?: string;
  stack?: string;
}

interface PoolClient {
  on(event: string, listener: (...args: unknown[]) => void): void;
}

if (typeof (db as unknown as { on?: unknown }).on === 'function') {
  (db as unknown as PoolClient).on('error', (err: unknown) => {
    const errorObj = err instanceof Error ? (err as DatabaseError) : { message: String(err) };
    logger.error('Unexpected database pool error', {
      error: errorObj.message,
      code: (errorObj as DatabaseError).code,
    });
  });
  (db as unknown as PoolClient).on('connect', () => {
    logger.debug('New database connection established');
  });
  (db as unknown as PoolClient).on('acquire', () => {
    logger.trace('Connection acquired from pool');
  });
  (db as unknown as PoolClient).on('release', () => {
    logger.trace('Connection released back to pool');
  });
}

export type QueryResultRow = pg.QueryResultRow;

export async function query<T extends pg.QueryResultRow>(
  text: string,
  params?: (string | number | boolean | Date | null | undefined | string[] | number[])[],
) {
  if (!getDbUrl()) {
    throw new Error('missing_database_url');
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const client = await Promise.race([
      db.connect(),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error('database_connection_timeout'));
        });
      }),
    ]);

    clearTimeout(timeoutId);

    try {
      const res = await client.query<T>(text, params);
      return res;
    } finally {
      client.release();
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.message === 'database_connection_timeout') {
      throw new Error('database_connection_timeout');
    }
    throw error;
  }
}

export async function getClient() {
  if (!getDbUrl()) {
    throw new Error('missing_database_url');
  }
  return db.connect();
}

// ============================================================================
// 连接池健康检查
// ============================================================================

export interface PoolHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  lastCheck: string;
  issues: string[];
}

let lastHealthCheck: PoolHealthStatus | null = null;
let healthCheckInterval: ReturnType<typeof setInterval> | null = null;

export function getPoolStats(): {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
} {
  const pool = db as unknown as {
    totalCount?: number;
    idleCount?: number;
    waitingCount?: number;
    _clients?: unknown[];
    _idle?: unknown[];
    _pendingQueue?: unknown[];
  };

  return {
    totalCount: pool.totalCount ?? pool._clients?.length ?? 0,
    idleCount: pool.idleCount ?? pool._idle?.length ?? 0,
    waitingCount: pool.waitingCount ?? pool._pendingQueue?.length ?? 0,
  };
}

export async function checkPoolHealth(): Promise<PoolHealthStatus> {
  const stats = getPoolStats();
  const issues: string[] = [];

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // 检查等待客户端数量
  if (stats.waitingCount > 5) {
    issues.push(`High waiting clients: ${stats.waitingCount}`);
    status = 'degraded';
  }

  if (stats.waitingCount > 20) {
    issues.push(`Critical waiting clients: ${stats.waitingCount}`);
    status = 'unhealthy';
  }

  // 检查连接池利用率
  const utilizationRate = stats.totalCount > 0 ? (stats.totalCount - stats.idleCount) / stats.totalCount : 0;
  if (utilizationRate > 0.9) {
    issues.push(`High pool utilization: ${(utilizationRate * 100).toFixed(1)}%`);
    if (status === 'healthy') status = 'degraded';
  }

  // 检查是否所有连接都在使用
  if (stats.totalCount > 0 && stats.idleCount === 0) {
    issues.push('No idle connections available');
    if (status === 'healthy') status = 'degraded';
  }

  // 尝试执行简单查询验证连接
  if (getDbUrl()) {
    try {
      await query('SELECT 1');
    } catch (error) {
      issues.push('Database ping failed');
      status = 'unhealthy';
    }
  }

  lastHealthCheck = {
    status,
    totalConnections: stats.totalCount,
    idleConnections: stats.idleCount,
    waitingClients: stats.waitingCount,
    lastCheck: new Date().toISOString(),
    issues,
  };

  return lastHealthCheck;
}

export function startHealthCheck(intervalMs: number = 30000): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  healthCheckInterval = setInterval(async () => {
    const health = await checkPoolHealth();
    if (health.status !== 'healthy') {
      logger.warn('Database pool health check', {
        status: health.status,
        issues: health.issues,
        stats: {
          total: health.totalConnections,
          idle: health.idleConnections,
          waiting: health.waitingClients,
        },
      });
    }
  }, intervalMs);

  logger.info('Database pool health check started', { intervalMs });
}

export function stopHealthCheck(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    logger.info('Database pool health check stopped');
  }
}

// ============================================================================
// 优雅关闭
// ============================================================================

let isShuttingDown = false;

export async function gracefulShutdown(timeoutMs: number = 10000): Promise<void> {
  if (isShuttingDown) {
    logger.warn('Graceful shutdown already in progress');
    return;
  }

  isShuttingDown = true;
  logger.info('Starting graceful database shutdown...');

  stopHealthCheck();

  const timeoutPromise = new Promise<void>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Graceful shutdown timeout'));
    }, timeoutMs);
  });

  try {
    await Promise.race([
      db.end(),
      timeoutPromise,
    ]);
    logger.info('Database pool closed successfully');
  } catch (error) {
    logger.error('Error during database pool shutdown', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export function isPoolShuttingDown(): boolean {
  return isShuttingDown;
}

// ============================================================================
// 进程信号处理（自动优雅关闭）
// ============================================================================

if (typeof process !== 'undefined' && process.on) {
  const handleShutdown = async (signal: string) => {
    logger.info(`Received ${signal}, initiating graceful shutdown...`);
    try {
      await gracefulShutdown();
      process.exit(0);
    } catch (error) {
      logger.error('Graceful shutdown failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}
