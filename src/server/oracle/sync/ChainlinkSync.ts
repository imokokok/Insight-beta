/**
 * Chainlink Sync Module (Refactored)
 *
 * 使用 BaseSyncManager 重构的 Chainlink 同步模块
 * 代码量从 499 行减少到 ~60 行
 */

import {
  createChainlinkClient,
  getAvailableFeedsForChain,
} from '@/lib/blockchain/chainlinkDataFeeds';
import type { SupportedChain } from '@/lib/types/unifiedOracleTypes';

import { BaseSyncManager, type IOracleClient } from './BaseSyncManager';

// ============================================================================
// Chainlink Sync Manager
// ============================================================================

export class ChainlinkSyncManager extends BaseSyncManager {
  protected readonly protocol = 'chainlink' as const;

  protected createClient(
    chain: SupportedChain,
    rpcUrl: string,
    protocolConfig?: Record<string, unknown>,
  ): IOracleClient {
    return createChainlinkClient(chain, rpcUrl, protocolConfig);
  }

  protected getAvailableSymbols(chain: SupportedChain): string[] {
    return getAvailableFeedsForChain(chain);
  }
}

// ============================================================================
// 单例导出
// ============================================================================

export const chainlinkSyncManager = new ChainlinkSyncManager();

// ============================================================================
// 便捷函数
// ============================================================================

export async function startChainlinkSync(instanceId: string): Promise<void> {
  return chainlinkSyncManager.startSync(instanceId);
}

export function stopChainlinkSync(instanceId: string): void {
  return chainlinkSyncManager.stopSync(instanceId);
}

export function stopAllChainlinkSync(): void {
  return chainlinkSyncManager.stopAllSync();
}

export async function cleanupChainlinkData(): Promise<void> {
  return chainlinkSyncManager.cleanupOldData();
}
