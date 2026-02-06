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
// Redis 缓存实现（简化版）
// ============================================================================

export class RedisCache implements CacheProvider {
  private client: unknown; // 实际使用时应该是 Redis 客户端

  constructor(client: unknown) {
    this.client = client;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      // 实际实现需要调用 Redis
      logger.debug('Redis get', { key });
      return null;
    } catch (error) {
      logger.error('Redis get failed', { key, error });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    try {
      logger.debug('Redis set', { key, ttlMs });
    } catch (error) {
      logger.error('Redis set failed', { key, error });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      logger.debug('Redis delete', { key });
    } catch (error) {
      logger.error('Redis delete failed', { key, error });
    }
  }

  async clear(pattern?: string): Promise<void> {
    try {
      logger.debug('Redis clear', { pattern });
    } catch (error) {
      logger.error('Redis clear failed', { pattern, error });
    }
  }
}

// ============================================================================
// 缓存装饰器
// ============================================================================

export interface CacheOptions {
  ttl: number;
  keyGenerator?: (...args: unknown[]) => string;
  condition?: (...args: unknown[]) => boolean;
}

export function withCache<T extends (...args: unknown[]) => Promise<unknown>>(
  cache: CacheProvider,
  options: CacheOptions,
): (fn: T) => T {
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
      const cached = await cache.get<ReturnType<T>>(key);
      if (cached !== null) {
        logger.debug('Cache hit', { key });
        return cached;
      }

      // 执行函数
      const result = await fn(...args);

      // 存入缓存
      await cache.set(key, result, options.ttl);
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
}

export function withResponseCache(cache: CacheProvider, config: ResponseCacheConfig) {
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
    const cached = await cache.get<{ body: unknown; headers: Record<string, string> }>(key);
    if (cached) {
      logger.debug('Response cache hit', { key });
      return NextResponse.json(cached.body, { headers: cached.headers });
    }

    // 执行处理器
    const response = await handler(req);

    // 缓存响应
    if (response.status === 200) {
      const body = await response.clone().json();
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      await cache.set(key, { body, headers }, config.ttl);
      logger.debug('Response cache stored', { key });
    }

    return response;
  };
}

// ============================================================================
// 默认缓存实例
// ============================================================================

export const defaultCache = new MemoryCache();
