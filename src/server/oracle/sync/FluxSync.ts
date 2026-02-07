/**
 * Flux Sync Module
 *
 * 使用 BaseSyncManager 重构的 Flux 同步模块
 * 支持 Flux 预言机价格数据同步
 */

import { createFluxClient, getSupportedFluxSymbols } from '@/lib/blockchain/protocols/flux';
import type { SupportedChain } from '@/lib/types/unifiedOracleTypes';

import { BaseSyncManager, type IOracleClient } from './BaseSyncManager';

// ============================================================================
// Flux Sync Manager
// ============================================================================

export class FluxSyncManager extends BaseSyncManager {
  protected readonly protocol = 'flux' as const;

  protected createClient(
    chain: SupportedChain,
    rpcUrl: string,
    protocolConfig?: Record<string, unknown>,
  ): IOracleClient {
    return createFluxClient(chain, {
      rpcUrl,
      ...protocolConfig,
    }) as unknown as IOracleClient;
  }

  protected getAvailableSymbols(chain: SupportedChain): string[] {
    return getSupportedFluxSymbols(chain);
  }
}

// ============================================================================
// 单例导出
// ============================================================================

export const fluxSyncManager = new FluxSyncManager();

// ============================================================================
// 便捷函数
// ============================================================================

export async function startFluxSync(instanceId: string): Promise<void> {
  return fluxSyncManager.startSync(instanceId);
}

export function stopFluxSync(instanceId: string): void {
  fluxSyncManager.stopSync(instanceId);
}

export function stopAllFluxSync(): void {
  fluxSyncManager.stopAllSync();
}

export async function cleanupFluxData(): Promise<void> {
  return fluxSyncManager.cleanupOldData();
}
