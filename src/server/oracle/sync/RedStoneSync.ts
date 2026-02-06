/**
 * RedStone Sync Module
 *
 * 使用 BaseSyncManager 的 RedStone 同步模块
 */

import { createRedStoneClient, getAvailableRedStoneSymbols } from '@/lib/blockchain/redstoneOracle';
import type { SupportedChain } from '@/lib/types/unifiedOracleTypes';

import { BaseSyncManager, type IOracleClient, type SyncConfig } from './BaseSyncManager';

// ============================================================================
// RedStone Sync Manager
// ============================================================================

export class RedStoneSyncManager extends BaseSyncManager {
  protected readonly protocol = 'redstone' as const;

  // RedStone 使用较频繁的同步间隔（30秒）
  protected syncConfig: SyncConfig = {
    defaultIntervalMs: 30000, // 30秒
    batchSize: 50,
    maxConcurrency: 5,
    priceChangeThreshold: 0.0005, // 0.05%
    dataRetentionDays: 90,
  };

  protected createClient(
    chain: SupportedChain,
    rpcUrl: string,
    protocolConfig?: Record<string, unknown>,
  ): IOracleClient {
    return createRedStoneClient(chain, rpcUrl, protocolConfig);
  }

  protected getAvailableSymbols(chain: SupportedChain): string[] {
    return getAvailableRedStoneSymbols(chain);
  }
}

// ============================================================================
// 单例导出
// ============================================================================

export const redstoneSyncManager = new RedStoneSyncManager();

// ============================================================================
// 便捷函数
// ============================================================================

export async function startRedStoneSync(instanceId: string): Promise<void> {
  return redstoneSyncManager.startSync(instanceId);
}

export function stopRedStoneSync(instanceId: string): void {
  return redstoneSyncManager.stopSync(instanceId);
}

export function stopAllRedStoneSync(): void {
  return redstoneSyncManager.stopAllSync();
}

export async function cleanupRedStoneData(): Promise<void> {
  return redstoneSyncManager.cleanupOldData();
}
