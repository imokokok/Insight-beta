/**
 * Redis Cluster Configuration - Redis 集群配置
 *
 * 提供高可用的 Redis 集群支持：
 * - 主从复制
 * - 自动故障转移
 * - 读写分离
 * - 连接池管理
 */

import { createClient, createCluster, type RedisClientType, type RedisClusterType } from 'redis';

import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';

// ============================================================================
// 类型定义
// ============================================================================

export interface RedisClusterConfig {
  /** 集群节点列表 */
  nodes: Array<{ host: string; port: number }>;
  /** 密码 */
  password?: string;
  /** 数据库 */
  db?: number;
  /** 连接超时 */
  connectTimeout?: number;
  /** 命令超时 */
  commandTimeout?: number;
  /** 重试策略 */
  retryStrategy?: (retries: number) => number | Error;
  /** 最大重定向次数 */
  maxRedirects?: number;
}

export interface RedisNodeConfig {
  /** 节点 URL */
  url: string;
  /** 是否只读（从节点） */
  readonly?: boolean;
}

// ============================================================================
// Redis 集群管理器
// ============================================================================

class RedisClusterManager {
  private cluster: RedisClusterType | null = null;
  private standaloneClient: RedisClientType | null = null;
  private config: RedisClusterConfig;
  private isClusterMode = false;
  private connecting = false;
  private connectionPromise: Promise<RedisClusterType | RedisClientType> | null = null;

  constructor(config: Partial<RedisClusterConfig> = {}) {
    this.config = this.buildConfig(config);
  }

  /**
   * 构建配置
   */
  private buildConfig(config: Partial<RedisClusterConfig>): RedisClusterConfig {
    const clusterNodes = this.parseClusterNodes();

    return {
      nodes: config.nodes || clusterNodes || [{ host: 'localhost', port: 6379 }],
      password: config.password || this.getPassword(),
      db: config.db ?? 0,
      connectTimeout: config.connectTimeout ?? 10000,
      commandTimeout: config.commandTimeout ?? 5000,
      maxRedirects: config.maxRedirects ?? 16,
      retryStrategy: config.retryStrategy || this.defaultRetryStrategy,
    };
  }

  /**
   * 默认重试策略
   */
  private defaultRetryStrategy(retries: number): number | Error {
    if (retries > 10) {
      logger.error('Redis max reconnection attempts reached');
      return new Error('Max reconnection attempts reached');
    }
    return Math.min(retries * 100, 3000);
  }

  /**
   * 从环境变量解析集群节点
   */
  private parseClusterNodes(): Array<{ host: string; port: number }> | null {
    // 从 REDIS_URL 解析集群配置，格式: redis://host1:port1,host2:port2,host3:port3
    const clusterUrl = env.REDIS_URL;
    if (!clusterUrl || !clusterUrl.includes(',')) return null;

    try {
      const url = new URL(clusterUrl);
      const hosts = url.hostname.split(',');

      return hosts.map((host) => {
        const [hostname, portStr] = host.split(':');
        return {
          host: hostname ?? 'localhost',
          port: parseInt(portStr || '6379', 10),
        };
      });
    } catch {
      // 尝试简单格式: host1:port1,host2:port2
      const hosts = clusterUrl.split(',');
      return hosts.map((host) => {
        const [hostname, portStr] = host.split(':');
        return {
          host: hostname ?? 'localhost',
          port: parseInt(portStr || '6379', 10),
        };
      });
    }
  }

  /**
   * 获取密码
   */
  private getPassword(): string | undefined {
    // 从 REDIS_URL 解析密码
    try {
      const url = new URL(env.REDIS_URL);
      return url.password || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * 获取 Redis 客户端（集群或单机）
   */
  async getClient(): Promise<RedisClusterType | RedisClientType> {
    // 如果已有连接，直接返回
    if (this.cluster?.isOpen) {
      return this.cluster;
    }
    if (this.standaloneClient?.isOpen) {
      return this.standaloneClient;
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
   * 建立连接（优先尝试集群模式）
   */
  private async connect(): Promise<RedisClusterType | RedisClientType> {
    // 如果有多个节点，尝试集群模式
    if (this.config.nodes.length > 1) {
      try {
        await this.connectCluster();
        this.isClusterMode = true;
        logger.info('Redis Cluster connected', { nodes: this.config.nodes.length });
        return this.cluster!;
      } catch (error) {
        logger.warn('Failed to connect to Redis Cluster, falling back to standalone', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 单机模式
    await this.connectStandalone();
    this.isClusterMode = false;
    return this.standaloneClient!;
  }

  /**
   * 连接集群
   */
  private async connectCluster(): Promise<void> {
    const rootNodes = this.config.nodes.map((node) => ({
      url: `redis://${node.host}:${node.port}`,
    }));

    this.cluster = createCluster({
      rootNodes,
      defaults: {
        password: this.config.password,
        socket: {
          connectTimeout: this.config.connectTimeout,
          reconnectStrategy: this.config.retryStrategy,
        },
      },
      useReplicas: true, // 启用从节点读取
    });

    this.cluster.on('error', (err) => {
      logger.error('Redis Cluster Error', { error: err.message });
    });

    this.cluster.on('connect', () => {
      logger.info('Redis Cluster Client Connected');
    });

    this.cluster.on('node:error', (err, node) => {
      logger.error('Redis Cluster Node Error', {
        error: err.message,
        node: `${node.options?.host}:${node.options?.port}`,
      });
    });

    await this.cluster.connect();
  }

  /**
   * 连接单机
   */
  private async connectStandalone(): Promise<void> {
    const node = this.config.nodes[0];
    if (!node) {
      throw new Error('No Redis node configured');
    }
    const url = `redis://${node.host}:${node.port}`;

    this.standaloneClient = createClient({
      url,
      password: this.config.password,
      socket: {
        connectTimeout: this.config.connectTimeout,
        reconnectStrategy: this.config.retryStrategy,
      },
    });

    this.standaloneClient.on('error', (err) => {
      logger.error('Redis Standalone Error', { error: err.message });
    });

    this.standaloneClient.on('connect', () => {
      logger.info('Redis Standalone Client Connected');
    });

    await this.standaloneClient.connect();
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.cluster?.isOpen) {
      await this.cluster.quit();
      logger.info('Redis Cluster disconnected');
    }
    if (this.standaloneClient?.isOpen) {
      await this.standaloneClient.quit();
      logger.info('Redis Standalone disconnected');
    }
    this.cluster = null;
    this.standaloneClient = null;
  }

  /**
   * 检查是否是集群模式
   */
  isCluster(): boolean {
    return this.isClusterMode;
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.cluster?.isOpen || this.standaloneClient?.isOpen || false;
  }

  /**
   * 获取集群信息
   */
  async getClusterInfo(): Promise<Record<string, unknown> | null> {
    if (!this.isClusterMode || !this.cluster) {
      return null;
    }

    try {
      // 使用 info 命令获取集群信息
      // 集群模式下需要通过类型断言访问 info 方法
      const info = await (this.cluster as unknown as { info(): Promise<string> }).info();
      return { clusterInfo: info };
    } catch (error) {
      logger.error('Failed to get cluster info', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * 执行命令（自动选择集群或单机）
   */
  async execute<T>(
    operation: (client: RedisClusterType | RedisClientType) => Promise<T>,
  ): Promise<T> {
    const client = await this.getClient();
    return operation(client);
  }
}

// ============================================================================
// 导出单例
// ============================================================================

const redisClusterManager = new RedisClusterManager();

export { RedisClusterManager, redisClusterManager };

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 获取 Redis 集群客户端
 */
export async function getRedisClusterClient(): Promise<RedisClusterType | RedisClientType> {
  return redisClusterManager.getClient();
}

/**
 * 检查是否是集群模式
 */
export function isRedisCluster(): boolean {
  return redisClusterManager.isCluster();
}

/**
 * 获取集群信息
 */
export async function getRedisClusterInfo(): Promise<Record<string, unknown> | null> {
  return redisClusterManager.getClusterInfo();
}

/**
 * 关闭 Redis 集群连接
 */
export async function closeRedisClusterConnection(): Promise<void> {
  await redisClusterManager.disconnect();
}

// ============================================================================
// 高阶缓存类（支持集群）
// ============================================================================

export class RedisClusterCache<T> {
  private prefix: string;
  private defaultTtl: number;
  private version: number;

  constructor(
    options: { prefix: string; defaultTtl?: number; version?: number } = { prefix: 'cache' },
  ) {
    this.prefix = options.prefix;
    this.defaultTtl = options.defaultTtl ?? 300;
    this.version = options.version ?? 1;
  }

  private buildKey(key: string): string {
    return `oracle-monitor:${this.prefix}:v${this.version}:${key}`;
  }

  /**
   * 获取值
   */
  async get(key: string): Promise<T | null> {
    try {
      const client = await getRedisClusterClient();
      const data = await client.get(this.buildKey(key));

      if (!data) return null;

      const parsed = JSON.parse(data);
      if (parsed._meta?.version !== this.version) {
        await this.delete(key);
        return null;
      }

      return parsed.value as T;
    } catch (error) {
      logger.error('Redis cluster cache get error', { key, error });
      return null;
    }
  }

  /**
   * 设置值
   */
  async set(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const client = await getRedisClusterClient();
      const effectiveTtl = ttl ?? this.defaultTtl;
      const data = {
        value,
        _meta: {
          createdAt: Date.now(),
          version: this.version,
        },
      };

      await client.setEx(this.buildKey(key), effectiveTtl, JSON.stringify(data));
      return true;
    } catch (error) {
      logger.error('Redis cluster cache set error', { key, error });
      return false;
    }
  }

  /**
   * 删除值
   */
  async delete(key: string): Promise<boolean> {
    try {
      const client = await getRedisClusterClient();
      await client.del(this.buildKey(key));
      return true;
    } catch (error) {
      logger.error('Redis cluster cache delete error', { key, error });
      return false;
    }
  }

  /**
   * 批量获取
   */
  async mget(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return [];

    try {
      const client = await getRedisClusterClient();
      const prefixedKeys = keys.map((k) => this.buildKey(k));

      // 集群模式下 mget 可能需要特殊处理
      if (isRedisCluster()) {
        // 在集群中，mget 只能操作同一 slot 的 key
        // 这里使用 pipeline 逐个获取
        const results: (T | null)[] = [];
        for (const key of prefixedKeys) {
          const data = await client.get(key);
          if (!data) {
            results.push(null);
            continue;
          }
          try {
            const parsed = JSON.parse(data);
            results.push(parsed._meta?.version === this.version ? parsed.value : null);
          } catch {
            results.push(null);
          }
        }
        return results;
      } else {
        // 单机模式可以直接使用 mGet
        const results = await (client as RedisClientType).mGet(prefixedKeys);
        return results.map((data) => {
          if (!data) return null;
          try {
            const parsed = JSON.parse(data);
            return parsed._meta?.version === this.version ? parsed.value : null;
          } catch {
            return null;
          }
        });
      }
    } catch (error) {
      logger.error('Redis cluster cache mget error', { keys, error });
      return keys.map(() => null);
    }
  }

  /**
   * 批量设置
   */
  async mset(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<boolean> {
    if (entries.length === 0) return true;

    try {
      const client = await getRedisClusterClient();

      // 在集群中，使用 pipeline 逐个设置
      for (const entry of entries) {
        const effectiveTtl = entry.ttl ?? this.defaultTtl;
        const data = {
          value: entry.value,
          _meta: {
            createdAt: Date.now(),
            version: this.version,
          },
        };
        await client.setEx(this.buildKey(entry.key), effectiveTtl, JSON.stringify(data));
      }

      return true;
    } catch (error) {
      logger.error('Redis cluster cache mset error', { entries: entries.length, error });
      return false;
    }
  }

  /**
   * 清除所有缓存
   */
  async clear(): Promise<boolean> {
    try {
      const client = await getRedisClusterClient();
      const pattern = this.buildKey('*');

      if (isRedisCluster()) {
        // 集群模式下使用 keys 命令（生产环境建议使用 scan）
        const cluster = client as RedisClusterType;
        const keys = await (
          cluster as unknown as { keys(pattern: string): Promise<string[]> }
        ).keys(pattern);
        if (keys.length > 0) {
          await (cluster as unknown as { del(keys: string[]): Promise<number> }).del(keys);
        }
      } else {
        // 单机模式
        const standalone = client as RedisClientType;
        const keys: string[] = [];
        for await (const key of standalone.scanIterator({ MATCH: pattern, COUNT: 100 })) {
          keys.push(key);
          if (keys.length >= 100) {
            await standalone.del(keys);
            keys.length = 0;
          }
        }
        if (keys.length > 0) {
          await standalone.del(keys);
        }
      }

      return true;
    } catch (error) {
      logger.error('Redis cluster cache clear error', { error });
      return false;
    }
  }
}

// 导出缓存实例
export const oracleClusterCache = new RedisClusterCache<Record<string, unknown>>({
  prefix: 'oracle:cluster',
  defaultTtl: 300,
  version: 1,
});
