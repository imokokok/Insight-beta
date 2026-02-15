/**
 * API Cache Service - API 缓存服务
 *
 * 提供内存缓存功能，支持 TTL 和缓存大小限制
 */

import type { CacheEntry, CacheOptions } from '@/types/analytics/deviation';
import { logger } from '@/shared/logger';

class APICacheService {
  private cache: Map<string, CacheEntry<unknown>>;
  private maxSize: number;
  private defaultTtlMs: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(options: CacheOptions = { ttlMs: 60000, maxSize: 100 }) {
    this.cache = new Map();
    this.defaultTtlMs = options.ttlMs;
    this.maxSize = options.maxSize || 100;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    const now = Date.now();
    const ttl = ttlMs || this.defaultTtlMs;

    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  cleanExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('API cache cleaned', { cleanedEntries: cleaned, remainingEntries: this.cache.size });
    }

    return cleaned;
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  generateCacheKey(params: Record<string, unknown>): string {
    const sorted = Object.keys(params)
      .sort()
      .map((key) => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    return sorted;
  }
}

export const apiCacheService = new APICacheService({
  ttlMs: 60000,
  maxSize: 200,
});

setInterval(() => {
  apiCacheService.cleanExpired();
}, 60000);
