/**
 * Flux Sync Module (Refactored with SyncManagerFactory)
 *
 * 使用 SyncManagerFactory 重构的 Flux 同步模块
 * 代码量从 60 行减少到 ~20 行
 */

import { createFluxClient, getSupportedFluxSymbols } from '@/lib/blockchain/protocols/flux';
import { createSingletonSyncManager } from '@/lib/shared';

// ============================================================================
// 使用工厂创建 Flux 同步管理器
// ============================================================================

const fluxSync = createSingletonSyncManager(
  {
    protocol: 'flux',
    syncConfig: {
      defaultIntervalMs: 60000, // 1分钟
      batchSize: 50,
      maxConcurrency: 5,
      priceChangeThreshold: 0.001, // 0.1%
      dataRetentionDays: 90,
    },
  },
  (chain, rpcUrl, protocolConfig) =>
    createFluxClient(chain, {
      rpcUrl,
      ...protocolConfig,
    }) as unknown as ReturnType<Parameters<typeof createSingletonSyncManager>[1]>,
  (chain) => getSupportedFluxSymbols(chain),
);

// ============================================================================
// 导出便捷函数和管理器实例
// ============================================================================

export const fluxSyncManager = fluxSync.manager;

export const startFluxSync = fluxSync.startSync;
export const stopFluxSync = fluxSync.stopSync;
export const stopAllFluxSync = fluxSync.stopAllSync;
export const cleanupFluxData = fluxSync.cleanupData;

// 保持向后兼容的默认导出
const fluxSyncDefault = {
  startSync: startFluxSync,
  stopSync: stopFluxSync,
  stopAllSync: stopAllFluxSync,
  cleanupData: cleanupFluxData,
  manager: fluxSyncManager,
};

export default fluxSyncDefault;
