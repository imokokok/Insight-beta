import { logger } from '@/lib/logger';
import { env } from '@/lib/config/env';
import type { RedisClientType } from 'redis';

// Redis client type - dynamically imported to avoid bundling issues
let redisClient: RedisClientType | null = null;
let redisConnected = false;

const REDIS_URL = env.INSIGHT_REDIS_URL || process.env.INSIGHT_REDIS_URL || '';

/**
 * Check if Redis is configured and available
 */
export function isRedisAvailable(): boolean {
  return !!REDIS_URL && REDIS_URL.startsWith('redis://');
}

/**
 * Get or create Redis client
 */
async function getRedisClient(): Promise<RedisClientType | null> {
  if (!isRedisAvailable()) return null;

  if (redisClient) return redisClient;

  try {
    // Dynamic import to avoid issues when Redis is not available
    const { createClient } = await import('redis');

    redisClient = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            logger.error('Redis max reconnection attempts reached');
            return false;
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err: Error) => {
      logger.error('Redis client error', { error: err.message });
      redisConnected = false;
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
      redisConnected = true;
    });

    redisClient.on('disconnect', () => {
      logger.warn('Redis client disconnected');
      redisConnected = false;
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Failed to create Redis client', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Cache entry metadata
 */
interface CacheMetadata {
  createdAt: number;
  expiresAt: number;
  version: number;
}

/**
 * Redis Cache implementation for distributed caching
 */
export class RedisCache<T> {
  private prefix: string;
  private defaultTtl: number;
  private version: number;

  constructor(
    options: { prefix: string; defaultTtl?: number; version?: number } = { prefix: 'cache' },
  ) {
    this.prefix = options.prefix;
    this.defaultTtl = options.defaultTtl ?? 300; // 5 minutes default
    this.version = options.version ?? 1;
  }

  /**
   * Build cache key with prefix
   */
  private buildKey(key: string): string {
    return `oracle-monitor:${this.prefix}:v${this.version}:${key}`;
  }

  /**
   * Get value from cache
   */
  async get(key: string): Promise<T | null> {
    if (!isRedisAvailable()) return null;

    try {
      const client = await getRedisClient();
      if (!client) return null;

      const data = await client.get(this.buildKey(key));
      if (!data) return null;

      const parsed = JSON.parse(data);

      // Check version
      if (parsed._meta?.version !== this.version) {
        await this.delete(key);
        return null;
      }

      // Check expiration
      if (parsed._meta?.expiresAt && Date.now() > parsed._meta.expiresAt) {
        await this.delete(key);
        return null;
      }

      return parsed.value as T;
    } catch (error) {
      logger.error('Redis cache get error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: T, ttl?: number): Promise<boolean> {
    if (!isRedisAvailable()) return false;

    try {
      const client = await getRedisClient();
      if (!client) return false;

      const effectiveTtl = ttl ?? this.defaultTtl;
      const data = {
        value,
        _meta: {
          createdAt: Date.now(),
          expiresAt: Date.now() + effectiveTtl * 1000,
          version: this.version,
        } as CacheMetadata,
      };

      await client.setEx(this.buildKey(key), effectiveTtl, JSON.stringify(data));
      return true;
    } catch (error) {
      logger.error('Redis cache set error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!isRedisAvailable()) return false;

    try {
      const client = await getRedisClient();
      if (!client) return false;

      await client.del(this.buildKey(key));
      return true;
    } catch (error) {
      logger.error('Redis cache delete error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    if (!isRedisAvailable()) return false;

    try {
      const client = await getRedisClient();
      if (!client) return false;

      const exists = await client.exists(this.buildKey(key));
      return exists === 1;
    } catch (error) {
      logger.error('Redis cache has error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get multiple values from cache
   */
  async mget(keys: string[]): Promise<(T | null)[]> {
    if (!isRedisAvailable() || keys.length === 0) {
      return keys.map(() => null);
    }

    try {
      const client = await getRedisClient();
      if (!client) return keys.map(() => null);

      const prefixedKeys = keys.map((k) => this.buildKey(k));
      const results = await client.mGet(prefixedKeys);

      return results.map((data: string | null) => {
        if (!data) return null;

        try {
          const parsed = JSON.parse(data);

          // Check version and expiration
          if (parsed._meta?.version !== this.version) return null;
          if (parsed._meta?.expiresAt && Date.now() > parsed._meta.expiresAt) return null;

          return parsed.value as T;
        } catch {
          return null;
        }
      });
    } catch (error) {
      logger.error('Redis cache mget error', {
        keys,
        error: error instanceof Error ? error.message : String(error),
      });
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values in cache
   */
  async mset(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<boolean> {
    if (!isRedisAvailable() || entries.length === 0) return false;

    try {
      const client = await getRedisClient();
      if (!client) return false;

      const multi = client.multi();

      for (const entry of entries) {
        const effectiveTtl = entry.ttl ?? this.defaultTtl;
        const data = {
          value: entry.value,
          _meta: {
            createdAt: Date.now(),
            expiresAt: Date.now() + effectiveTtl * 1000,
            version: this.version,
          } as CacheMetadata,
        };

        multi.setEx(this.buildKey(entry.key), effectiveTtl, JSON.stringify(data));
      }

      await multi.exec();
      return true;
    } catch (error) {
      logger.error('Redis cache mset error', {
        entries: entries.length,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Delete multiple keys from cache
   */
  async mdel(keys: string[]): Promise<boolean> {
    if (!isRedisAvailable() || keys.length === 0) return false;

    try {
      const client = await getRedisClient();
      if (!client) return false;

      const prefixedKeys = keys.map((k) => this.buildKey(k));
      await client.del(prefixedKeys);
      return true;
    } catch (error) {
      logger.error('Redis cache mdel error', {
        keys,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Clear all keys with this prefix
   */
  async clear(): Promise<boolean> {
    if (!isRedisAvailable()) return false;

    try {
      const client = await getRedisClient();
      if (!client) return false;

      const pattern = this.buildKey('*');
      const keys: string[] = [];

      // Scan for keys
      for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        keys.push(key);

        // Delete in batches of 100
        if (keys.length >= 100) {
          await client.del(keys);
          keys.length = 0;
        }
      }

      // Delete remaining keys
      if (keys.length > 0) {
        await client.del(keys);
      }

      return true;
    } catch (error) {
      logger.error('Redis cache clear error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async stats(): Promise<{ keys: number; connected: boolean }> {
    if (!isRedisAvailable()) {
      return { keys: 0, connected: false };
    }

    try {
      const client = await getRedisClient();
      if (!client) return { keys: 0, connected: false };

      const pattern = this.buildKey('*');
      let count = 0;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        count++;
      }

      return { keys: count, connected: redisConnected };
    } catch (error) {
      logger.error('Redis cache stats error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return { keys: 0, connected: false };
    }
  }

  /**
   * Increment a counter
   */
  async increment(key: string, amount: number = 1): Promise<number | null> {
    if (!isRedisAvailable()) return null;

    try {
      const client = await getRedisClient();
      if (!client) return null;

      const result = await client.incrBy(this.buildKey(key), amount);
      return result;
    } catch (error) {
      logger.error('Redis cache increment error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Set expiration on a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!isRedisAvailable()) return false;

    try {
      const client = await getRedisClient();
      if (!client) return false;

      const result = await client.expire(this.buildKey(key), seconds);
      return result;
    } catch (error) {
      logger.error('Redis cache expire error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get TTL of a key
   */
  async ttl(key: string): Promise<number> {
    if (!isRedisAvailable()) return -2;

    try {
      const client = await getRedisClient();
      if (!client) return -2;

      const result = await client.ttl(this.buildKey(key));
      return result;
    } catch (error) {
      logger.error('Redis cache ttl error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return -2;
    }
  }
}

// Global cache instances
export const oracleConfigCache = new RedisCache<Record<string, unknown>>({
  prefix: 'oracle:config',
  defaultTtl: 60, // 1 minute for config
  version: 1,
});

export const oracleStatsCache = new RedisCache<Record<string, unknown>>({
  prefix: 'oracle:stats',
  defaultTtl: 30, // 30 seconds for stats
  version: 1,
});

export const apiResponseCache = new RedisCache<Record<string, unknown>>({
  prefix: 'api:response',
  defaultTtl: 300, // 5 minutes for API responses
  version: 1,
});

export const rateLimitCache = new RedisCache<number>({
  prefix: 'ratelimit',
  defaultTtl: 60, // 1 minute for rate limiting
  version: 1,
});

/**
 * Get Redis connection status
 */
export async function getRedisStatus(): Promise<{
  available: boolean;
  connected: boolean;
  url: string;
}> {
  const available = isRedisAvailable();

  if (!available) {
    return { available: false, connected: false, url: '' };
  }

  // Mask credentials in URL for logging
  const maskedUrl = REDIS_URL.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@');

  try {
    const client = await getRedisClient();
    const connected = client !== null && redisConnected;

    return {
      available: true,
      connected,
      url: maskedUrl,
    };
  } catch {
    return {
      available: true,
      connected: false,
      url: maskedUrl,
    };
  }
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      redisConnected = false;
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
