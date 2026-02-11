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
