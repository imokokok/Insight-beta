/**
 * DIA Sync Module (Refactored with SyncManagerFactory)
 *
 * 使用 SyncManagerFactory 重构的 DIA 同步模块
 * 代码量从 65 行减少到 ~20 行
 */

import { createDIAClient, getAvailableDIASymbols } from '@/infrastructure/blockchain/diaOracle';
import { createSingletonSyncManager } from '@/lib/shared';

// ============================================================================
// 使用工厂创建 DIA 同步管理器
// ============================================================================

const diaSync = createSingletonSyncManager(
  {
    protocol: 'dia',
    syncConfig: {
      defaultIntervalMs: 600000, // 10分钟
      batchSize: 50,
      maxConcurrency: 3,
      priceChangeThreshold: 0.005, // 0.5%
      dataRetentionDays: 90,
    },
  },
  (chain, rpcUrl, protocolConfig) => createDIAClient(chain, rpcUrl, protocolConfig),
  (chain) => getAvailableDIASymbols(chain),
);

// ============================================================================
// 导出便捷函数和管理器实例
// ============================================================================

export const diaSyncManager = diaSync.manager;

export const startDIASync = diaSync.startSync;
export const stopDIASync = diaSync.stopSync;
export const stopAllDIASync = diaSync.stopAllSync;
export const cleanupDIAData = diaSync.cleanupData;

// 保持向后兼容的默认导出
const diaSyncDefault = {
  startSync: startDIASync,
  stopSync: stopDIASync,
  stopAllSync: stopAllDIASync,
  cleanupData: cleanupDIAData,
  manager: diaSyncManager,
};

export default diaSyncDefault;
