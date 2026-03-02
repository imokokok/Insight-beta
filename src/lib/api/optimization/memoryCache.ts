/**
 * Simple Cache - 基于 LRUCache 的内存缓存
 *
 * 提供基本的缓存功能，用于服务器端数据缓存
 */

import type { LRUCacheOptions } from '@/lib/cache/lru-cache';
import { LRUCache } from '@/lib/cache/lru-cache';

export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(pattern?: string): Promise<void>;
}

class DefaultCache implements CacheProvider {
  private cache: LRUCache<string, unknown>;

  constructor(options: LRUCacheOptions = { maxSize: 1000, ttlMs: 60000 }) {
    this.cache = new LRUCache<string, unknown>(options);
  }

  async get<T>(key: string): Promise<T | null> {
    return this.cache.get<T>(key) as Promise<T | null>;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    this.cache.set(key, value, ttlMs);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(pattern?: string): Promise<void> {
    if (!pattern) {
      this.cache.clear();
    } else {
      this.cache.clearByPattern(pattern);
    }
  }
}

export const defaultCache = new DefaultCache();
