/**
 * Rate Limiting - 速率限制
 *
 * 支持内存存储（单实例）和 Redis 存储（多实例）
 *
 * 配置环境变量：
 * - REDIS_URL: Redis 连接地址（如 redis://localhost:6379）
 * - 未配置时默认使用内存存储
 */

import type { NextRequest } from 'next/server';

import { logger } from '@/shared/logger';

// ============================================================================
// 类型定义
// ============================================================================

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: NextRequest) => string;
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

export type RateLimitStoreType = 'memory' | 'redis';

// ============================================================================
// 存储接口定义
// ============================================================================

interface RateLimitStore {
  getRecord(key: string): Promise<RateLimitRecord | null>;
  setRecord(key: string, record: RateLimitRecord): Promise<void>;
  incrementRecord(key: string, windowMs: number): Promise<RateLimitRecord>;
  cleanup?(): Promise<void>;
}

// ============================================================================
// 内存存储实现
// ============================================================================

class MemoryStore implements RateLimitStore {
  private store = new Map<string, RateLimitRecord>();

  async getRecord(key: string): Promise<RateLimitRecord | null> {
    const record = this.store.get(key);
    if (!record) return null;

    if (Date.now() > record.resetTime) {
      this.store.delete(key);
      return null;
    }

    return record;
  }

  async setRecord(key: string, record: RateLimitRecord): Promise<void> {
    this.store.set(key, record);
  }

  async incrementRecord(key: string, windowMs: number): Promise<RateLimitRecord> {
    const now = Date.now();
    const existing = await this.getRecord(key);

    if (!existing) {
      const record: RateLimitRecord = {
        count: 1,
        resetTime: now + windowMs,
      };
      await this.setRecord(key, record);
      return record;
    }

    existing.count++;
    return existing;
  }

  async cleanup(): Promise<void> {
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
// Redis 存储实现（可选）
// ============================================================================

interface RedisClient {
  get(key: string): Promise<string | null>;
  setex(key: string, ttl: number, value: string): Promise<'OK' | string>;
  del(key: string): Promise<number>;
}

let redisClient: RedisClient | null = null;

async function getRedisClient(): Promise<RedisClient | null> {
  if (redisClient) {
    return redisClient;
  }

  try {
    const Redis = (await import('ioredis')).default;
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL not configured');
    }
    redisClient = new Redis(redisUrl) as RedisClient;
    logger.info('Redis rate limit store initialized');
    return redisClient;
  } catch (error) {
    logger.warn('Failed to initialize Redis, falling back to memory store', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

class RedisStore implements RateLimitStore {
  private readonly prefix = 'ratelimit:';

  async getRecord(key: string): Promise<RateLimitRecord | null> {
    const redis = await getRedisClient();
    if (!redis) {
      throw new Error('Redis not available');
    }

    const data = await redis.get(`${this.prefix}${key}`);
    if (!data) return null;

    try {
      const record = JSON.parse(data) as RateLimitRecord;
      if (Date.now() > record.resetTime) {
        await redis.del(`${this.prefix}${key}`);
        return null;
      }
      return record;
    } catch {
      return null;
    }
  }

  async setRecord(key: string, record: RateLimitRecord): Promise<void> {
    const redis = await getRedisClient();
    if (!redis) {
      throw new Error('Redis not available');
    }

    const ttl = Math.ceil((record.resetTime - Date.now()) / 1000);
    await redis.setex(`${this.prefix}${key}`, Math.max(ttl, 1), JSON.stringify(record));
  }

  async incrementRecord(key: string, windowMs: number): Promise<RateLimitRecord> {
    const redis = await getRedisClient();
    if (!redis) {
      throw new Error('Redis not available');
    }

    const now = Date.now();
    const redisKey = `${this.prefix}${key}`;
    const data = await redis.get(redisKey);

    if (!data) {
      const record: RateLimitRecord = {
        count: 1,
        resetTime: now + windowMs,
      };
      await this.setRecord(key, record);
      return record;
    }

    try {
      const record = JSON.parse(data) as RateLimitRecord;
      record.count++;
      await this.setRecord(key, record);
      return record;
    } catch {
      const record: RateLimitRecord = {
        count: 1,
        resetTime: now + windowMs,
      };
      await this.setRecord(key, record);
      return record;
    }
  }
}

// ============================================================================
// 存储实例
// ============================================================================

let currentStore: RateLimitStore | null = null;
let storeType: RateLimitStoreType = 'memory';

function getStore(): RateLimitStore {
  if (currentStore) {
    return currentStore;
  }

  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    try {
      currentStore = new RedisStore();
      storeType = 'redis';
      logger.info('Using Redis rate limit store');
    } catch {
      currentStore = new MemoryStore();
      storeType = 'memory';
      logger.info('Using memory rate limit store (Redis fallback)');
    }
  } else {
    currentStore = new MemoryStore();
    storeType = 'memory';
    logger.info('Using memory rate limit store');
  }

  return currentStore;
}

// ============================================================================
// 客户端 IP 获取
// ============================================================================

const TRUSTED_PROXIES = process.env.TRUSTED_PROXIES?.split(',').map((p) => p.trim()) ?? [];

function isValidIp(ip: string): boolean {
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

function isTrustedProxy(_req: NextRequest): boolean {
  if (TRUSTED_PROXIES.length === 0) {
    return false;
  }
  return true;
}

function generateRequestFingerprint(req: NextRequest): string {
  const components: string[] = [];

  const userAgent = req.headers.get('user-agent');
  if (userAgent) {
    components.push(`ua:${userAgent.slice(0, 100)}`);
  }

  const acceptLanguage = req.headers.get('accept-language');
  if (acceptLanguage) {
    components.push(`lang:${acceptLanguage.slice(0, 50)}`);
  }

  const acceptEncoding = req.headers.get('accept-encoding');
  if (acceptEncoding) {
    components.push(`enc:${acceptEncoding.slice(0, 30)}`);
  }

  if (components.length === 0) {
    return 'unknown';
  }

  const fingerprint = components.join('|');
  return `fp:${hashString(fingerprint)}`;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function getClientIp(req: NextRequest): string {
  const fromTrustedProxy = isTrustedProxy(req);

  if (fromTrustedProxy) {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
      const ips = forwarded
        .split(',')
        .map((ip) => ip.trim())
        .filter(isValidIp);
      if (ips.length > 0) {
        return ips[0]!;
      }
    }

    const realIp = req.headers.get('x-real-ip');
    if (realIp && isValidIp(realIp)) {
      return realIp;
    }

    const cfIp = req.headers.get('cf-connecting-ip');
    if (cfIp && isValidIp(cfIp)) {
      return cfIp;
    }

    const clientIp = req.headers.get('x-client-ip');
    if (clientIp && isValidIp(clientIp)) {
      return clientIp;
    }
  }

  return generateRequestFingerprint(req);
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

  const now = Date.now();
  const store = getStore();

  try {
    const record = await store.getRecord(key);

    if (!record || now > record.resetTime) {
      const newRecord: RateLimitRecord = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      await store.setRecord(key, newRecord);

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
        storeType,
      });

      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
        totalLimit: config.maxRequests,
      };
    }

    const updated = await store.incrementRecord(key, config.windowMs);

    return {
      allowed: true,
      remaining: Math.max(0, config.maxRequests - updated.count),
      resetTime: updated.resetTime,
      totalLimit: config.maxRequests,
    };
  } catch (error) {
    logger.error('Rate limit check failed', {
      error: error instanceof Error ? error.message : String(error),
      key,
      storeType,
    });

    return {
      allowed: true,
      remaining: config.maxRequests,
      resetTime: now + config.windowMs,
      totalLimit: config.maxRequests,
    };
  }
}

// ============================================================================
// 存储清理和管理
// ============================================================================

export async function cleanupRateLimitStore(): Promise<void> {
  const store = getStore();
  if (store.cleanup) {
    await store.cleanup();
    logger.debug('Rate limit store cleaned up', { storeType });
  }
}

export async function getRateLimitStoreStatus(): Promise<{
  type: RateLimitStoreType;
  memorySize?: number;
}> {
  const store = getStore();
  if (store instanceof MemoryStore) {
    return {
      type: 'memory',
      memorySize: store.size,
    };
  }

  return { type: storeType };
}
