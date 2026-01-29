import { logger } from '@/lib/logger';
import {
  oracleConfigCache,
  oracleStatsCache,
  apiResponseCache,
  rateLimitCache,
  isRedisAvailable,
} from './redisCache';

interface CacheWarmupConfig {
  key: string;
  fetcher: () => Promise<unknown>;
  ttl?: number;
  priority?: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  memoryUsed: string;
}

// Cache warming queue
const warmupQueue: CacheWarmupConfig[] = [];
let isWarmingUp = false;

// Bloom filter for cache penetration protection
class BloomFilter {
  private bitArray: boolean[];
  private size: number;
  private hashCount: number;

  constructor(size: number = 10000, hashCount: number = 7) {
    this.size = size;
    this.hashCount = hashCount;
    this.bitArray = new Array(size).fill(false);
  }

  private hash(key: string, seed: number): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash + key.charCodeAt(i) + seed) | 0;
    }
    return Math.abs(hash) % this.size;
  }

  add(key: string): void {
    for (let i = 0; i < this.hashCount; i++) {
      this.bitArray[this.hash(key, i)] = true;
    }
  }

  mightContain(key: string): boolean {
    for (let i = 0; i < this.hashCount; i++) {
      if (!this.bitArray[this.hash(key, i)]) {
        return false;
      }
    }
    return true;
  }
}

const bloomFilter = new BloomFilter();

// Null value cache for penetration protection
const nullValueCache = new Map<string, number>();
const NULL_VALUE_TTL = 60000; // 1 minute

export function markKeyAsExisting(key: string): void {
  bloomFilter.add(key);
}

export function mightKeyExist(key: string): boolean {
  return bloomFilter.mightContain(key);
}

export function cacheNullValue(key: string): void {
  nullValueCache.set(key, Date.now() + NULL_VALUE_TTL);
}

export function isNullValueCached(key: string): boolean {
  const expiry = nullValueCache.get(key);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    nullValueCache.delete(key);
    return false;
  }
  return true;
}

export async function getWithPenetrationProtection<T>(
  cache: { get: (key: string) => Promise<T | null> },
  key: string,
  fetcher: () => Promise<T | null>,
): Promise<T | null> {
  // Check bloom filter first
  if (!mightKeyExist(key)) {
    const value = await fetcher();
    if (value) {
      markKeyAsExisting(key);
      await cache.get(key).then(() => {}); // Warm cache
    }
    return value;
  }

  // Check null value cache
  if (isNullValueCached(key)) {
    return null;
  }

  // Try cache
  const cached = await cache.get(key);
  if (cached) {
    return cached;
  }

  // Fetch from source
  const value = await fetcher();

  if (value) {
    markKeyAsExisting(key);
  } else {
    cacheNullValue(key);
  }

  return value;
}

export function registerCacheWarmup(config: CacheWarmupConfig): void {
  warmupQueue.push(config);
}

export async function executeCacheWarmup(): Promise<{
  warmed: number;
  failed: number;
  skipped: number;
}> {
  if (isWarmingUp || !isRedisAvailable()) {
    return { warmed: 0, failed: 0, skipped: 0 };
  }

  isWarmingUp = true;
  let warmed = 0;
  let failed = 0;
  let skipped = 0;

  try {
    // Sort by priority
    const sorted = warmupQueue.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const config of sorted) {
      try {
        const exists = await oracleConfigCache.has(config.key);
        if (exists) {
          skipped++;
          continue;
        }

        const value = await config.fetcher();
        if (value) {
          await oracleConfigCache.set(config.key, value as Record<string, unknown>, config.ttl);
          warmed++;
          logger.debug('Cache warmed', { key: config.key });
        }
      } catch (error) {
        failed++;
        logger.warn('Cache warmup failed', {
          key: config.key,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    isWarmingUp = false;
  }

  logger.info('Cache warmup completed', { warmed, failed, skipped });
  return { warmed, failed, skipped };
}

export async function warmupCriticalCaches(): Promise<void> {
  // Warmup oracle configs
  registerCacheWarmup({
    key: 'config:default',
    fetcher: async () => {
      const { readOracleConfig } = await import('./oracleConfig');
      return readOracleConfig('default');
    },
    ttl: 300,
    priority: 10,
  });

  // Warmup stats
  registerCacheWarmup({
    key: 'stats:default',
    fetcher: async () => {
      const { readOracleState } = await import('./oracleState');
      return readOracleState('default');
    },
    ttl: 60,
    priority: 5,
  });

  await executeCacheWarmup();
}

interface CacheStrategy {
  ttl: number;
  staleWhileRevalidate?: number;
  compression?: boolean;
}

const CACHE_STRATEGIES: Record<string, CacheStrategy> = {
  'oracle:config': { ttl: 60, staleWhileRevalidate: 300 },
  'oracle:stats': { ttl: 30, staleWhileRevalidate: 120 },
  'api:response': { ttl: 300, staleWhileRevalidate: 600 },
  ratelimit: { ttl: 60 },
  'user:session': { ttl: 1800 },
  'price:data': { ttl: 60, staleWhileRevalidate: 300 },
  'blockchain:sync': { ttl: 10 },
};

export function getCacheStrategy(cacheName: string): CacheStrategy {
  return CACHE_STRATEGIES[cacheName] || { ttl: 300 };
}

export async function getWithStaleWhileRevalidate<T>(
  cache: {
    get: (key: string) => Promise<T | null>;
    set: (key: string, value: T, ttl?: number) => Promise<boolean>;
  },
  key: string,
  fetcher: () => Promise<T>,
  strategy: CacheStrategy,
): Promise<T> {
  const cached = await cache.get(key);

  if (cached) {
    // Return cached value immediately
    // Trigger background revalidation if staleWhileRevalidate is configured
    if (strategy.staleWhileRevalidate) {
      setTimeout(async () => {
        try {
          const fresh = await fetcher();
          await cache.set(key, fresh, strategy.ttl);
        } catch (error) {
          logger.warn('Background revalidation failed', { key, error });
        }
      }, 0);
    }
    return cached;
  }

  // Cache miss - fetch and cache
  const value = await fetcher();
  await cache.set(key, value, strategy.ttl);
  return value;
}

export async function getCacheStats(): Promise<Record<string, CacheStats>> {
  if (!isRedisAvailable()) {
    return {};
  }

  // Stats collection would need Redis client access
  // For now, return empty stats
  return {};
}

export async function invalidateCachePattern(pattern: string): Promise<number> {
  // Pattern-based invalidation would need Redis client access
  logger.info('Cache invalidation requested', { pattern });
  return 0;
}

export async function prefetchRelatedData(
  baseKey: string,
  relatedKeys: string[],
  fetcher: (key: string) => Promise<unknown>,
): Promise<void> {
  const promises = relatedKeys.map(async (key) => {
    try {
      const value = await fetcher(key);
      if (value) {
        await oracleConfigCache.set(`${baseKey}:${key}`, value as Record<string, unknown>, 300);
      }
    } catch (error) {
      logger.warn('Prefetch failed', { key, error });
    }
  });

  await Promise.allSettled(promises);
}

// Multi-level cache with L1 (memory) and L2 (Redis)
class MultiLevelCache<T> {
  private l1Cache: Map<string, { value: T; expiry: number }>;
  private l1Ttl: number;
  private l2Cache: {
    get: (key: string) => Promise<T | null>;
    set: (key: string, value: T, ttl?: number) => Promise<boolean>;
  };
  private name: string;

  constructor(
    name: string,
    l2Cache: {
      get: (key: string) => Promise<T | null>;
      set: (key: string, value: T, ttl?: number) => Promise<boolean>;
    },
    l1Ttl: number = 5000,
  ) {
    this.name = name;
    this.l1Cache = new Map();
    this.l1Ttl = l1Ttl;
    this.l2Cache = l2Cache;
  }

  async get(key: string): Promise<T | null> {
    const fullKey = `${this.name}:${key}`;

    // L1 cache check
    const l1Entry = this.l1Cache.get(fullKey);
    if (l1Entry && Date.now() < l1Entry.expiry) {
      return l1Entry.value;
    }
    this.l1Cache.delete(fullKey);

    // L2 cache check
    const l2Value = await this.l2Cache.get(fullKey);
    if (l2Value) {
      // Populate L1 cache
      this.l1Cache.set(fullKey, { value: l2Value, expiry: Date.now() + this.l1Ttl });
      return l2Value;
    }

    return null;
  }

  async set(key: string, value: T, ttl?: number): Promise<void> {
    const fullKey = `${this.name}:${key}`;

    // Update L1 cache
    this.l1Cache.set(fullKey, { value, expiry: Date.now() + this.l1Ttl });

    // Update L2 cache
    await this.l2Cache.set(fullKey, value, ttl);
  }

  invalidate(key: string): void {
    const fullKey = `${this.name}:${key}`;
    this.l1Cache.delete(fullKey);
  }

  invalidateAll(): void {
    this.l1Cache.clear();
  }
}

export const multiLevelConfigCache = new MultiLevelCache('config', oracleConfigCache, 5000);
export const multiLevelStatsCache = new MultiLevelCache('stats', oracleStatsCache, 3000);

// Cache compression for large values
export function compressCacheValue<T>(value: T): string {
  try {
    const json = JSON.stringify(value);
    // Simple compression - in production use zlib
    return Buffer.from(json).toString('base64');
  } catch {
    return JSON.stringify(value);
  }
}

export function decompressCacheValue<T>(compressed: string): T | null {
  try {
    const json = Buffer.from(compressed, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    try {
      return JSON.parse(compressed);
    } catch {
      return null;
    }
  }
}

// Export all cache instances
export { oracleConfigCache, oracleStatsCache, apiResponseCache, rateLimitCache, isRedisAvailable };
