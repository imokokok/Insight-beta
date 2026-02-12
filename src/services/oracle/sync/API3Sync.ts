/**
 * API3 Sync Module (Refactored with SyncManagerFactory)
 *
 * 使用 SyncManagerFactory 重构的 API3 同步模块
 * 代码量从 65 行减少到 ~20 行
 */

import { createAPI3Client, getAvailableAPI3Dapis } from '@/lib/blockchain/api3Oracle';
import { createSingletonSyncManager } from '@/lib/shared';

// ============================================================================
// 使用工厂创建 API3 同步管理器
// ============================================================================

const api3Sync = createSingletonSyncManager(
  {
    protocol: 'api3',
    syncConfig: {
      defaultIntervalMs: 60000, // 1分钟
      batchSize: 50,
      maxConcurrency: 5,
      priceChangeThreshold: 0.001, // 0.1%
      dataRetentionDays: 90,
    },
  },
  (chain, rpcUrl, protocolConfig) => createAPI3Client(chain, rpcUrl, protocolConfig),
  (chain) => getAvailableAPI3Dapis(chain),
);

// ============================================================================
// 导出便捷函数和管理器实例
// ============================================================================

export const api3SyncManager = api3Sync.manager;

export const startAPI3Sync = api3Sync.startSync;
export const stopAPI3Sync = api3Sync.stopSync;
export const stopAllAPI3Sync = api3Sync.stopAllSync;
export const cleanupAPI3Data = api3Sync.cleanupData;

// 保持向后兼容的默认导出
const api3SyncDefault = {
  startSync: startAPI3Sync,
  stopSync: stopAPI3Sync,
  stopAllSync: stopAllAPI3Sync,
  cleanupData: cleanupAPI3Data,
  manager: api3SyncManager,
};

export default api3SyncDefault;
