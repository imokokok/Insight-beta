/**
 * RedStone Sync Module (Refactored with SyncManagerFactory)
 *
 * 使用 SyncManagerFactory 重构的 RedStone 同步模块
 * 代码量从 65 行减少到 ~20 行
 */

import { createRedStoneClient, getAvailableRedStoneSymbols } from '@/lib/blockchain/redstoneOracle';
import { createSingletonSyncManager } from '@/lib/shared';

// ============================================================================
// 使用工厂创建 RedStone 同步管理器
// ============================================================================

const redstoneSync = createSingletonSyncManager(
  {
    protocol: 'redstone',
    syncConfig: {
      defaultIntervalMs: 30000, // 30秒
      batchSize: 50,
      maxConcurrency: 5,
      priceChangeThreshold: 0.0005, // 0.05%
      dataRetentionDays: 90,
    },
  },
  (chain, rpcUrl, protocolConfig) => createRedStoneClient(chain, rpcUrl, protocolConfig),
  (chain) => getAvailableRedStoneSymbols(chain),
);

// ============================================================================
// 导出便捷函数和管理器实例
// ============================================================================

export const redstoneSyncManager = redstoneSync.manager;

export const startRedStoneSync = redstoneSync.startSync;
export const stopRedStoneSync = redstoneSync.stopSync;
export const stopAllRedStoneSync = redstoneSync.stopAllSync;
export const cleanupRedStoneData = redstoneSync.cleanupData;

// 保持向后兼容的默认导出
const redstoneSyncDefault = {
  startSync: startRedStoneSync,
  stopSync: stopRedStoneSync,
  stopAllSync: stopAllRedStoneSync,
  cleanupData: cleanupRedStoneData,
  manager: redstoneSyncManager,
};

export default redstoneSyncDefault;
