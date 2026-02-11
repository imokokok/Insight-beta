/**
 * Storage Utilities
 *
 * localStorage 操作的通用工具函数，避免重复代码
 */

import { logger } from '@/lib/logger';

/**
 * Storage 键名常量
 */
export const STORAGE_KEYS = {
  ORACLE_FILTERS: 'oracleFilters',
  USER_PREFERENCES: 'userPreferences',
  THEME: 'theme',
  LANGUAGE: 'language',
} as const;

/**
 * 从 localStorage 安全地读取数据
 *
 * @template T - 期望的数据类型
 * @param key - storage 键名
 * @param defaultValue - 默认值（当读取失败或不存在时返回）
 * @returns 解析后的数据或默认值
 *
 * @example
 * ```typescript
 * const filters = getStorageItem<OracleFilters>('oracleFilters', { instanceId: 'default' });
 * ```
 */
export function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  try {
    const saved = window.localStorage.getItem(key);
    if (!saved) {
      return defaultValue;
    }

    return JSON.parse(saved) as T;
  } catch (error) {
    logger.warn(`Failed to parse storage item: ${key}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return defaultValue;
  }
}

/**
 * 安全地写入数据到 localStorage
 *
 * @param key - storage 键名
 * @param value - 要存储的数据
 * @returns 是否写入成功
 *
 * @example
 * ```typescript
 * setStorageItem('oracleFilters', { instanceId: 'new-id' });
 * ```
 */
export function setStorageItem<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error(`Failed to save storage item: ${key}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * 从 localStorage 安全地移除数据
 *
 * @param key - storage 键名
 * @returns 是否移除成功
 */
export function removeStorageItem(key: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (error) {
    logger.error(`Failed to remove storage item: ${key}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

// ============================================================================
// Oracle Filters 专用函数
// ============================================================================

export interface OracleFilters {
  instanceId?: string;
}

const DEFAULT_INSTANCE_ID = 'default';

/**
 * 获取 Oracle Filters
 */
export function getOracleFilters(): OracleFilters {
  return getStorageItem<OracleFilters>(STORAGE_KEYS.ORACLE_FILTERS, {
    instanceId: DEFAULT_INSTANCE_ID,
  });
}

/**
 * 获取 Oracle instanceId
 */
export function getOracleInstanceId(): string {
  const filters = getOracleFilters();
  return filters.instanceId?.trim() || DEFAULT_INSTANCE_ID;
}

/**
 * 设置 Oracle instanceId
 */
export function setOracleInstanceId(instanceId: string): boolean {
  const normalized = instanceId.trim() || DEFAULT_INSTANCE_ID;
  return setStorageItem(STORAGE_KEYS.ORACLE_FILTERS, { instanceId: normalized });
}

/**
 * 清除 Oracle Filters
 */
export function clearOracleFilters(): boolean {
  return removeStorageItem(STORAGE_KEYS.ORACLE_FILTERS);
}

/**
 * 检查是否使用默认 instanceId
 */
export function isDefaultOracleInstance(instanceId: string): boolean {
  return instanceId === DEFAULT_INSTANCE_ID;
}

/**
 * 合并更新 Oracle Filters
 *
 * 保留现有值并合并新值
 *
 * @param updates - 要更新的部分
 * @returns 是否更新成功
 *
 * @example
 * ```typescript
 * mergeOracleFilters({ instanceId: 'new-id' });
 * mergeOracleFilters({ viewMode: 'list', disputeStatus: 'Voting' });
 * ```
 */
export function mergeOracleFilters(updates: Record<string, unknown>): boolean {
  const current = getStorageItem<Record<string, unknown>>(STORAGE_KEYS.ORACLE_FILTERS, {});
  const next = { ...current, ...updates };
  return setStorageItem(STORAGE_KEYS.ORACLE_FILTERS, next);
}

/**
 * 获取 Oracle Filter 中的特定值
 *
 * @param key - 要获取的键
 * @param defaultValue - 默认值
 * @returns 存储的值或默认值
 *
 * @example
 * ```typescript
 * const viewMode = getOracleFilterValue('viewMode', 'grid');
 * const status = getOracleFilterValue('disputeStatus', 'All');
 * ```
 */
export function getOracleFilterValue<T>(key: string, defaultValue: T): T {
  const filters = getStorageItem<Record<string, unknown>>(STORAGE_KEYS.ORACLE_FILTERS, {});
  const value = filters[key];
  return value !== undefined ? (value as T) : defaultValue;
}
