/**
 * API Cache - API 响应缓存
 *
 * 提供 Redis 和内存缓存支持
 */

import { logger } from '@/lib/logger';

// ============================================================================
// 缓存接口
// ============================================================================

export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(pattern?: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  keys(pattern: string): Promise<string[]>;
}

// ============================================================================
// 内存缓存实现
// ============================================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache implements CacheProvider {
  private store = new Map<string, CacheEntry<unknown>>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
    this.startCleanup();
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs: number = 60000): Promise<void> {
    // LRU: 如果超过最大大小，删除最旧的条目
    if (this.store.size >= this.maxSize) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }

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

    // eslint-disable-next-line security/detect-non-literal-regexp
    const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
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
    const result: string[] = [];
    // eslint-disable-next-line security/detect-non-literal-regexp
    const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        result.push(key);
      }
    }
    return result;
  }

  private startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now > entry.expiresAt) {
          this.store.delete(key);
        }
      }
    }, 60000); // 每分钟清理一次
  }
}

// ============================================================================
// Redis 缓存实现（完整版）
// ============================================================================

interface RedisClient {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<void>;
  del(...keys: string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  exists(...keys: string[]): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  srem(key: string, ...members: string[]): Promise<number>;
}

export class RedisCache implements CacheProvider {
  private client: RedisClient;

  constructor(client: RedisClient) {
    this.client = client;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error('Redis get failed', { key, error });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlMs: number = 60000): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.client.setex(key, Math.ceil(ttlMs / 1000), serialized);
    } catch (error) {
      logger.error('Redis set failed', { key, error });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Redis delete failed', { key, error });
    }
  }

  async clear(pattern?: string): Promise<void> {
    try {
      if (!pattern) {
        // 危险操作：删除所有键
        logger.warn('Redis clear all called');
        return;
      }

      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      logger.error('Redis clear failed', { pattern, error });
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      logger.error('Redis exists failed', { key, error });
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error('Redis keys failed', { pattern, error });
      return [];
    }
  }

  /**
   * 设置带标签的缓存值
   */
  async setWithTags<T>(
    key: string,
    value: T,
    tags: string[],
    ttlMs: number = 60000,
  ): Promise<void> {
    await this.set(key, value, ttlMs);

    // 将键添加到各个标签集合中
    for (const tag of tags) {
      try {
        await this.client.sadd(`tag:${tag}`, key);
      } catch (error) {
        logger.error('Redis sadd failed', { tag, key, error });
      }
    }
  }

  /**
   * 根据标签删除缓存
   */
  async invalidateByTag(tag: string): Promise<void> {
    try {
      const keys = await this.client.smembers(`tag:${tag}`);
      if (keys.length > 0) {
        await this.client.del(...keys);
        await this.client.del(`tag:${tag}`);
      }
    } catch (error) {
      logger.error('Redis invalidateByTag failed', { tag, error });
    }
  }

  /**
   * 根据多个标签删除缓存
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    await Promise.all(tags.map((tag) => this.invalidateByTag(tag)));
  }
}

// ============================================================================
// 带标签的缓存包装器
// ============================================================================

export class TaggedCache {
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

  /**
   * 设置带标签的缓存
   */
  async setWithTags<T>(key: string, value: T, tags: string[], ttlMs?: number): Promise<void> {
    if (this.cache instanceof RedisCache) {
      await this.cache.setWithTags(key, value, tags, ttlMs);
    } else {
      // 内存缓存：使用特殊键存储标签映射
      await this.cache.set(key, value, ttlMs);

      for (const tag of tags) {
        const tagKey = `__tag__:${tag}`;
        const existing = (await this.cache.get<string[]>(tagKey)) || [];
        if (!existing.includes(key)) {
          existing.push(key);
          await this.cache.set(tagKey, existing, ttlMs);
        }
      }
    }
  }

  /**
   * 根据标签使缓存失效
   */
  async invalidateTag(tag: string): Promise<void> {
    if (this.cache instanceof RedisCache) {
      await this.cache.invalidateByTag(tag);
    } else {
      // 内存缓存实现
      const tagKey = `__tag__:${tag}`;
      const keys = (await this.cache.get<string[]>(tagKey)) || [];

      for (const key of keys) {
        await this.cache.delete(key);
      }

      await this.cache.delete(tagKey);
    }
  }

  /**
   * 根据多个标签使缓存失效
   */
  async invalidateTags(tags: string[]): Promise<void> {
    await Promise.all(tags.map((tag) => this.invalidateTag(tag)));
  }
}

// ============================================================================
// 缓存装饰器
// ============================================================================

export interface CacheOptions {
  ttl: number;
  keyGenerator?: (...args: unknown[]) => string;
  condition?: (...args: unknown[]) => boolean;
  tags?: string[];
}

export function withCache<T extends (...args: unknown[]) => Promise<unknown>>(
  cache: CacheProvider,
  options: CacheOptions,
): (fn: T) => T {
  const taggedCache = new TaggedCache(cache);

  return (fn: T): T => {
    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      // 检查条件
      if (options.condition && !options.condition(...args)) {
        return fn(...args) as ReturnType<T>;
      }

      // 生成缓存键
      const key = options.keyGenerator
        ? options.keyGenerator(...args)
        : `${fn.name}:${JSON.stringify(args)}`;

      // 尝试从缓存获取
      const cached = await taggedCache.get<ReturnType<T>>(key);
      if (cached !== null) {
        logger.debug('Cache hit', { key });
        return cached;
      }

      // 执行函数
      const result = await fn(...args);

      // 存入缓存
      if (options.tags && options.tags.length > 0) {
        await taggedCache.setWithTags(key, result, options.tags, options.ttl);
      } else {
        await taggedCache.set(key, result, options.ttl);
      }
      logger.debug('Cache miss, stored', { key });

      return result as ReturnType<T>;
    }) as T;
  };
}

// ============================================================================
// 响应缓存中间件
// ============================================================================

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export interface ResponseCacheConfig {
  ttl: number;
  vary?: string[];
  keyGenerator?: (req: NextRequest) => string;
  tags?: string[];
}

export function withResponseCache(cache: CacheProvider, config: ResponseCacheConfig) {
  const taggedCache = new TaggedCache(cache);

  return async (
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>,
  ): Promise<NextResponse> => {
    // 只缓存 GET 请求
    if (req.method !== 'GET') {
      return handler(req);
    }

    const key = config.keyGenerator ? config.keyGenerator(req) : `response:${req.url}`;

    // 尝试从缓存获取
    const cached = await taggedCache.get<{ body: unknown; headers: Record<string, string> }>(key);
    if (cached) {
      logger.debug('Response cache hit', { key });
      return NextResponse.json(cached.body, { headers: cached.headers });
    }

    // 执行处理器
    const response = await handler(req);

    // 缓存响应
    if (response.status === 200) {
      try {
        const body = await response.clone().json();
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        if (config.tags && config.tags.length > 0) {
          await taggedCache.setWithTags(key, { body, headers }, config.tags, config.ttl);
        } else {
          await taggedCache.set(key, { body, headers }, config.ttl);
        }
        logger.debug('Response cache stored', { key });
      } catch (error) {
        logger.warn('Failed to cache response', { key, error });
      }
    }

    return response;
  };
}

// ============================================================================
// 缓存管理器
// ============================================================================

export class CacheManager {
  private cache: CacheProvider;
  private taggedCache: TaggedCache;

  constructor(cache: CacheProvider) {
    this.cache = cache;
    this.taggedCache = new TaggedCache(cache);
  }

  get provider(): CacheProvider {
    return this.cache;
  }

  get tagged(): TaggedCache {
    return this.taggedCache;
  }

  /**
   * 创建带缓存的函数
   */
  wrap<T extends (...args: unknown[]) => Promise<unknown>>(fn: T, options: CacheOptions): T {
    return withCache(this.cache, options)(fn) as T;
  }

  /**
   * 创建响应缓存中间件
   */
  middleware(config: ResponseCacheConfig) {
    return withResponseCache(this.cache, config);
  }

  /**
   * 使缓存失效
   */
  async invalidate(key: string): Promise<void> {
    await this.cache.delete(key);
  }

  /**
   * 根据标签使缓存失效
   */
  async invalidateTag(tag: string): Promise<void> {
    await this.taggedCache.invalidateTag(tag);
  }

  /**
   * 根据模式清除缓存
   */
  async clear(pattern?: string): Promise<void> {
    await this.cache.clear(pattern);
  }
}

// ============================================================================
// 默认缓存实例
// ============================================================================

export const defaultCache = new MemoryCache();
export const cacheManager = new CacheManager(defaultCache);

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 生成缓存键
 */
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

/**
 * 创建基于实例的缓存键
 */
export function createInstanceKey(instanceId: string | null | undefined, baseKey: string): string {
  return instanceId ? `${baseKey}:instance:${instanceId}` : baseKey;
}
