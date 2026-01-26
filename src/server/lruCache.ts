import { logger } from '@/lib/logger';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

interface LruCacheOptions {
  maxSize?: number;
  defaultTtl?: number;
  maxTtl?: number;
}

export class LruCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private defaultTtl: number;
  private maxTtl: number;
  private hits = 0;
  private misses = 0;

  constructor(options: LruCacheOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize ?? 1000;
    this.defaultTtl = options.defaultTtl ?? 60_000;
    this.maxTtl = options.maxTtl ?? 300_000;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    entry.accessCount++;
    entry.lastAccessed = Date.now();

    this.cache.delete(key);
    this.cache.set(key, entry);

    this.hits++;
    return entry.value;
  }

  set(key: string, value: T, ttl?: number): void {
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed();
    }

    const effectiveTtl = Math.min(ttl ?? this.defaultTtl, this.maxTtl);
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + effectiveTtl,
      accessCount: 1,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry);
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private evictLeastUsed(): void {
    let minAccess = Infinity;
    let evictKey: string | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < minAccess) {
        minAccess = entry.accessCount;
        evictKey = key;
      }
    }

    if (evictKey) {
      this.cache.delete(evictKey);
    }
  }

  peek(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      return null;
    }
    return entry.value;
  }

  size(): number {
    this.cleanup();
    return this.cache.size;
  }

  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  stats(): { hits: number; misses: number; size: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
}

export const globalApiCache = new LruCache<unknown>({
  maxSize: 500,
  defaultTtl: 30_000,
  maxTtl: 120_000,
});

export const globalQueryCache = new LruCache<unknown>({
  maxSize: 200,
  defaultTtl: 60_000,
  maxTtl: 300_000,
});

setInterval(() => {
  globalApiCache.cleanup();
  globalQueryCache.cleanup();
  logger.debug('Cache cleanup completed', {
    apiCache: globalApiCache.stats(),
    queryCache: globalQueryCache.stats(),
  });
}, 60_000);
