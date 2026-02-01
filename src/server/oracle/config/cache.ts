import { oracleConfigCache } from '@/server/redisCache';
import { getMemoryInstance, getMemoryStore } from '@/server/memoryBackend';
import { logger } from '@/lib/logger';
import type { OracleConfig } from './types';

const CACHE_VERSION = 'v1';
const CACHE_TTL_SECONDS = 300; // 5 minutes

/**
 * 生成缓存键
 */
function getCacheKey(instanceId: string): string {
  return `oracle:config:${CACHE_VERSION}:${instanceId}`;
}

/**
 * 从缓存获取 Oracle 配置
 */
export async function getOracleConfigFromCache(instanceId: string): Promise<OracleConfig | null> {
  const cacheKey = getCacheKey(instanceId);

  // 尝试从 Redis 缓存获取
  const cached = await oracleConfigCache.get(cacheKey);
  if (cached) {
    logger.debug('Oracle config cache hit', { instanceId });
    return cached as OracleConfig;
  }

  // 尝试从内存缓存获取
  const memoryStore = getMemoryStore();
  if (memoryStore) {
    const memoryInstance = getMemoryInstance(memoryStore, `oracle_config_${instanceId}`);
    const memoryConfig = memoryInstance.getAll();
    if (memoryConfig.length > 0) {
      logger.debug('Oracle config memory cache hit', { instanceId });
      return memoryConfig[0] as OracleConfig;
    }
  }

  return null;
}

/**
 * 保存 Oracle 配置到缓存
 */
export async function saveOracleConfigToCache(config: OracleConfig): Promise<void> {
  const cacheKey = getCacheKey(config.instanceId);

  // 保存到 Redis 缓存
  await oracleConfigCache.set(cacheKey, config, CACHE_TTL_SECONDS);

  // 保存到内存缓存
  const memoryStore = getMemoryStore();
  if (memoryStore) {
    const memoryInstance = getMemoryInstance(memoryStore, `oracle_config_${config.instanceId}`);
    // @ts-expect-error - MemoryInstance API
    if (memoryInstance.clear) memoryInstance.clear();
    // @ts-expect-error - MemoryInstance API
    if (memoryInstance.add) memoryInstance.add(config);
  }

  logger.debug('Oracle config cached', { instanceId: config.instanceId });
}

/**
 * 从缓存删除 Oracle 配置
 */
export async function deleteOracleConfigFromCache(instanceId: string): Promise<void> {
  const cacheKey = getCacheKey(instanceId);

  // 从 Redis 缓存删除
  await oracleConfigCache.delete(cacheKey);

  // 从内存缓存删除
  const memoryStore = getMemoryStore();
  if (memoryStore) {
    const memoryInstance = getMemoryInstance(memoryStore, `oracle_config_${instanceId}`);
    // @ts-expect-error - MemoryInstance API
    if (memoryInstance.clear) memoryInstance.clear();
  }

  logger.debug('Oracle config removed from cache', { instanceId });
}

/**
 * 清除所有 Oracle 配置缓存
 */
export async function clearOracleConfigCache(): Promise<void> {
  // 清除 Redis 缓存
  await oracleConfigCache.clear();

  // 清除内存缓存
  const memoryStore = getMemoryStore();
  if (memoryStore) {
    // @ts-expect-error - MemoryStore API
    const keys = memoryStore.keys ? memoryStore.keys() : [];
    for (const key of keys) {
      if (key.startsWith('oracle_config_')) {
        const instance = getMemoryInstance(memoryStore, key);
        // @ts-expect-error - MemoryInstance API
        if (instance.clear) instance.clear();
      }
    }
  }

  logger.info('Oracle config cache cleared');
}

/**
 * 刷新缓存
 */
export async function refreshOracleConfigCache(config: OracleConfig): Promise<void> {
  await saveOracleConfigToCache(config);
}
