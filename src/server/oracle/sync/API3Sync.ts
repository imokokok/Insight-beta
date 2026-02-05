/**
 * API3 Sync Module
 *
 * 使用 BaseSyncManager 的 API3 同步模块
 */

import { createAPI3Client, getAvailableAPI3Dapis } from '@/lib/blockchain/api3Oracle';
import type { SupportedChain } from '@/lib/types/unifiedOracleTypes';
import { BaseSyncManager, type IOracleClient, type SyncConfig } from './BaseSyncManager';

// ============================================================================
// API3 Sync Manager
// ============================================================================

export class API3SyncManager extends BaseSyncManager {
  protected readonly protocol = 'api3' as const;

  // API3 使用标准同步间隔（1分钟）
  protected syncConfig: SyncConfig = {
    defaultIntervalMs: 60000, // 1分钟
    batchSize: 50,
    maxConcurrency: 5,
    priceChangeThreshold: 0.001, // 0.1%
    dataRetentionDays: 90,
  };

  protected createClient(
    chain: SupportedChain,
    rpcUrl: string,
    protocolConfig?: Record<string, unknown>,
  ): IOracleClient {
    return createAPI3Client(chain, rpcUrl, protocolConfig);
  }

  protected getAvailableSymbols(chain: SupportedChain): string[] {
    return getAvailableAPI3Dapis(chain);
  }
}

// ============================================================================
// 单例导出
// ============================================================================

export const api3SyncManager = new API3SyncManager();

// ============================================================================
// 便捷函数
// ============================================================================

export async function startAPI3Sync(instanceId: string): Promise<void> {
  return api3SyncManager.startSync(instanceId);
}

export function stopAPI3Sync(instanceId: string): void {
  return api3SyncManager.stopSync(instanceId);
}

export function stopAllAPI3Sync(): void {
  return api3SyncManager.stopAllSync();
}

export async function cleanupAPI3Data(): Promise<void> {
  return api3SyncManager.cleanupOldData();
}
