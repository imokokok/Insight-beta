/**
 * Pyth Sync Module (Refactored)
 *
 * 使用 BaseSyncManager 重构的 Pyth 同步模块
 * 代码量从 496 行减少到 ~70 行
 * 支持更频繁的同步间隔（30秒）
 */

import { createPythClient, getAvailablePythSymbols } from '@/lib/blockchain/pythOracle';
import type { SupportedChain } from '@/lib/types/unifiedOracleTypes';
import { BaseSyncManager, type IOracleClient, type SyncConfig } from './BaseSyncManager';

// ============================================================================
// Pyth Sync Manager
// ============================================================================

export class PythSyncManager extends BaseSyncManager {
  protected readonly protocol = 'pyth' as const;

  // Pyth 使用更频繁的同步间隔（30秒）和更低的价格变化阈值（0.05%）
  protected syncConfig: SyncConfig = {
    defaultIntervalMs: 30000, // 30秒
    batchSize: 100,
    maxConcurrency: 5,
    priceChangeThreshold: 0.0005, // 0.05%
    dataRetentionDays: 90,
  };

  protected createClient(
    chain: SupportedChain,
    rpcUrl: string,
    protocolConfig?: Record<string, unknown>,
  ): IOracleClient {
    return createPythClient(chain, rpcUrl, protocolConfig);
  }

  protected getAvailableSymbols(_chain: SupportedChain): string[] {
    // Pyth 的 symbols 是全局的，不依赖于特定链
    return getAvailablePythSymbols();
  }
}

// ============================================================================
// 单例导出
// ============================================================================

export const pythSyncManager = new PythSyncManager();

// ============================================================================
// 便捷函数
// ============================================================================

export async function startPythSync(instanceId: string): Promise<void> {
  return pythSyncManager.startSync(instanceId);
}

export function stopPythSync(instanceId: string): void {
  return pythSyncManager.stopSync(instanceId);
}

export function stopAllPythSync(): void {
  return pythSyncManager.stopAllSync();
}

export async function cleanupPythData(): Promise<void> {
  return pythSyncManager.cleanupOldData();
}
