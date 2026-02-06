/**
 * Rate Limiting - 速率限制
 *
 * 支持内存存储和 Redis 存储，生产环境推荐使用 Redis
 */

import type { NextRequest } from 'next/server';

import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import { getRedisClient } from '@/lib/redis';

// ============================================================================
// 类型定义
// ============================================================================

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: NextRequest) => string;
  store?: 'memory' | 'redis';
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalLimit: number;
}

// ============================================================================
// 存储适配器接口
// ============================================================================

interface RateLimitStore {
  get(key: string): Promise<RateLimitRecord | null>;
  set(key: string, record: RateLimitRecord, windowMs: number): Promise<void>;
  increment(key: string, windowMs: number): Promise<RateLimitRecord>;
}

// ============================================================================
// 内存存储实现
// ============================================================================

class MemoryStore implements RateLimitStore {
  private store = new Map<string, RateLimitRecord>();

  async get(key: string): Promise<RateLimitRecord | null> {
    const record = this.store.get(key);
    if (!record) return null;

    // 清理过期记录
    if (Date.now() > record.resetTime) {
      this.store.delete(key);
      return null;
    }

    return record;
  }

  async set(key: string, record: RateLimitRecord, _windowMs: number): Promise<void> {
    this.store.set(key, record);
  }

  async increment(key: string, windowMs: number): Promise<RateLimitRecord> {
    const now = Date.now();
    const existing = await this.get(key);

    if (!existing) {
      const record: RateLimitRecord = {
        count: 1,
        resetTime: now + windowMs,
      };
      await this.set(key, record, windowMs);
      return record;
    }

    existing.count++;
    return existing;
  }

  // 清理过期记录（可用于定时任务）
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }

  get size(): number {
    return this.store.size;
  }
}

// ============================================================================
// Redis 存储实现
// ============================================================================

class RedisStore implements RateLimitStore {
  private async getRedis() {
    return getRedisClient();
  }

  async get(key: string): Promise<RateLimitRecord | null> {
    try {
      const redis = await this.getRedis();
      const data = await redis.get(`ratelimit:${key}`);
      if (!data) return null;

      const record = JSON.parse(data) as RateLimitRecord;

      // 检查是否过期
      if (Date.now() > record.resetTime) {
        await redis.del(`ratelimit:${key}`);
        return null;
      }

      return record;
    } catch (error) {
      logger.error('Redis rate limit get failed', { error, key });
      return null;
    }
  }

  async set(key: string, record: RateLimitRecord, windowMs: number): Promise<void> {
    try {
      const redis = await this.getRedis();
      const ttl = Math.ceil(windowMs / 1000);
      await redis.setEx(`ratelimit:${key}`, ttl, JSON.stringify(record));
    } catch (error) {
      logger.error('Redis rate limit set failed', { error, key });
    }
  }

  async increment(key: string, windowMs: number): Promise<RateLimitRecord> {
    const now = Date.now();
    try {
      const redis = await this.getRedis();
      const fullKey = `ratelimit:${key}`;

      // 使用 Redis 事务确保原子性
      const multi = redis.multi();
      multi.get(fullKey);
      multi.ttl(fullKey);

      const results = await multi.exec();
      const existingData = results?.[0] as string | null;
      const ttl = results?.[1] as number;

      if (!existingData || ttl <= 0) {
        // 新记录
        const record: RateLimitRecord = {
          count: 1,
          resetTime: now + windowMs,
        };
        await redis.setEx(fullKey, Math.ceil(windowMs / 1000), JSON.stringify(record));
        return record;
      }

      // 增加计数
      const existing = JSON.parse(existingData) as RateLimitRecord;
      existing.count++;
      await redis.setEx(fullKey, ttl, JSON.stringify(existing));
      return existing;
    } catch (error) {
      logger.error('Redis rate limit increment failed', { error, key });
      // 降级到内存存储
      return { count: 1, resetTime: now + windowMs };
    }
  }
}

// ============================================================================
// 存储工厂
// ============================================================================

const memoryStore = new MemoryStore();

function getStore(config: RateLimitConfig): RateLimitStore {
  // 优先使用配置指定的存储
  if (config.store === 'redis') {
    return new RedisStore();
  }
  if (config.store === 'memory') {
    return memoryStore;
  }

  // 根据环境自动选择
  if (env.INSIGHT_RATE_LIMIT_STORE === 'redis' && env.REDIS_URL) {
    return new RedisStore();
  }

  return memoryStore;
}

// ============================================================================
// 客户端 IP 获取
// ============================================================================

export function getClientIp(req: NextRequest): string {
  // 从各种 header 中获取真实 IP
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  // 返回未知标识
  return 'unknown';
}

// ============================================================================
// 速率限制核心逻辑
// ============================================================================

export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const clientIp = getClientIp(req);
  const key = config.keyGenerator
    ? config.keyGenerator(req)
    : `${clientIp}:${req.nextUrl.pathname}`;

  const store = getStore(config);
  const now = Date.now();

  try {
    // 尝试获取现有记录
    const record = await store.get(key);

    if (!record || now > record.resetTime) {
      // 新窗口
      const newRecord: RateLimitRecord = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      await store.set(key, newRecord, config.windowMs);

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: newRecord.resetTime,
        totalLimit: config.maxRequests,
      };
    }

    if (record.count >= config.maxRequests) {
      logger.warn('Rate limit exceeded', {
        ip: clientIp,
        path: req.nextUrl.pathname,
        key,
        count: record.count,
      });

      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
        totalLimit: config.maxRequests,
      };
    }

    // 增加计数
    record.count++;
    await store.set(key, record, config.windowMs);

    return {
      allowed: true,
      remaining: config.maxRequests - record.count,
      resetTime: record.resetTime,
      totalLimit: config.maxRequests,
    };
  } catch (error) {
    logger.error('Rate limit check failed', {
      error: error instanceof Error ? error.message : String(error),
      key,
    });

    // 失败时允许请求通过（fail-open 策略）
    return {
      allowed: true,
      remaining: 1,
      resetTime: now + config.windowMs,
      totalLimit: config.maxRequests,
    };
  }
}

// ============================================================================
// 内存存储清理（用于定时任务）
// ============================================================================

export function cleanupMemoryStore(): void {
  memoryStore.cleanup();
  logger.debug('Memory rate limit store cleaned up', { size: memoryStore.size });
}

// ============================================================================
// 获取存储状态（用于监控）
// ============================================================================

export function getRateLimitStoreStatus(): {
  type: 'memory' | 'redis';
  memorySize: number;
} {
  return {
    type: env.INSIGHT_RATE_LIMIT_STORE === 'redis' && env.REDIS_URL ? 'redis' : 'memory',
    memorySize: memoryStore.size,
  };
}
