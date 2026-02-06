/**
 * Oracle Sync Modules - 统一导出
 *
 * 所有预言机同步模块的集中导出
 * 提供统一的工厂函数和管理接口
 */

// ============================================================================
// 导出基类和类型
// ============================================================================

export {
  BaseSyncManager,
  DEFAULT_SYNC_CONFIG,
  type SyncConfig,
  type IOracleClient,
  type InstanceConfig,
} from './BaseSyncManager';

// ============================================================================
// 导出具体实现
// ============================================================================

export {
  ChainlinkSyncManager,
  chainlinkSyncManager,
  startChainlinkSync,
  stopChainlinkSync,
  stopAllChainlinkSync,
  cleanupChainlinkData,
} from './ChainlinkSync';

export {
  PythSyncManager,
  pythSyncManager,
  startPythSync,
  stopPythSync,
  stopAllPythSync,
  cleanupPythData,
} from './PythSync';

export {
  BandSyncManager,
  bandSyncManager,
  startBandSync,
  stopBandSync,
  stopAllBandSync,
  cleanupBandData,
} from './BandSync';

export {
  DIASyncManager,
  diaSyncManager,
  startDIASync,
  stopDIASync,
  stopAllDIASync,
  cleanupDIAData,
} from './DIASync';

export {
  API3SyncManager,
  api3SyncManager,
  startAPI3Sync,
  stopAPI3Sync,
  stopAllAPI3Sync,
  cleanupAPI3Data,
} from './API3Sync';

export {
  RedStoneSyncManager,
  redstoneSyncManager,
  startRedStoneSync,
  stopRedStoneSync,
  stopAllRedStoneSync,
  cleanupRedStoneData,
} from './RedStoneSync';

import { logger } from '@/lib/logger';

// ============================================================================
// 协议类型
// ============================================================================

import type { OracleProtocol } from '@/lib/types/unifiedOracleTypes';
import { ChainlinkSyncManager } from './ChainlinkSync';
import { PythSyncManager } from './PythSync';
import { BandSyncManager } from './BandSync';
import { DIASyncManager } from './DIASync';
import { API3SyncManager } from './API3Sync';
import { RedStoneSyncManager } from './RedStoneSync';
import type { BaseSyncManager } from './BaseSyncManager';

// ============================================================================
// Sync Manager 工厂
// ============================================================================

const syncManagers: Map<OracleProtocol, BaseSyncManager> = new Map();

/**
 * 获取指定协议的同步管理器
 */
export function getSyncManager(protocol: OracleProtocol): BaseSyncManager {
  if (!syncManagers.has(protocol)) {
    switch (protocol) {
      case 'chainlink':
        syncManagers.set(protocol, new ChainlinkSyncManager());
        break;
      case 'pyth':
        syncManagers.set(protocol, new PythSyncManager());
        break;
      case 'band':
        syncManagers.set(protocol, new BandSyncManager());
        break;
      case 'dia':
        syncManagers.set(protocol, new DIASyncManager());
        break;
      case 'api3':
        syncManagers.set(protocol, new API3SyncManager());
        break;
      case 'redstone':
        syncManagers.set(protocol, new RedStoneSyncManager());
        break;
      default:
        throw new Error(`Unsupported protocol: ${protocol}`);
    }
  }

  const manager = syncManagers.get(protocol);
  if (!manager) {
    throw new Error(`Failed to create sync manager for protocol: ${protocol}`);
  }

  return manager;
}

/**
 * 启动指定协议的同步
 */
export async function startProtocolSync(
  protocol: OracleProtocol,
  instanceId: string,
): Promise<void> {
  const manager = getSyncManager(protocol);
  await manager.startSync(instanceId);
}

/**
 * 停止指定协议的同步
 */
export function stopProtocolSync(protocol: OracleProtocol, instanceId: string): void {
  const manager = getSyncManager(protocol);
  manager.stopSync(instanceId);
}

/**
 * 停止所有协议的同步
 */
export function stopAllProtocolSync(): void {
  for (const [protocol, manager] of syncManagers.entries()) {
    manager.stopAllSync();
    logger.info(`Stopped all ${protocol} syncs`);
  }
}

/**
 * 清理指定协议的过期数据
 */
export async function cleanupProtocolData(protocol: OracleProtocol): Promise<void> {
  const manager = getSyncManager(protocol);
  await manager.cleanupOldData();
}

// ============================================================================
// 统一清理函数
// ============================================================================

/**
 * 清理所有协议的过期数据
 */
export async function cleanupAllOldData(): Promise<{
  chainlink: { deletedFeeds: number; deletedUpdates: number };
  pyth: { deletedFeeds: number; deletedUpdates: number };
  band: { deletedFeeds: number; deletedUpdates: number };
  dia: { deletedFeeds: number; deletedUpdates: number };
  api3: { deletedFeeds: number; deletedUpdates: number };
  redstone: { deletedFeeds: number; deletedUpdates: number };
}> {
  const results = {
    chainlink: { deletedFeeds: 0, deletedUpdates: 0 },
    pyth: { deletedFeeds: 0, deletedUpdates: 0 },
    band: { deletedFeeds: 0, deletedUpdates: 0 },
    dia: { deletedFeeds: 0, deletedUpdates: 0 },
    api3: { deletedFeeds: 0, deletedUpdates: 0 },
    redstone: { deletedFeeds: 0, deletedUpdates: 0 },
  };

  // 并行清理所有协议
  await Promise.all([
    getSyncManager('chainlink')
      .cleanupOldData()
      .then(() => {
        logger.info('Chainlink data cleanup completed');
      }),
    getSyncManager('pyth')
      .cleanupOldData()
      .then(() => {
        logger.info('Pyth data cleanup completed');
      }),
    getSyncManager('band')
      .cleanupOldData()
      .then(() => {
        logger.info('Band data cleanup completed');
      }),
    getSyncManager('dia')
      .cleanupOldData()
      .then(() => {
        logger.info('DIA data cleanup completed');
      }),
    getSyncManager('api3')
      .cleanupOldData()
      .then(() => {
        logger.info('API3 data cleanup completed');
      }),
    getSyncManager('redstone')
      .cleanupOldData()
      .then(() => {
        logger.info('RedStone data cleanup completed');
      }),
  ]);

  return results;
}

// ============================================================================
// 健康检查
// ============================================================================

/**
 * 获取所有同步管理器的健康状态
 */
export function getAllSyncHealth(): Array<{
  protocol: OracleProtocol;
  status: 'healthy' | 'error';
  runningInstances: number;
}> {
  return Array.from(syncManagers.entries()).map(([protocol]) => ({
    protocol,
    status: 'healthy', // 简化版本，实际应查询数据库
    runningInstances: 0, // 简化版本
  }));
}

// ============================================================================
// 支持的协议列表
// ============================================================================

export const SUPPORTED_SYNC_PROTOCOLS: OracleProtocol[] = [
  'chainlink',
  'pyth',
  'band',
  'dia',
  'api3',
  'redstone',
];

/**
 * 检查协议是否支持同步
 */
export function isProtocolSupported(protocol: OracleProtocol): boolean {
  return SUPPORTED_SYNC_PROTOCOLS.includes(protocol);
}
