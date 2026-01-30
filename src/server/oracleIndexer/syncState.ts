/**
 * Oracle Indexer 同步状态管理模块
 *
 * 提供同步状态的管理和并发控制功能
 */

import { DEFAULT_ORACLE_INSTANCE_ID } from '../oracleConfig';
import { syncOracleOnce } from './syncCore';
import type { SyncResult } from './types';

/** 进行中的同步任务映射 */
const inflightByInstance = new Map<string, Promise<SyncResult>>();

/**
 * 确保 Oracle 同步完成
 * 如果已有同步任务在进行中，则等待其完成
 * @param instanceId - 实例 ID
 * @returns 同步结果
 */
export async function ensureOracleSynced(
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<SyncResult> {
  const normalizedInstanceId = (instanceId || DEFAULT_ORACLE_INSTANCE_ID).trim();

  // 检查是否已有进行中的同步
  const existing = inflightByInstance.get(normalizedInstanceId);
  if (existing) return existing;

  // 创建新的同步任务
  const p = syncOracleOnce(normalizedInstanceId).finally(() => {
    inflightByInstance.delete(normalizedInstanceId);
  });

  inflightByInstance.set(normalizedInstanceId, p);
  return p;
}

/**
 * 检查 Oracle 是否正在同步
 * @param instanceId - 实例 ID（可选，不传则检查是否有任何实例在同步）
 * @returns 是否正在同步
 */
export function isOracleSyncing(instanceId?: string): boolean {
  if (instanceId) {
    const normalizedInstanceId = (instanceId || DEFAULT_ORACLE_INSTANCE_ID).trim();
    return inflightByInstance.has(normalizedInstanceId);
  }
  return inflightByInstance.size > 0;
}

/**
 * 获取所有正在同步的实例 ID
 * @returns 实例 ID 数组
 */
export function getSyncingInstances(): string[] {
  return Array.from(inflightByInstance.keys());
}

/**
 * 取消指定实例的同步
 * @param instanceId - 实例 ID
 * @returns 是否成功取消
 */
export function cancelSync(instanceId: string): boolean {
  const normalizedInstanceId = (instanceId || DEFAULT_ORACLE_INSTANCE_ID).trim();
  return inflightByInstance.delete(normalizedInstanceId);
}

/**
 * 取消所有同步任务
 */
export function cancelAllSyncs(): void {
  inflightByInstance.clear();
}
