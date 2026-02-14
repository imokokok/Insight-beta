/**
 * Rate Limiting Service - 速率限制服务
 *
 * 支持内存存储（适合单实例/Vercel）和 Redis 存储（适合多实例部署）
 */

import type { NextRequest } from 'next/server';

import { env } from '@/config/env';
import { logger } from '@/shared/logger';

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

interface RateLimitStore {
  getRecord(key: string): Promise<RateLimitRecord | null>;
  setRecord(key: string, record: RateLimitRecord): Promise<void>;
  incrementRecord(key: string, windowMs: number): Promise<RateLimitRecord>;
  cleanup?(): Promise<void>;
}

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

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { ex?: number }): Promise<void>;
  eval(script: string, keys: string[], args: string[]): Promise<unknown>;
  quit?(): Promise<void>;
}

let redisClient: RedisClient | null = null;
let redisClientPromise: Promise<RedisClient | null> | null = null;

async function getRedisClient(): Promise<RedisClient | null> {
  if (redisClient) return redisClient;
  if (redisClientPromise) return redisClientPromise;

  redisClientPromise = initRedisClient();
  redisClient = await redisClientPromise;
  return redisClient;
}

async function initRedisClient(): Promise<RedisClient | null> {
  if (!env.REDIS_URL && !env.REDIS_HOST) {
    return null;
  }

  try {
    const { default: Redis } = await import('ioredis');

    const config: {
      host?: string;
      port?: number;
      password?: string;
      tls?: Record<string, unknown>;
      lazyConnect?: boolean;
      retryStrategy?: (times: number) => number | null;
    } = env.REDIS_URL
      ? { lazyConnect: true }
      : {
          host: env.REDIS_HOST,
          port: env.REDIS_PORT,
          password: env.REDIS_PASSWORD || undefined,
          tls: env.REDIS_TLS ? {} : undefined,
          lazyConnect: true,
        };

    config.retryStrategy = (times: number) => {
      if (times > 3) {
        logger.warn('Redis connection failed after 3 retries, falling back to memory store');
        return null;
      }
      return Math.min(times * 100, 3000);
    };

    const client = env.REDIS_URL ? new Redis(env.REDIS_URL, config) : new Redis(config);

    await client.connect().catch(() => {
      logger.warn('Redis connection failed, falling back to memory store');
      return null;
    });

    logger.info('Redis rate limit store initialized');

    return {
      get: async (key: string) => client.get(key),
      set: async (key: string, value: string, options?: { ex?: number }) => {
        if (options?.ex) {
          await client.setex(key, options.ex, value);
        } else {
          await client.set(key, value);
        }
      },
      eval: async (script: string, keys: string[], args: string[]) => {
        return client.eval(script, keys.length, ...keys, ...args);
      },
      quit: async () => {
        await client.quit();
      },
    };
  } catch (error) {
    logger.warn('Redis client initialization failed, falling back to memory store', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

class RedisStore implements RateLimitStore {
  private readonly keyPrefix = 'ratelimit:';

  async getRecord(key: string): Promise<RateLimitRecord | null> {
    const client = await getRedisClient();
    if (!client) return null;

    const data = await client.get(this.keyPrefix + key);
    if (!data) return null;

    try {
      const record = JSON.parse(data) as RateLimitRecord;
      if (Date.now() > record.resetTime) {
        return null;
      }
      return record;
    } catch {
      return null;
    }
  }

  async setRecord(key: string, record: RateLimitRecord): Promise<void> {
    const client = await getRedisClient();
    if (!client) return;

    const ttl = Math.ceil((record.resetTime - Date.now()) / 1000);
    if (ttl > 0) {
      await client.set(this.keyPrefix + key, JSON.stringify(record), { ex: ttl });
    }
  }

  async incrementRecord(key: string, windowMs: number): Promise<RateLimitRecord> {
    const client = await getRedisClient();
    if (!client) {
      throw new Error('Redis client not available');
    }

    const fullKey = this.keyPrefix + key;
    const now = Date.now();
    const ttl = Math.ceil(windowMs / 1000);

    const script = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local windowMs = tonumber(ARGV[2])
      local ttl = tonumber(ARGV[3])
      
      local data = redis.call('get', key)
      local record
      
      if data then
        record = cjson.decode(data)
        if now > record.resetTime then
          record = { count = 1, resetTime = now + windowMs }
        else
          record.count = record.count + 1
        end
      else
        record = { count = 1, resetTime = now + windowMs }
      end
      
      redis.call('setex', key, ttl, cjson.encode(record))
      return cjson.encode(record)
    `;

    try {
      const result = await client.eval(
        script,
        [fullKey],
        [String(now), String(windowMs), String(ttl)],
      );
      if (typeof result === 'string') {
        return JSON.parse(result) as RateLimitRecord;
      }
    } catch {
      // Lua 脚本失败，回退到普通方式
    }

    const existing = await this.getRecord(key);
    if (!existing || now > existing.resetTime) {
      const record: RateLimitRecord = {
        count: 1,
        resetTime: now + windowMs,
      };
      await this.setRecord(key, record);
      return record;
    }

    existing.count++;
    await this.setRecord(key, existing);
    return existing;
  }
}

let currentStore: RateLimitStore | null = null;
let storeType: RateLimitStoreType = 'memory';

async function getStore(): Promise<RateLimitStore> {
  if (currentStore) return currentStore;

  const redis = await getRedisClient();
  if (redis) {
    currentStore = new RedisStore();
    storeType = 'redis';
    logger.info('Using Redis rate limit store');
  } else {
    currentStore = new MemoryStore();
    storeType = 'memory';
    logger.info('Using memory rate limit store');
  }

  return currentStore;
}

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

export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const clientIp = getClientIp(req);
  const key = config.keyGenerator
    ? config.keyGenerator(req)
    : `${clientIp}:${req.nextUrl.pathname}`;

  const now = Date.now();
  const store = await getStore();

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

export async function cleanupRateLimitStore(): Promise<void> {
  const store = await getStore();
  if (store.cleanup) {
    await store.cleanup();
    logger.debug('Rate limit store cleaned up', { storeType });
  }
}

export async function getRateLimitStoreStatus(): Promise<{
  type: RateLimitStoreType;
  memorySize?: number;
  redisConnected?: boolean;
}> {
  if (storeType === 'redis') {
    const redis = await getRedisClient();
    return {
      type: 'redis',
      redisConnected: redis !== null,
    };
  }

  const store = await getStore();
  if (store instanceof MemoryStore) {
    return {
      type: 'memory',
      memorySize: store.size,
    };
  }

  return { type: storeType };
}

export async function closeRateLimitStore(): Promise<void> {
  if (redisClient?.quit) {
    await redisClient.quit();
    redisClient = null;
    redisClientPromise = null;
    currentStore = null;
    logger.info('Rate limit store connection closed');
  }
}
