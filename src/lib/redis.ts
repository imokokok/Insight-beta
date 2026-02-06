/**
 * Redis Client - Redis 客户端封装
 *
 * 提供统一的 Redis 连接管理和错误处理
 */

import { createClient } from 'redis';

import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';

import type { RedisClientType } from 'redis';

// ============================================================================
// 类型定义
// ============================================================================

export interface RedisConfig {
  url?: string;
  password?: string;
  db?: number;
}

// ============================================================================
// Redis 管理器
// ============================================================================

class RedisManager {
  private client: RedisClientType | null = null;
  private config: RedisConfig;
  private connecting = false;
  private connectionPromise: Promise<RedisClientType> | null = null;

  constructor(config: RedisConfig = {}) {
    this.config = config;
  }

  /**
   * 获取 Redis 客户端（单例模式）
   */
  async getClient(): Promise<RedisClientType> {
    // 如果已有连接，直接返回
    if (this.client?.isOpen) {
      return this.client;
    }

    // 如果正在连接中，等待连接完成
    if (this.connecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    // 开始新连接
    this.connecting = true;
    this.connectionPromise = this.connect();

    try {
      const client = await this.connectionPromise;
      return client;
    } finally {
      this.connecting = false;
      this.connectionPromise = null;
    }
  }

  /**
   * 建立 Redis 连接
   */
  private async connect(): Promise<RedisClientType> {
    const url = this.config.url || env.REDIS_URL || 'redis://localhost:6379';

    try {
      this.client = createClient({
        url,
        password: this.config.password,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error', { error: err.message });
      });

      this.client.on('connect', () => {
        logger.info('Redis Client Connected');
      });

      this.client.on('reconnecting', () => {
        logger.warn('Redis Client Reconnecting');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis', {
        error: error instanceof Error ? error.message : String(error),
        url: url.replace(/:\/\/.*@/, '://***@'), // 隐藏密码
      });
      throw error;
    }
  }

  /**
   * 断开 Redis 连接
   */
  async disconnect(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
      logger.info('Redis Client Disconnected');
    }
    this.client = null;
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.client?.isOpen ?? false;
  }

  // ============================================================================
  // 便捷方法
  // ============================================================================

  /**
   * 发布消息到频道
   */
  async publish(channel: string, message: unknown): Promise<void> {
    const client = await this.getClient();
    await client.publish(channel, JSON.stringify(message));
  }

  /**
   * 订阅频道
   */
  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    const client = await this.getClient();
    await client.subscribe(channel, callback);
  }

  /**
   * 设置键值（带过期时间）
   */
  async setex(key: string, seconds: number, value: string): Promise<void> {
    const client = await this.getClient();
    await client.setEx(key, seconds, value);
  }

  /**
   * 获取键值
   */
  async get(key: string): Promise<string | null> {
    const client = await this.getClient();
    return client.get(key);
  }

  /**
   * 删除键
   */
  async del(key: string): Promise<void> {
    const client = await this.getClient();
    await client.del(key);
  }

  /**
   * 获取 pipeline 用于批量操作
   */
  async pipeline() {
    const client = await this.getClient();
    return client.multi();
  }
}

// ============================================================================
// 导出单例
// ============================================================================

const redisManager = new RedisManager();

/**
 * 获取 Redis 客户端
 */
export async function getRedisClient(): Promise<RedisClientType> {
  return redisManager.getClient();
}

/**
 * 获取 Redis 管理器实例
 */
export function getRedisManager(): RedisManager {
  return redisManager;
}

export { RedisManager, redisManager };

// ============================================================================
// 便捷导出函数
// ============================================================================

/**
 * 关闭 Redis 连接
 */
export async function closeRedisConnection(): Promise<void> {
  await redisManager.disconnect();
}

/**
 * 检查 Redis 是否已连接
 */
export function isRedisConnected(): boolean {
  return redisManager.isConnected();
}

/**
 * 获取 Redis 统计信息
 */
export function getRedisStats(): {
  connected: boolean;
  ready: boolean;
  open: boolean;
} {
  return {
    connected: redisManager.isConnected(),
    ready: redisManager.isConnected(),
    open: redisManager.isConnected(),
  };
}

/**
 * 设置键值
 */
export async function redisSet(key: string, value: string): Promise<void> {
  const client = await redisManager.getClient();
  await client.set(key, value);
}

/**
 * 获取键值
 */
export async function redisGet(key: string): Promise<string | null> {
  const client = await redisManager.getClient();
  return client.get(key);
}

/**
 * 删除键
 */
export async function redisDel(key: string): Promise<void> {
  const client = await redisManager.getClient();
  await client.del(key);
}

/**
 * 设置键值（带过期时间）
 */
export async function redisSetEx(key: string, seconds: number, value: string): Promise<void> {
  const client = await redisManager.getClient();
  await client.setEx(key, seconds, value);
}

/**
 * 发布消息到频道
 */
export async function redisPublish(channel: string, message: string): Promise<number> {
  const client = await redisManager.getClient();
  return client.publish(channel, message);
}

/**
 * 订阅频道
 */
export async function redisSubscribe(
  channel: string,
  callback: (message: string) => void,
): Promise<void> {
  const client = await redisManager.getClient();
  await client.subscribe(channel, callback);
}
