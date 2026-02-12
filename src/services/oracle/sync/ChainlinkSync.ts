/**
 * Chainlink Sync Module (Refactored with SyncManagerFactory)
 *
 * 使用 SyncManagerFactory 重构的 Chainlink 同步模块
 * 代码量从 60 行减少到 ~20 行
 */

import {
  createChainlinkClient,
  getAvailableFeedsForChain,
} from '@/infrastructure/blockchain/chainlinkDataFeeds';
import { createSingletonSyncManager } from '@/lib/shared';

// ============================================================================
// 使用工厂创建 Chainlink 同步管理器
// ============================================================================

const chainlinkSync = createSingletonSyncManager(
  {
    protocol: 'chainlink',
    syncConfig: {
      defaultIntervalMs: 60000,
      batchSize: 100,
      maxConcurrency: 5,
    },
  },
  (chain, rpcUrl, protocolConfig) => createChainlinkClient(chain, rpcUrl, protocolConfig),
  (chain) => getAvailableFeedsForChain(chain),
);

// ============================================================================
// 导出便捷函数和管理器实例
// ============================================================================

export const chainlinkSyncManager = chainlinkSync.manager;

export const startChainlinkSync = chainlinkSync.startSync;
export const stopChainlinkSync = chainlinkSync.stopSync;
export const stopAllChainlinkSync = chainlinkSync.stopAllSync;
export const cleanupChainlinkData = chainlinkSync.cleanupData;

// 保持向后兼容的默认导出
const chainlinkSyncDefault = {
  startSync: startChainlinkSync,
  stopSync: stopChainlinkSync,
  stopAllSync: stopAllChainlinkSync,
  cleanupData: cleanupChainlinkData,
  manager: chainlinkSyncManager,
};

export default chainlinkSyncDefault;
