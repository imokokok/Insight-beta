/**
 * Config Cache Module - 配置缓存管理模块
 *
 * 支持多级缓存策略：
 * 1. 本地内存缓存（最快，5秒TTL）
 * 2. Redis 分布式缓存（跨实例共享，60秒TTL）
 * 3. 数据库（最终数据源）
 */

import type { OracleConfig } from '@/lib/types/oracleTypes';
import { logger } from '@/lib/logger';
import { RedisCache } from '../redisCache';

/**
 * 配置缓存管理器 - 支持分布式环境
 */
export class ConfigCacheManager {
  private localCache: Map<string, { value: OracleConfig; expiresAt: number }> = new Map();
  private readonly localTtlMs = 5000; // 本地缓存 5 秒
  private distributedCache: RedisCache<OracleConfig>;
  private readonly distributedTtl = 60; // 分布式缓存 60 秒

  constructor() {
    this.distributedCache = new RedisCache<OracleConfig>({
      prefix: 'oracle:config:enhanced',
      defaultTtl: this.distributedTtl,
      version: 1,
    });
  }

  /**
   * 构建缓存键
   */
  private buildKey(instanceId: string): string {
    return `config:${instanceId}`;
  }

  /**
   * 获取配置（多级缓存策略）
   * 1. 本地内存缓存（最快）
   * 2. Redis 分布式缓存（跨实例共享）
   * 3. 数据库（最终数据源）
   */
  async get(instanceId: string): Promise<OracleConfig | null> {
    const key = this.buildKey(instanceId);
    const now = Date.now();

    // 1. 检查本地缓存
    const localEntry = this.localCache.get(key);
    if (localEntry && localEntry.expiresAt > now) {
      logger.debug('Config cache hit (local)', { instanceId });
      return localEntry.value;
    }

    // 2. 检查分布式缓存
    try {
      const distributedValue = await this.distributedCache.get(key);
      if (distributedValue) {
        logger.debug('Config cache hit (distributed)', { instanceId });
        // 回填本地缓存
        this.localCache.set(key, {
          value: distributedValue,
          expiresAt: now + this.localTtlMs,
        });
        return distributedValue;
      }
    } catch (error) {
      logger.warn('Distributed cache get failed', {
        instanceId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return null;
  }

  /**
   * 设置配置缓存
   */
  async set(instanceId: string, config: OracleConfig): Promise<void> {
    const key = this.buildKey(instanceId);
    const now = Date.now();

    // 更新本地缓存
    this.localCache.set(key, {
      value: config,
      expiresAt: now + this.localTtlMs,
    });

    // 更新分布式缓存
    try {
      await this.distributedCache.set(key, config, this.distributedTtl);
    } catch (error) {
      logger.warn('Distributed cache set failed', {
        instanceId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 使缓存失效
   *
   * 注意：必须先清除分布式缓存，再清除本地缓存
   * 这样可以防止在清除本地缓存和分布式缓存之间，
   * 其他实例从分布式缓存读取旧数据到本地缓存
   */
  async invalidate(instanceId: string): Promise<void> {
    const key = this.buildKey(instanceId);

    // 1. 先清除分布式缓存（关键：必须先清分布式）
    try {
      await this.distributedCache.delete(key);
      logger.debug('Distributed cache invalidated', { instanceId });
    } catch (error) {
      logger.warn('Distributed cache delete failed', {
        instanceId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // 2. 再清除本地缓存
    this.localCache.delete(key);
    logger.debug('Local cache invalidated', { instanceId });
  }

  /**
   * 批量使缓存失效
   *
   * 注意：必须先清除分布式缓存，再清除本地缓存
   */
  async invalidateBatch(instanceIds: string[]): Promise<void> {
    const keys = instanceIds.map((id) => this.buildKey(id));

    // 1. 先清除分布式缓存（关键：必须先清分布式）
    try {
      await this.distributedCache.mdel(keys);
      logger.debug('Distributed cache batch invalidated', { count: instanceIds.length });
    } catch (error) {
      logger.warn('Distributed cache batch delete failed', {
        count: instanceIds.length,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // 2. 再清除本地缓存
    for (const key of keys) {
      this.localCache.delete(key);
    }
    logger.debug('Local cache batch invalidated', { count: instanceIds.length });
  }

  /**
   * 获取缓存统计
   */
  async getStats(): Promise<{
    localSize: number;
    distributedKeys: number;
    distributedConnected: boolean;
  }> {
    const distributedStats = await this.distributedCache.stats();
    return {
      localSize: this.localCache.size,
      distributedKeys: distributedStats.keys,
      distributedConnected: distributedStats.connected,
    };
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    this.localCache.clear();
    try {
      await this.distributedCache.clear();
    } catch (error) {
      logger.warn('Distributed cache clear failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

// 单例实例
let cacheManager: ConfigCacheManager | null = null;

/**
 * 获取配置缓存管理器实例
 */
export function getConfigCacheManager(): ConfigCacheManager {
  if (!cacheManager) {
    cacheManager = new ConfigCacheManager();
  }
  return cacheManager;
}
