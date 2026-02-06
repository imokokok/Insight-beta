/**
 * Oracle 配置管理模块
 *
 * 提供统一的 Oracle 配置管理接口，包括：
 * - 配置验证
 * - 数据库存储
 * - 缓存管理
 * - CRUD 操作
 */

// 类型定义
export {
  type OracleConfig,
  type ValidationErrorDetails,
  type ValidationResult,
  ValidationError,
  ValidationErrors,
  CHAIN_VALUES,
  DEFAULT_ORACLE_INSTANCE_ID,
} from './types';

// 验证功能
export {
  normalizeUrl,
  normalizeInstanceId,
  validateOracleInstanceId,
  validateRpcUrl,
  normalizeAddress,
  validateContractAddress,
  validateChain,
  validateMaxBlockRange,
  validateVotingPeriodHours,
  redactOracleConfig,
} from './validation';

// 数据库操作
export {
  ensureDb,
  getOracleConfigFromDb,
  saveOracleConfigToDb,
  deleteOracleConfigFromDb,
  listOracleConfigsFromDb,
  configExistsInDb,
} from './database';

// 缓存操作
export {
  getOracleConfigFromCache,
  saveOracleConfigToCache,
  deleteOracleConfigFromCache,
  clearOracleConfigCache,
  refreshOracleConfigCache,
} from './cache';

// 统一配置管理类
import { logger } from '@/lib/logger';

import {
  getOracleConfigFromCache,
  saveOracleConfigToCache,
  deleteOracleConfigFromCache,
} from './cache';
import {
  getOracleConfigFromDb,
  saveOracleConfigToDb,
  deleteOracleConfigFromDb,
  listOracleConfigsFromDb,
} from './database';
import { DEFAULT_ORACLE_INSTANCE_ID } from './types';
import { validateOracleInstanceId, redactOracleConfig } from './validation';

import type { OracleConfig } from './types';

/**
 * 获取 Oracle 配置（带缓存）
 *
 * 优先从缓存获取，缓存未命中则从数据库获取并更新缓存
 *
 * @param instanceId - 实例 ID
 * @returns Oracle 配置或 null
 */
export async function getOracleConfig(
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<OracleConfig | null> {
  const normalizedId = validateOracleInstanceId(instanceId);

  // 尝试从缓存获取
  const cached = await getOracleConfigFromCache(normalizedId);
  if (cached) {
    return cached;
  }

  // 从数据库获取
  const config = await getOracleConfigFromDb(normalizedId);
  if (config) {
    // 更新缓存
    await saveOracleConfigToCache(config);
  }

  return config;
}

/**
 * 保存 Oracle 配置
 *
 * 同时保存到数据库和缓存
 *
 * @param config - Oracle 配置
 */
export async function saveOracleConfig(config: OracleConfig): Promise<void> {
  // 验证配置
  const validatedConfig: OracleConfig = {
    ...config,
    instanceId: validateOracleInstanceId(config.instanceId),
  };

  // 保存到数据库
  await saveOracleConfigToDb(validatedConfig);

  // 更新缓存
  await saveOracleConfigToCache(validatedConfig);

  logger.info('Oracle config saved', { instanceId: validatedConfig.instanceId });
}

/**
 * 删除 Oracle 配置
 *
 * 同时从数据库和缓存删除
 *
 * @param instanceId - 实例 ID
 */
export async function deleteOracleConfig(
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<void> {
  const normalizedId = validateOracleInstanceId(instanceId);

  // 从数据库删除
  await deleteOracleConfigFromDb(normalizedId);

  // 从缓存删除
  await deleteOracleConfigFromCache(normalizedId);

  logger.info('Oracle config deleted', { instanceId: normalizedId });
}

/**
 * 获取所有 Oracle 配置列表
 *
 * @returns Oracle 配置列表
 */
export async function listOracleConfigs(): Promise<OracleConfig[]> {
  return listOracleConfigsFromDb();
}

/**
 * 获取脱敏的 Oracle 配置
 *
 * @param instanceId - 实例 ID
 * @returns 脱敏后的配置
 */
export async function getRedactedOracleConfig(
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<Partial<OracleConfig> | null> {
  const config = await getOracleConfig(instanceId);
  if (!config) return null;
  return redactOracleConfig(config);
}

/**
 * 检查配置是否存在
 *
 * @param instanceId - 实例 ID
 * @returns 是否存在
 */
export async function oracleConfigExists(instanceId: string): Promise<boolean> {
  const config = await getOracleConfig(instanceId);
  return config !== null;
}

/**
 * 刷新配置缓存
 *
 * @param instanceId - 实例 ID
 */
export async function refreshConfigCache(
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<void> {
  const normalizedId = validateOracleInstanceId(instanceId);

  // 从数据库获取最新配置
  const config = await getOracleConfigFromDb(normalizedId);
  if (config) {
    await saveOracleConfigToCache(config);
    logger.debug('Config cache refreshed', { instanceId: normalizedId });
  } else {
    // 如果配置不存在，删除缓存
    await deleteOracleConfigFromCache(normalizedId);
    logger.debug('Config cache cleared (config not found)', { instanceId: normalizedId });
  }
}

// 默认导出
const oracleConfigService = {
  get: getOracleConfig,
  save: saveOracleConfig,
  delete: deleteOracleConfig,
  list: listOracleConfigs,
  getRedacted: getRedactedOracleConfig,
  exists: oracleConfigExists,
  refreshCache: refreshConfigCache,
};

export default oracleConfigService;
