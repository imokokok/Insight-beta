/**
 * Switchboard Sync Module (Refactored with SyncManagerFactory)
 *
 * 使用 SyncManagerFactory 重构的 Switchboard 同步模块
 * 代码简洁，支持 Solana 链的价格同步
 */

import {
  createSwitchboardClient,
  getAvailableSwitchboardSymbols,
} from '@/lib/blockchain/switchboardOracle';
import { createSingletonSyncManager } from '@/lib/shared';

// ============================================================================
// 使用工厂创建 Switchboard 同步管理器
// ============================================================================

const switchboardSync = createSingletonSyncManager(
  {
    protocol: 'switchboard',
    syncConfig: {
      defaultIntervalMs: 30000, // 30秒
      batchSize: 50,
      maxConcurrency: 3,
      priceChangeThreshold: 0.001, // 0.1%
      dataRetentionDays: 90,
    },
  },
  (chain, rpcUrl, protocolConfig) => createSwitchboardClient(chain, rpcUrl, protocolConfig),
  // Switchboard 的 symbols 主要支持 Solana 链
  (chain) => {
    if (chain === 'solana') {
      return getAvailableSwitchboardSymbols();
    }
    return [];
  },
);

// ============================================================================
// 导出便捷函数和管理器实例
// ============================================================================

export const switchboardSyncManager = switchboardSync.manager;

export const startSwitchboardSync = switchboardSync.startSync;
export const stopSwitchboardSync = switchboardSync.stopSync;
export const stopAllSwitchboardSync = switchboardSync.stopAllSync;
export const cleanupSwitchboardData = switchboardSync.cleanupData;

// 保持向后兼容的默认导出
const switchboardSyncDefault = {
  startSync: startSwitchboardSync,
  stopSync: stopSwitchboardSync,
  stopAllSync: stopAllSwitchboardSync,
  cleanupData: cleanupSwitchboardData,
  manager: switchboardSyncManager,
};

export default switchboardSyncDefault;
