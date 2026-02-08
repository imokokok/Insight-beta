/**
 * Redis Cluster Advanced Features - Redis 集群高级功能
 *
 * 扩展功能：
 * - 分布式锁
 * - 限流器
 * - 发布订阅
 * - 管道批处理
 * - 缓存预热
 * - 监控指标
 */

import { logger } from '@/lib/logger';

import {
  redisClusterManager,
  getRedisClusterClient,
  RedisClusterCache,
  type RedisClientType,
} from './redis-cluster';

// ============================================================================
// 分布式锁
// ============================================================================

export interface LockOptions {
  /** 锁的过期时间（秒） */
  ttl: number;
  /** 重试次数 */
  retryCount: number;
  /** 重试间隔（毫秒） */
  retryDelay: number;
}

export class RedisDistributedLock {
  private prefix = 'lock:';

  constructor(private prefix_key: string = 'oracle') {
    this.prefix = `${prefix_key}:lock:`;
  }

  /**
   * 获取锁
   */
  async acquire(lockName: string, options: Partial<LockOptions> = {}): Promise<string | null> {
    const opts: LockOptions = {
      ttl: 30,
      retryCount: 3,
      retryDelay: 100,
      ...options,
    };

    const lockKey = `${this.prefix}${lockName}`;
    const lockValue = `${Date.now()}-${Math.random()}`;

    const client = await getRedisClusterClient();

    for (let i = 0; i < opts.retryCount; i++) {
      try {
        // 使用 SET NX EX 原子操作
        const result = await client.set(lockKey, lockValue, {
          NX: true,
          EX: opts.ttl,
        });

        if (result === 'OK') {
          logger.debug('Lock acquired', { lockName, lockValue });
          return lockValue;
        }
      } catch (error) {
        logger.error('Failed to acquire lock', { lockName, error });
      }

      if (i < opts.retryCount - 1) {
        await new Promise((resolve) => setTimeout(resolve, opts.retryDelay));
      }
    }

    logger.warn('Failed to acquire lock after retries', { lockName, retryCount: opts.retryCount });
    return null;
  }

  /**
   * 释放锁
   */
  async release(lockName: string, lockValue: string): Promise<boolean> {
    const lockKey = `${this.prefix}${lockName}`;
    const client = await getRedisClusterClient();

    try {
      // 使用 Lua 脚本确保原子性
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await client.eval(script, {
        keys: [lockKey],
        arguments: [lockValue],
      });

      const released = result === 1;
      if (released) {
        logger.debug('Lock released', { lockName });
      }
      return released;
    } catch (error) {
      logger.error('Failed to release lock', { lockName, error });
      return false;
    }
  }

  /**
   * 使用锁执行操作
   */
  async withLock<T>(
    lockName: string,
    operation: () => Promise<T>,
    options?: Partial<LockOptions>,
  ): Promise<T | null> {
    const lockValue = await this.acquire(lockName, options);
    if (!lockValue) {
      throw new Error(`Failed to acquire lock: ${lockName}`);
    }

    try {
      return await operation();
    } finally {
      await this.release(lockName, lockValue);
    }
  }
}

// ============================================================================
// 限流器
// ============================================================================

export interface RateLimiterOptions {
  /** 时间窗口（秒） */
  window: number;
  /** 最大请求数 */
  maxRequests: number;
}

export class RedisRateLimiter {
  private prefix = 'ratelimit:';

  constructor(private prefix_key: string = 'oracle') {
    this.prefix = `${prefix_key}:ratelimit:`;
  }

  /**
   * 检查是否允许请求
   */
  async allow(
    key: string,
    options: RateLimiterOptions,
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const limitKey = `${this.prefix}${key}`;
    const client = await getRedisClusterClient();
    const now = Date.now();
    const windowMs = options.window * 1000;

    try {
      // 使用 Redis 事务
      const multi = (client as RedisClientType).multi?.();
      if (!multi) {
        // 集群模式不支持事务，使用简单实现
        const current = await client.get(limitKey);
        const count = current ? parseInt(current, 10) : 0;

        if (count >= options.maxRequests) {
          const ttl = await client.ttl(limitKey);
          return {
            allowed: false,
            remaining: 0,
            resetTime: now + ttl * 1000,
          };
        }

        await client.incr(limitKey);
        await client.expire(limitKey, options.window);

        return {
          allowed: true,
          remaining: options.maxRequests - count - 1,
          resetTime: now + windowMs,
        };
      }

      // 单机模式使用事务
      multi.set(limitKey, '0', { NX: true, EX: options.window });
      multi.incr(limitKey);
      multi.ttl(limitKey);

      const results = await multi.exec();
      const count = results?.[1] as number;
      const ttl = results?.[2] as number;

      const allowed = count <= options.maxRequests;

      return {
        allowed,
        remaining: Math.max(0, options.maxRequests - count),
        resetTime: now + ttl * 1000,
      };
    } catch (error) {
      logger.error('Rate limiter error', { key, error });
      // 出错时允许请求，避免阻塞
      return {
        allowed: true,
        remaining: options.maxRequests,
        resetTime: now + windowMs,
      };
    }
  }

  /**
   * 滑动窗口限流
   */
  async slidingWindowAllow(key: string, options: RateLimiterOptions): Promise<boolean> {
    const limitKey = `${this.prefix}sw:${key}`;
    const client = await getRedisClusterClient();
    const now = Date.now();
    const windowMs = options.window * 1000;

    try {
      // 清理过期记录
      await client.zRemRangeByScore(limitKey, 0, now - windowMs);

      // 获取当前窗口内的请求数
      const count = await client.zCard(limitKey);

      if (count >= options.maxRequests) {
        return false;
      }

      // 添加当前请求记录
      await client.zAdd(limitKey, { score: now, value: `${now}-${Math.random()}` });
      await client.expire(limitKey, options.window);

      return true;
    } catch (error) {
      logger.error('Sliding window rate limiter error', { key, error });
      return true;
    }
  }
}

// ============================================================================
// 发布订阅
// ============================================================================

export class RedisPubSub {
  private subscriber: RedisClientType | null = null;
  private publisher: RedisClientType | null = null;
  private handlers: Map<string, Set<(message: string) => void>> = new Map();
  private isSubscribed = false;

  /**
   * 初始化发布订阅
   */
  async init(): Promise<void> {
    const client = await getRedisClusterClient();

    // 集群模式不支持 pub/sub，需要单独连接
    if (redisClusterManager.isCluster()) {
      logger.warn('Pub/Sub not supported in cluster mode, using standalone connection');
    }

    // 创建发布者和订阅者
    this.publisher = client as RedisClientType;
    this.subscriber = client.duplicate ? await client.duplicate() : (client as RedisClientType);

    // 设置消息处理
    if (this.subscriber) {
      this.subscriber.on('message', (channel: string, message: string) => {
        const handlers = this.handlers.get(channel);
        if (handlers) {
          handlers.forEach((handler) => {
            try {
              handler(message);
            } catch (error) {
              logger.error('Pub/Sub handler error', { channel, error });
            }
          });
        }
      });
    }
  }

  /**
   * 订阅频道
   */
  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    if (!this.subscriber) {
      await this.init();
    }

    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
      await this.subscriber?.subscribe(channel, (_msg: string) => {
        // 消息会通过 on('message') 事件处理
      });
    }

    const channelHandlers = this.handlers.get(channel);
    if (channelHandlers) {
      channelHandlers.add(handler);
    }
    logger.debug('Subscribed to channel', { channel });
  }

  /**
   * 取消订阅
   */
  async unsubscribe(channel: string, handler?: (message: string) => void): Promise<void> {
    const handlers = this.handlers.get(channel);
    if (!handlers) return;

    if (handler) {
      handlers.delete(handler);
    } else {
      handlers.clear();
    }

    if (handlers.size === 0) {
      await this.subscriber?.unsubscribe(channel);
      this.handlers.delete(channel);
      logger.debug('Unsubscribed from channel', { channel });
    }
  }

  /**
   * 发布消息
   */
  async publish(channel: string, message: string): Promise<void> {
    if (!this.publisher) {
      await this.init();
    }

    await this.publisher?.publish(channel, message);
    logger.debug('Published message', { channel, messageLength: message.length });
  }

  /**
   * 关闭
   */
  async close(): Promise<void> {
    await this.subscriber?.quit();
    await this.publisher?.quit();
    this.handlers.clear();
  }
}

// ============================================================================
// 管道批处理
// ============================================================================

export class RedisPipeline {
  private commands: Array<{ cmd: string; args: unknown[] }> = [];

  /**
   * 添加命令
   */
  add(cmd: string, ...args: unknown[]): this {
    this.commands.push({ cmd, args });
    return this;
  }

  /**
   * 执行管道
   */
  async exec(): Promise<unknown[]> {
    const client = await getRedisClusterClient();

    // 检查是否支持 pipeline
    const multi = (client as RedisClientType).multi?.();
    if (!multi) {
      // 集群模式，逐个执行
      const results: unknown[] = [];
      for (const { cmd, args } of this.commands) {
        try {
          const result = await (client as Record<string, (...args: unknown[]) => Promise<unknown>>)[
            cmd
          ](...args);
          results.push(result);
        } catch (error) {
          results.push(error);
        }
      }
      return results;
    }

    // 单机模式使用事务
    for (const { cmd, args } of this.commands) {
      (multi as Record<string, (...args: unknown[]) => void>)[cmd](...args);
    }

    return await multi.exec();
  }

  /**
   * 清空管道
   */
  clear(): void {
    this.commands = [];
  }

  /**
   * 获取命令数量
   */
  length(): number {
    return this.commands.length;
  }
}

// ============================================================================
// 缓存预热
// ============================================================================

export interface WarmupItem {
  key: string;
  value: unknown;
  ttl?: number;
}

export class RedisCacheWarmer {
  private cache: RedisClusterCache<unknown>;

  constructor(prefix: string = 'warmup') {
    this.cache = new RedisClusterCache({ prefix, defaultTtl: 3600 });
  }

  /**
   * 预热缓存
   */
  async warmup(items: WarmupItem[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    // 使用批处理
    const batchSize = 100;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (item) => {
          try {
            const result = await this.cache.set(item.key, item.value, item.ttl);
            if (result) {
              success++;
            } else {
              failed++;
            }
          } catch (error) {
            failed++;
            logger.error('Warmup failed for key', { key: item.key, error });
          }
        }),
      );
    }

    logger.info('Cache warmup completed', { total: items.length, success, failed });
    return { success, failed };
  }

  /**
   * 预热价格数据
   */
  async warmupPrices(
    prices: Array<{ symbol: string; price: number; timestamp: number }>,
  ): Promise<void> {
    const items: WarmupItem[] = prices.map((p) => ({
      key: `price:${p.symbol}`,
      value: p,
      ttl: 60, // 价格数据 60 秒过期
    }));

    await this.warmup(items);
  }
}

// ============================================================================
// 监控指标
// ============================================================================

export interface RedisMetrics {
  connected: boolean;
  isCluster: boolean;
  totalCommands: number;
  errorCount: number;
  avgResponseTime: number;
}

export class RedisMonitor {
  private metrics = {
    totalCommands: 0,
    errorCount: 0,
    totalResponseTime: 0,
  };

  /**
   * 记录命令执行
   */
  recordCommand(duration: number, success: boolean): void {
    this.metrics.totalCommands++;
    this.metrics.totalResponseTime += duration;
    if (!success) {
      this.metrics.errorCount++;
    }
  }

  /**
   * 获取指标
   */
  getMetrics(): RedisMetrics {
    return {
      connected: redisClusterManager.isConnected(),
      isCluster: redisClusterManager.isCluster(),
      totalCommands: this.metrics.totalCommands,
      errorCount: this.metrics.errorCount,
      avgResponseTime:
        this.metrics.totalCommands > 0
          ? this.metrics.totalResponseTime / this.metrics.totalCommands
          : 0,
    };
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.metrics = {
      totalCommands: 0,
      errorCount: 0,
      totalResponseTime: 0,
    };
  }
}

// ============================================================================
// 便捷函数
// ============================================================================

export function createDistributedLock(prefix?: string): RedisDistributedLock {
  return new RedisDistributedLock(prefix);
}

export function createRateLimiter(prefix?: string): RedisRateLimiter {
  return new RedisRateLimiter(prefix);
}

export function createPubSub(): RedisPubSub {
  return new RedisPubSub();
}

export function createPipeline(): RedisPipeline {
  return new RedisPipeline();
}

export function createCacheWarmer(prefix?: string): RedisCacheWarmer {
  return new RedisCacheWarmer(prefix);
}

export function createRedisMonitor(): RedisMonitor {
  return new RedisMonitor();
}

// 导出单例实例
export const redisLock = new RedisDistributedLock();
export const redisRateLimiter = new RedisRateLimiter();
export const redisPubSub = new RedisPubSub();
export const redisMonitor = new RedisMonitor();
