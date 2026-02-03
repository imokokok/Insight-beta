/**
 * Redis-based Rate Limit Manager
 * Supports distributed rate limiting across multiple instances
 * Uses the existing redis client from the project
 */

import { logger } from '@/lib/logger';
import { getRedisClient, isRedisAvailable } from '@/server/redisCache';
import type { RedisClientType } from 'redis';

export type RateLimitScope = 'global' | 'user' | 'api_key' | 'ip' | 'endpoint';
export type RateLimitTier = 'free' | 'basic' | 'pro' | 'enterprise';

export interface RateLimitRule {
  id: string;
  endpointPattern: string;
  method: string;
  maxRequests: number;
  windowSeconds: number;
  responseType: 'error' | 'throttle' | 'delay';
  delayMs: number;
}

export interface RateLimitConfig {
  id: string;
  name: string;
  description: string;
  scope: RateLimitScope;
  tier: RateLimitTier;
  rules: RateLimitRule[];
  isActive: boolean;
  priority: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
  retryAfter?: number;
}

export interface RateLimitStats {
  totalRequests: number;
  limitedRequests: number;
  limitRate: number;
}

const DEFAULT_TIER_LIMITS: Record<RateLimitTier, { maxRequests: number; windowSeconds: number }> = {
  free: { maxRequests: 100, windowSeconds: 60 },
  basic: { maxRequests: 300, windowSeconds: 60 },
  pro: { maxRequests: 1000, windowSeconds: 60 },
  enterprise: { maxRequests: 5000, windowSeconds: 60 },
};

export class RedisRateLimitManager {
  private redis: RedisClientType | null = null;
  private configs: Map<string, RateLimitConfig> = new Map();
  private readonly keyPrefix = 'ratelimit:';
  private initialized = false;

  constructor() {
    this.loadDefaultConfigs();
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    if (this.initialized) return;
    
    try {
      if (isRedisAvailable()) {
        this.redis = await getRedisClient();
        logger.info('Redis rate limiter initialized');
      } else {
        logger.warn('Redis not available, rate limiting will use fallback');
      }
    } catch (error) {
      logger.error('Failed to initialize Redis for rate limiting', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    
    this.initialized = true;
  }

  private loadDefaultConfigs(): void {
    const defaultConfig: RateLimitConfig = {
      id: 'global_default',
      name: 'Global Default Limits',
      description: 'Default rate limits for all API requests',
      scope: 'global',
      tier: 'free',
      rules: [
        {
          id: 'default_read',
          endpointPattern: '/api/*',
          method: 'GET',
          maxRequests: 100,
          windowSeconds: 60,
          responseType: 'error',
          delayMs: 0,
        },
        {
          id: 'default_write',
          endpointPattern: '/api/*',
          method: 'POST',
          maxRequests: 20,
          windowSeconds: 60,
          responseType: 'error',
          delayMs: 0,
        },
      ],
      isActive: true,
      priority: 1,
    };

    this.configs.set(defaultConfig.id, defaultConfig);
  }

  /**
   * Check if a request is allowed based on rate limits
   */
  async checkLimit(
    identifier: string,
    tier: RateLimitTier = 'free',
    endpoint?: string,
    method?: string
  ): Promise<RateLimitResult> {
    await this.initializeRedis();
    
    if (!this.redis) {
      // Fallback: allow all requests if Redis is not available
      logger.warn('Redis not available, allowing request without rate limiting');
      return { allowed: true, remaining: 100, resetTime: Date.now() + 60000, limit: 100 };
    }

    const limit = DEFAULT_TIER_LIMITS[tier];
    const key = this.buildKey(identifier, endpoint, method);
    const now = Date.now();
    const windowMs = limit.windowSeconds * 1000;

    try {
      // Use Redis sorted set for sliding window rate limiting
      // Remove old entries outside the window
      await this.redis.zRemRangeByScore(key, 0, now - windowMs);
      
      // Count current requests in window
      const currentCount = await this.redis.zCard(key);
      
      // Add current request
      const member = `${now}-${Math.random()}`;
      await this.redis.zAdd(key, { score: now, value: member });
      
      // Set expiry on the key
      await this.redis.pExpire(key, windowMs);

      const allowed = (currentCount || 0) < limit.maxRequests;
      const remaining = Math.max(0, limit.maxRequests - (currentCount || 0) - 1);
      const resetTime = now + windowMs;

      return {
        allowed,
        remaining,
        resetTime,
        limit: limit.maxRequests,
        retryAfter: allowed ? undefined : Math.ceil(windowMs / 1000),
      };
    } catch (error) {
      logger.error('Rate limit check failed', {
        error: error instanceof Error ? error.message : String(error),
        identifier,
      });
      
      // Fail open - allow request on error
      return { allowed: true, remaining: 1, resetTime: now + 60000, limit: limit.maxRequests };
    }
  }

  /**
   * Increment request count for an identifier
   */
  async increment(identifier: string, endpoint?: string, method?: string): Promise<void> {
    await this.initializeRedis();
    if (!this.redis) return;

    const key = this.buildKey(identifier, endpoint, method);
    const now = Date.now();

    try {
      await this.redis.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
      await this.redis.pExpire(key, 60000); // 1 minute expiry
    } catch (error) {
      logger.error('Failed to increment rate limit counter', { error });
    }
  }

  /**
   * Get current usage for an identifier
   */
  async getUsage(identifier: string, endpoint?: string, method?: string): Promise<number> {
    await this.initializeRedis();
    if (!this.redis) return 0;

    const key = this.buildKey(identifier, endpoint, method);
    const now = Date.now();
    const windowMs = 60000; // 1 minute window

    try {
      await this.redis.zRemRangeByScore(key, 0, now - windowMs);
      const count = await this.redis.zCard(key);
      return count || 0;
    } catch (error) {
      logger.error('Failed to get rate limit usage', { error });
      return 0;
    }
  }

  /**
   * Reset rate limit for an identifier
   */
  async reset(identifier: string, endpoint?: string, method?: string): Promise<void> {
    await this.initializeRedis();
    if (!this.redis) return;

    const key = this.buildKey(identifier, endpoint, method);
    
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error('Failed to reset rate limit', { error });
    }
  }

  /**
   * Get rate limit statistics
   */
  async getStats(): Promise<RateLimitStats> {
    await this.initializeRedis();
    if (!this.redis) {
      return { totalRequests: 0, limitedRequests: 0, limitRate: 0 };
    }

    try {
      // Scan for all rate limit keys
      const keys: string[] = [];
      let cursor = 0;
      
      do {
        const result = await this.redis.scan(cursor, { MATCH: `${this.keyPrefix}*`, COUNT: 100 });
        cursor = result.cursor;
        keys.push(...result.keys);
      } while (cursor !== 0);

      let totalRequests = 0;
      
      for (const key of keys) {
        const count = await this.redis.zCard(key);
        totalRequests += count || 0;
      }

      return {
        totalRequests,
        limitedRequests: 0, // Would need to track separately
        limitRate: 0,
      };
    } catch (error) {
      logger.error('Failed to get rate limit stats', { error });
      return { totalRequests: 0, limitedRequests: 0, limitRate: 0 };
    }
  }

  /**
   * Add or update a rate limit configuration
   */
  addConfig(config: RateLimitConfig): void {
    this.configs.set(config.id, config);
  }

  /**
   * Get a rate limit configuration
   */
  getConfig(id: string): RateLimitConfig | undefined {
    return this.configs.get(id);
  }

  /**
   * Build Redis key for rate limiting
   */
  private buildKey(identifier: string, endpoint?: string, method?: string): string {
    const parts = [this.keyPrefix, identifier];
    if (endpoint) parts.push(endpoint.replace(/\//g, ':'));
    if (method) parts.push(method);
    return parts.join(':');
  }
}

// Export singleton instance
export const redisRateLimitManager = new RedisRateLimitManager();
