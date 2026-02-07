/**
 * Pyth Sync Module (Refactored with SyncManagerFactory)
 *
 * 使用 SyncManagerFactory 重构的 Pyth 同步模块
 * 代码量从 70 行减少到 ~25 行
 * 支持更频繁的同步间隔（30秒）
 */

import { createPythClient, getAvailablePythSymbols } from '@/lib/blockchain/pythOracle';
import { createSingletonSyncManager } from '@/lib/shared';

// ============================================================================
// 使用工厂创建 Pyth 同步管理器
// ============================================================================

const pythSync = createSingletonSyncManager(
  {
    protocol: 'pyth',
    syncConfig: {
      defaultIntervalMs: 30000, // 30秒
      batchSize: 100,
      maxConcurrency: 5,
      priceChangeThreshold: 0.0005, // 0.05%
      dataRetentionDays: 90,
    },
  },
  (chain, rpcUrl, protocolConfig) => createPythClient(chain, rpcUrl, protocolConfig),
  // Pyth 的 symbols 是全局的，不依赖于特定链
  () => getAvailablePythSymbols()
);

// ============================================================================
// 导出便捷函数和管理器实例
// ============================================================================

export const pythSyncManager = pythSync.manager;

export const startPythSync = pythSync.startSync;
export const stopPythSync = pythSync.stopSync;
export const stopAllPythSync = pythSync.stopAllSync;
export const cleanupPythData = pythSync.cleanupData;

// 保持向后兼容的默认导出
export default {
  startSync: startPythSync,
  stopSync: stopPythSync,
  stopAllSync: stopAllPythSync,
  cleanupData: cleanupPythData,
  manager: pythSyncManager,
};
