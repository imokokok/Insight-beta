/**
 * Simple Cache - 简化的内存缓存
 *
 * 仅提供基本的缓存功能，移除过度优化的 LRU 实现
 */

export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(pattern?: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  keys(pattern: string): Promise<string[]>;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class SimpleCache implements CacheProvider {
  private store = new Map<string, CacheEntry<unknown>>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs: number = 60000): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(pattern?: string): Promise<void> {
    if (!pattern) {
      this.store.clear();
      return;
    }

    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const result: string[] = [];
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        result.push(key);
      }
    }
    return result;
  }

  get size(): number {
    return this.store.size;
  }
}

export class CacheManager {
  private cache: CacheProvider;

  constructor(cache: CacheProvider) {
    this.cache = cache;
  }

  async get<T>(key: string): Promise<T | null> {
    return this.cache.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    return this.cache.set(key, value, ttlMs);
  }

  async delete(key: string): Promise<void> {
    return this.cache.delete(key);
  }

  async clear(pattern?: string): Promise<void> {
    return this.cache.clear(pattern);
  }
}

export const defaultCache = new SimpleCache();
export const cacheManager = new CacheManager(defaultCache);

export function generateCacheKey(prefix: string, ...parts: unknown[]): string {
  const serialized = parts
    .map((part) => {
      if (typeof part === 'object') {
        return JSON.stringify(part);
      }
      return String(part);
    })
    .join(':');

  return `${prefix}:${serialized}`;
}
