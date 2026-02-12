/**
 * Rate Limiter Module
 *
 * 速率限制模块
 * 防止 DDoS 攻击、API 滥用、资源耗尽
 */

import { logger } from '@/lib/logger';

// ============================================================================
// 常量定义
// ============================================================================

export const RATE_LIMIT_DEFAULTS = {
  // 全局限制
  GLOBAL_MAX_REQUESTS_PER_SECOND: 100,
  GLOBAL_MAX_REQUESTS_PER_MINUTE: 5000,

  // 单用户限制
  USER_MAX_REQUESTS_PER_SECOND: 10,
  USER_MAX_REQUESTS_PER_MINUTE: 300,
  USER_MAX_REQUESTS_PER_HOUR: 5000,

  // 合约调用限制
  CONTRACT_MAX_CALLS_PER_SECOND: 50,
  CONTRACT_MAX_CALLS_PER_MINUTE: 2000,

  // 写入操作限制（更严格）
  WRITE_MAX_REQUESTS_PER_MINUTE: 100,
  WRITE_MAX_REQUESTS_PER_HOUR: 1000,

  // 清理间隔
  CLEANUP_INTERVAL_MS: 60000, // 1 minute
} as const;

// ============================================================================
// 类型定义
// ============================================================================

export interface RateLimitConfig {
  maxRequestsPerSecond: number;
  maxRequestsPerMinute: number;
  maxRequestsPerHour?: number;
  burstSize?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

interface RequestRecord {
  timestamps: number[];
  count: number;
}

// ============================================================================
// 滑动窗口速率限制器
// ============================================================================

export class SlidingWindowRateLimiter {
  private requests: Map<string, RequestRecord> = new Map();
  private config: RateLimitConfig;
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      maxRequestsPerSecond: config.maxRequestsPerSecond ?? RATE_LIMIT_DEFAULTS.USER_MAX_REQUESTS_PER_SECOND,
      maxRequestsPerMinute: config.maxRequestsPerMinute ?? RATE_LIMIT_DEFAULTS.USER_MAX_REQUESTS_PER_MINUTE,
      maxRequestsPerHour: config.maxRequestsPerHour ?? RATE_LIMIT_DEFAULTS.USER_MAX_REQUESTS_PER_HOUR,
      burstSize: config.burstSize ?? 20,
    };

    // 定期清理过期记录
    this.cleanupInterval = setInterval(
      () => this.cleanup(),
      RATE_LIMIT_DEFAULTS.CLEANUP_INTERVAL_MS,
    );
  }

  /**
   * 检查是否允许请求
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const record = this.getOrCreateRecord(key);

    // 清理过期的时间戳
    this.cleanExpiredTimestamps(record, now);

    // 检查每秒限制
    const secondWindow = now - 1000;
    const requestsLastSecond = record.timestamps.filter((t) => t > secondWindow).length;
    if (requestsLastSecond >= this.config.maxRequestsPerSecond) {
      return this.createDenyResult(now, 1000, 'second');
    }

    // 检查每分钟限制
    const minuteWindow = now - 60000;
    const requestsLastMinute = record.timestamps.filter((t) => t > minuteWindow).length;
    if (requestsLastMinute >= this.config.maxRequestsPerMinute) {
      return this.createDenyResult(now, 60000, 'minute');
    }

    // 检查每小时限制（如果配置了）
    if (this.config.maxRequestsPerHour) {
      const hourWindow = now - 3600000;
      const requestsLastHour = record.timestamps.filter((t) => t > hourWindow).length;
      if (requestsLastHour >= this.config.maxRequestsPerHour) {
        return this.createDenyResult(now, 3600000, 'hour');
      }
    }

    // 允许请求
    const remaining = this.config.maxRequestsPerMinute - requestsLastMinute - 1;
    return {
      allowed: true,
      remaining: Math.max(0, remaining),
      resetAt: now + 60000,
    };
  }

  /**
   * 记录请求
   */
  record(key: string): void {
    const now = Date.now();
    const record = this.getOrCreateRecord(key);
    record.timestamps.push(now);
    record.count++;
  }

  /**
   * 检查并记录（原子操作）
   */
  checkAndRecord(key: string): RateLimitResult {
    const result = this.check(key);
    if (result.allowed) {
      this.record(key);
    }
    return result;
  }

  /**
   * 获取当前使用量
   */
  getUsage(key: string): {
    perSecond: number;
    perMinute: number;
    perHour: number;
  } {
    const now = Date.now();
    const record = this.requests.get(key);

    if (!record) {
      return { perSecond: 0, perMinute: 0, perHour: 0 };
    }

    return {
      perSecond: record.timestamps.filter((t) => t > now - 1000).length,
      perMinute: record.timestamps.filter((t) => t > now - 60000).length,
      perHour: record.timestamps.filter((t) => t > now - 3600000).length,
    };
  }

  /**
   * 重置限制
   */
  reset(key: string): void {
    this.requests.delete(key);
  }

  /**
   * 销毁
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.requests.clear();
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  private getOrCreateRecord(key: string): RequestRecord {
    let record = this.requests.get(key);
    if (!record) {
      record = { timestamps: [], count: 0 };
      this.requests.set(key, record);
    }
    return record;
  }

  private cleanExpiredTimestamps(record: RequestRecord, now: number): void {
    const hourAgo = now - 3600000;
    record.timestamps = record.timestamps.filter((t) => t > hourAgo);
  }

  private createDenyResult(
    now: number,
    windowMs: number,
    _windowName: string,
  ): RateLimitResult {
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + windowMs,
      retryAfter: Math.ceil(windowMs / 1000),
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const hourAgo = now - 3600000;

    for (const [key, record] of this.requests.entries()) {
      record.timestamps = record.timestamps.filter((t) => t > hourAgo);
      if (record.timestamps.length === 0) {
        this.requests.delete(key);
      }
    }

    logger.debug('Rate limiter cleanup completed', {
      activeKeys: this.requests.size,
    });
  }
}

// ============================================================================
// 令牌桶速率限制器
// ============================================================================

export class TokenBucketRateLimiter {
  private buckets: Map<
    string,
    {
      tokens: number;
      lastRefill: number;
    }
  > = new Map();

  private maxTokens: number;
  private refillRate: number; // tokens per second
  private refillInterval: number;

  constructor(maxTokens: number = 100, refillRate: number = 10) {
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.refillInterval = 1000; // 1 second
  }

  /**
   * 尝试消费令牌
   */
  consume(key: string, tokens: number = 1): RateLimitResult {
    const now = Date.now();
    const bucket = this.getOrCreateBucket(key);

    // 补充令牌
    this.refillTokens(bucket, now);

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetAt: now + this.refillInterval,
      };
    }

    const tokensNeeded = tokens - bucket.tokens;
    const waitTime = Math.ceil((tokensNeeded / this.refillRate) * 1000);

    return {
      allowed: false,
      remaining: 0,
      resetAt: now + waitTime,
      retryAfter: Math.ceil(waitTime / 1000),
    };
  }

  /**
   * 获取当前令牌数
   */
  getTokens(key: string): number {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket) return this.maxTokens;

    const tempBucket = { ...bucket };
    this.refillTokens(tempBucket, now);
    return Math.floor(tempBucket.tokens);
  }

  /**
   * 重置桶
   */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.buckets.clear();
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  private getOrCreateBucket(key: string): { tokens: number; lastRefill: number } {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = {
        tokens: this.maxTokens,
        lastRefill: Date.now(),
      };
      this.buckets.set(key, bucket);
    }
    return bucket;
  }

  private refillTokens(
    bucket: { tokens: number; lastRefill: number },
    now: number,
  ): void {
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = (elapsed / 1000) * this.refillRate;

    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }
}

// ============================================================================
// 多层速率限制器
// ============================================================================

export class MultiTierRateLimiter {
  private globalLimiter: SlidingWindowRateLimiter;
  private userLimiters: Map<string, SlidingWindowRateLimiter> = new Map();
  private writeLimiter: SlidingWindowRateLimiter;

  constructor() {
    // 全局限制器
    this.globalLimiter = new SlidingWindowRateLimiter({
      maxRequestsPerSecond: RATE_LIMIT_DEFAULTS.GLOBAL_MAX_REQUESTS_PER_SECOND,
      maxRequestsPerMinute: RATE_LIMIT_DEFAULTS.GLOBAL_MAX_REQUESTS_PER_MINUTE,
    });

    // 写入操作限制器
    this.writeLimiter = new SlidingWindowRateLimiter({
      maxRequestsPerSecond: 5,
      maxRequestsPerMinute: RATE_LIMIT_DEFAULTS.WRITE_MAX_REQUESTS_PER_MINUTE,
      maxRequestsPerHour: RATE_LIMIT_DEFAULTS.WRITE_MAX_REQUESTS_PER_HOUR,
    });
  }

  /**
   * 检查读取请求
   */
  checkRead(userId: string): RateLimitResult {
    // 先检查全局限制
    const globalResult = this.globalLimiter.check('global');
    if (!globalResult.allowed) {
      return globalResult;
    }

    // 再检查用户限制
    const userLimiter = this.getOrCreateUserLimiter(userId);
    return userLimiter.check(userId);
  }

  /**
   * 检查写入请求
   */
  checkWrite(userId: string): RateLimitResult {
    // 先检查全局限制
    const globalResult = this.globalLimiter.check('global');
    if (!globalResult.allowed) {
      return globalResult;
    }

    // 检查写入限制
    const writeResult = this.writeLimiter.check(userId);
    if (!writeResult.allowed) {
      return writeResult;
    }

    // 检查用户限制
    const userLimiter = this.getOrCreateUserLimiter(userId);
    return userLimiter.check(userId);
  }

  /**
   * 记录请求
   */
  recordRead(userId: string): void {
    this.globalLimiter.record('global');
    const userLimiter = this.getOrCreateUserLimiter(userId);
    userLimiter.record(userId);
  }

  /**
   * 记录写入请求
   */
  recordWrite(userId: string): void {
    this.globalLimiter.record('global');
    this.writeLimiter.record(userId);
    const userLimiter = this.getOrCreateUserLimiter(userId);
    userLimiter.record(userId);
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.globalLimiter.destroy();
    this.writeLimiter.destroy();
    for (const limiter of this.userLimiters.values()) {
      limiter.destroy();
    }
    this.userLimiters.clear();
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  private getOrCreateUserLimiter(userId: string): SlidingWindowRateLimiter {
    let limiter = this.userLimiters.get(userId);
    if (!limiter) {
      limiter = new SlidingWindowRateLimiter({
        maxRequestsPerSecond: RATE_LIMIT_DEFAULTS.USER_MAX_REQUESTS_PER_SECOND,
        maxRequestsPerMinute: RATE_LIMIT_DEFAULTS.USER_MAX_REQUESTS_PER_MINUTE,
        maxRequestsPerHour: RATE_LIMIT_DEFAULTS.USER_MAX_REQUESTS_PER_HOUR,
      });
      this.userLimiters.set(userId, limiter);
    }
    return limiter;
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createRateLimiter(
  config?: Partial<RateLimitConfig>,
): SlidingWindowRateLimiter {
  return new SlidingWindowRateLimiter(config);
}

export function createTokenBucketLimiter(
  maxTokens?: number,
  refillRate?: number,
): TokenBucketRateLimiter {
  return new TokenBucketRateLimiter(maxTokens, refillRate);
}

export function createMultiTierRateLimiter(): MultiTierRateLimiter {
  return new MultiTierRateLimiter();
}
