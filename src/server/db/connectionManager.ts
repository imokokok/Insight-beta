/**
 * Database Connection Manager
 * Supports read/write splitting for better performance
 */

import { Pool } from 'pg';

import { logger } from '@/lib/logger';

import type { PoolClient, QueryResult, QueryResultRow } from 'pg';

export interface DatabaseConfig {
  write: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean | { rejectUnauthorized: boolean };
  };
  read?: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean | { rejectUnauthorized: boolean };
  }[];
  poolSize?: number;
}

export type QueryMode = 'read' | 'write';

class ConnectionManager {
  private writePool: Pool | null = null;
  private readPools: Pool[] = [];
  private currentReadIndex = 0;
  private config: DatabaseConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Load database configuration from environment
   */
  private loadConfig(): DatabaseConfig {
    const writeConfig = {
      host: process.env.DB_WRITE_HOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_WRITE_PORT || process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'oracle_monitor',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: this.parseSSLConfig(process.env.DB_SSL),
    };

    const readConfigs: DatabaseConfig['read'] = [];

    // Parse read replica configurations
    const readHostCount = parseInt(process.env.DB_READ_HOST_COUNT || '0', 10);

    if (readHostCount > 0) {
      for (let i = 1; i <= readHostCount; i++) {
        readConfigs.push({
          host: process.env[`DB_READ_${i}_HOST`] || process.env.DB_HOST || 'localhost',
          port: parseInt(process.env[`DB_READ_${i}_PORT`] || process.env.DB_PORT || '5432', 10),
          database: process.env.DB_NAME || 'oracle_monitor',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || '',
          ssl: this.parseSSLConfig(process.env.DB_SSL),
        });
      }
    } else if (process.env.DB_READ_HOST) {
      // Single read replica
      readConfigs.push({
        host: process.env.DB_READ_HOST,
        port: parseInt(process.env.DB_READ_PORT || process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'oracle_monitor',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: this.parseSSLConfig(process.env.DB_SSL),
      });
    }

    return {
      write: writeConfig,
      read: readConfigs.length > 0 ? readConfigs : undefined,
      poolSize: parseInt(process.env.DB_POOL_SIZE || '20', 10),
    };
  }

  /**
   * Parse SSL configuration
   */
  private parseSSLConfig(sslEnv: string | undefined): boolean | { rejectUnauthorized: boolean } {
    if (!sslEnv) return false;
    if (sslEnv === 'true') return true;
    if (sslEnv === 'false') return false;
    if (sslEnv === 'rejectUnauthorized') return { rejectUnauthorized: false };
    return false;
  }

  /**
   * Initialize connection pools
   */
  async initialize(): Promise<void> {
    try {
      // Create write pool
      this.writePool = new Pool({
        ...this.config.write,
        max: this.config.poolSize || 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      this.writePool.on('error', (err) => {
        logger.error('Unexpected error on write pool', { error: err.message });
      });

      // Create read pools
      if (this.config.read && this.config.read.length > 0) {
        for (const readConfig of this.config.read) {
          const readPool = new Pool({
            ...readConfig,
            max: this.config.poolSize || 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
          });

          readPool.on('error', (err) => {
            logger.error('Unexpected error on read pool', { error: err.message });
          });

          this.readPools.push(readPool);
        }

        logger.info(
          `Database connection manager initialized with ${this.readPools.length} read replicas`,
        );
      } else {
        logger.info('Database connection manager initialized (no read replicas)');
      }
    } catch (error) {
      logger.error('Failed to initialize database connection manager', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get appropriate pool based on query mode
   */
  private getPool(mode: QueryMode = 'write'): Pool {
    if (mode === 'write' || this.readPools.length === 0) {
      if (!this.writePool) {
        throw new Error('Write pool not initialized');
      }
      return this.writePool;
    }

    // Round-robin selection of read pool
    const pool = this.readPools[this.currentReadIndex];
    if (!pool) {
      throw new Error('Read pool not available');
    }
    this.currentReadIndex = (this.currentReadIndex + 1) % this.readPools.length;
    return pool;
  }

  /**
   * Execute a query with automatic routing
   */
  async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[],
    mode: QueryMode = 'write',
  ): Promise<QueryResult<T>> {
    const pool = this.getPool(mode);
    const startTime = Date.now();

    try {
      const result = await pool.query<T>(sql, params);

      const duration = Date.now() - startTime;
      if (duration > 1000) {
        logger.warn('Slow query detected', {
          duration,
          mode,
          sql: sql.substring(0, 100),
        });
      }

      return result;
    } catch (error) {
      logger.error('Query failed', {
        error: error instanceof Error ? error.message : String(error),
        mode,
        sql: sql.substring(0, 100),
      });
      throw error;
    }
  }

  /**
   * Get a client from the appropriate pool
   */
  async getClient(mode: QueryMode = 'write'): Promise<PoolClient> {
    const pool = this.getPool(mode);
    return pool.connect();
  }

  /**
   * Execute a read query (routed to read replicas)
   */
  async readQuery<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    return this.query<T>(sql, params, 'read');
  }

  /**
   * Execute a write query (routed to primary)
   */
  async writeQuery<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    return this.query<T>(sql, params, 'write');
  }

  /**
   * Execute transaction (always uses write pool)
   */
  async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient('write');

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check health of all pools
   */
  async healthCheck(): Promise<{
    write: boolean;
    read: boolean[];
  }> {
    const results = {
      write: false,
      read: [] as boolean[],
    };

    // Check write pool
    try {
      if (this.writePool) {
        await this.writePool.query('SELECT 1');
        results.write = true;
      }
    } catch (error) {
      logger.error('Write pool health check failed', { error });
    }

    // Check read pools
    for (const pool of this.readPools) {
      try {
        await pool.query('SELECT 1');
        results.read.push(true);
      } catch (error) {
        logger.error('Read pool health check failed', { error });
        results.read.push(false);
      }
    }

    return results;
  }

  /**
   * Close all pools
   */
  async close(): Promise<void> {
    if (this.writePool) {
      await this.writePool.end();
    }

    for (const pool of this.readPools) {
      await pool.end();
    }

    logger.info('All database connections closed');
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    write: { total: number; idle: number; waiting: number } | null;
    read: { total: number; idle: number; waiting: number }[];
  } {
    return {
      write: this.writePool
        ? {
            total: this.writePool.totalCount,
            idle: this.writePool.idleCount,
            waiting: this.writePool.waitingCount,
          }
        : null,
      read: this.readPools.map((pool) => ({
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      })),
    };
  }
}

// Export singleton instance
export const connectionManager = new ConnectionManager();

// Backward compatibility - default query function
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return connectionManager.query<T>(sql, params, 'write');
}
