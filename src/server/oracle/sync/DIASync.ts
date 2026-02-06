/**
 * DIA Sync Module
 *
 * 使用 BaseSyncManager 的 DIA 同步模块
 */

import { createDIAClient, getAvailableDIASymbols } from '@/lib/blockchain/diaOracle';
import type { SupportedChain } from '@/lib/types/unifiedOracleTypes';

import { BaseSyncManager, type IOracleClient, type SyncConfig } from './BaseSyncManager';

// ============================================================================
// DIA Sync Manager
// ============================================================================

export class DIASyncManager extends BaseSyncManager {
  protected readonly protocol = 'dia' as const;

  // DIA 使用较长的同步间隔（10分钟）
  protected syncConfig: SyncConfig = {
    defaultIntervalMs: 600000, // 10分钟
    batchSize: 50,
    maxConcurrency: 3,
    priceChangeThreshold: 0.005, // 0.5%
    dataRetentionDays: 90,
  };

  protected createClient(
    chain: SupportedChain,
    rpcUrl: string,
    protocolConfig?: Record<string, unknown>,
  ): IOracleClient {
    return createDIAClient(chain, rpcUrl, protocolConfig);
  }

  protected getAvailableSymbols(chain: SupportedChain): string[] {
    return getAvailableDIASymbols(chain);
  }
}

// ============================================================================
// 单例导出
// ============================================================================

export const diaSyncManager = new DIASyncManager();

// ============================================================================
// 便捷函数
// ============================================================================

export async function startDIASync(instanceId: string): Promise<void> {
  return diaSyncManager.startSync(instanceId);
}

export function stopDIASync(instanceId: string): void {
  return diaSyncManager.stopSync(instanceId);
}

export function stopAllDIASync(): void {
  return diaSyncManager.stopAllSync();
}

export async function cleanupDIAData(): Promise<void> {
  return diaSyncManager.cleanupOldData();
}
