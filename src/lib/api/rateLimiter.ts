import type { RedisClientType } from 'redis';
import { createClient } from 'redis';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// Predefined rate limit configurations
export const RateLimiterConfigs = {
  // Standard API rate limit
  standard: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyPrefix: 'api:standard',
  },
  // Strict rate limit for sensitive endpoints
  strict: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    keyPrefix: 'api:strict',
  },
  // Lenient rate limit for public endpoints
  lenient: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 300,
    keyPrefix: 'api:lenient',
  },
  // WebSocket connection limit
  websocket: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyPrefix: 'ws:connection',
  },
};

class RateLimiterClass {
  private redis: RedisClientType | null = null;
  private memoryStore = new Map<string, { count: number; resetTime: number }>();

  constructor() {
    if (process.env.REDIS_URL) {
      this.redis = createClient({
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: (times: number) => Math.min(times * 50, 2000),
        },
      });
      this.redis.connect().catch(() => {
        this.redis = null;
      });
    }
  }

  async check(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const key = `${config.keyPrefix || 'ratelimit'}:${identifier}`;
    const now = Date.now();

    if (this.redis) {
      return this.checkRedis(key, now, config);
    } else {
      return this.checkMemory(key, now, config);
    }
  }

  private async checkRedis(
    key: string,
    now: number,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    if (!this.redis) {
      throw new Error('Redis not available');
    }

    const windowStart = now - config.windowMs;

    // Use Redis sorted set for sliding window
    const multi = this.redis.multi();

    // Remove old entries
    multi.zRemRangeByScore(key, 0, windowStart);
    // Count current entries
    multi.zCard(key);
    // Add current request
    multi.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
    // Set expiry
    multi.expire(key, Math.ceil(config.windowMs / 1000));

    const results = await multi.exec();
    const count = (results?.[1] as number) || 0;

    const allowed = count < config.maxRequests;
    const resetTime = now + config.windowMs;

    return {
      allowed,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count - 1),
      resetTime,
      retryAfter: allowed ? undefined : Math.ceil(config.windowMs / 1000),
    };
  }

  private checkMemory(key: string, now: number, config: RateLimitConfig): RateLimitResult {
    const entry = this.memoryStore.get(key);

    if (!entry || now > entry.resetTime) {
      // Reset window
      this.memoryStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });

      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
      };
    }

    const allowed = entry.count < config.maxRequests;
    entry.count++;

    return {
      allowed,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetTime: entry.resetTime,
      retryAfter: allowed ? undefined : Math.ceil((entry.resetTime - now) / 1000),
    };
  }
}

export const rateLimiter = new RateLimiterClass();

// Helper to create rate limit headers
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    ...(result.retryAfter && {
      'Retry-After': result.retryAfter.toString(),
    }),
  };
}

// Export the class type for use in other files
export type RateLimiter = RateLimiterClass;
