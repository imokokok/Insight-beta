import pg from 'pg';

import { DB_POOL_CONFIG } from '@/config/constants';
import { env } from '@/config/env';
import { logger } from '@/shared/logger';
import type { Database } from '@/types/database/supabase';

const { Pool } = pg;

const globalForDb = globalThis as unknown as {
  conn: pg.Pool | undefined;
};

function getDbUrl(): string | null {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const url = new URL(supabaseUrl);
      const projectRef = url.hostname.split('.')[0];
      return `postgresql://postgres:${supabaseKey}@db.${projectRef}.supabase.co:5432/postgres`;
    } catch {
      return null;
    }
  }

  return null;
}

export function getDatabaseUrl(): string | null {
  return getDbUrl();
}

export function hasDatabase(): boolean {
  return Boolean(getDbUrl());
}

const poolConfig: pg.PoolConfig = {
  connectionString: getDbUrl() || undefined,
  max: DB_POOL_CONFIG.MAX_CONNECTIONS,
  min: DB_POOL_CONFIG.MIN_CONNECTIONS,
  idleTimeoutMillis: DB_POOL_CONFIG.IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: DB_POOL_CONFIG.CONNECTION_TIMEOUT_MS,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  statement_timeout: 30000,
  query_timeout: 30000,
  application_name: `oracle-monitor-${process.env.NODE_ENV || 'development'}`,
};

export const db = globalForDb.conn ?? new Pool(poolConfig);

if (process.env.NODE_ENV !== 'production') globalForDb.conn = db;

export type QueryResultRow = pg.QueryResultRow;

export interface QueryResult<T extends QueryResultRow = QueryResultRow> {
  rows: T[];
  rowCount: number | null;
  command: string;
  oid: number;
  fields: pg.FieldDef[];
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: (string | number | boolean | Date | null | undefined | string[] | number[])[],
): Promise<QueryResult<T>> {
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

export async function getClient(): Promise<pg.PoolClient> {
  if (!getDbUrl()) {
    throw new Error('missing_database_url');
  }
  return db.connect();
}

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

  if (stats.waitingCount > 5) {
    issues.push(`High waiting clients: ${stats.waitingCount}`);
    status = 'degraded';
  }

  if (stats.waitingCount > 20) {
    issues.push(`Critical waiting clients: ${stats.waitingCount}`);
    status = 'unhealthy';
  }

  const utilizationRate =
    stats.totalCount > 0 ? (stats.totalCount - stats.idleCount) / stats.totalCount : 0;
  if (utilizationRate > 0.9) {
    issues.push(`High pool utilization: ${(utilizationRate * 100).toFixed(1)}%`);
    if (status === 'healthy') status = 'degraded';
  }

  if (stats.totalCount > 0 && stats.idleCount === 0) {
    issues.push('No idle connections available');
    if (status === 'healthy') status = 'degraded';
  }

  if (getDbUrl()) {
    try {
      await query('SELECT 1');
    } catch {
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
    await Promise.race([db.end(), timeoutPromise]);
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

export type { Database };
