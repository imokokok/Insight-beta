/**
 * Oracle Sync Modules - 统一导出
 *
 * 所有预言机同步模块的集中导出
 * 提供统一的工厂函数和管理接口
 */

// ============================================================================
// 类型导入
// ============================================================================

import { logger } from '@/lib/logger';
import type { OracleProtocol } from '@/lib/types/unifiedOracleTypes';

import type { api3SyncManager as _api3SyncManager } from './API3Sync';
import type { bandSyncManager as _bandSyncManager } from './BandSync';
import type { BaseSyncManager } from './BaseSyncManager';
import type { chainlinkSyncManager as _chainlinkSyncManager } from './ChainlinkSync';
import type { diaSyncManager as _diaSyncManager } from './DIASync';
import type { fluxSyncManager as _fluxSyncManager } from './FluxSync';
import type { pythSyncManager as _pythSyncManager } from './PythSync';
import type { redstoneSyncManager as _redstoneSyncManager } from './RedStoneSync';

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
  chainlinkSyncManager,
  startChainlinkSync,
  stopChainlinkSync,
  stopAllChainlinkSync,
  cleanupChainlinkData,
} from './ChainlinkSync';

export type ChainlinkSyncManager = typeof _chainlinkSyncManager;

export {
  pythSyncManager,
  startPythSync,
  stopPythSync,
  stopAllPythSync,
  cleanupPythData,
} from './PythSync';

export type PythSyncManager = typeof _pythSyncManager;

export {
  bandSyncManager,
  startBandSync,
  stopBandSync,
  stopAllBandSync,
  cleanupBandData,
} from './BandSync';

export type BandSyncManager = typeof _bandSyncManager;

export {
  diaSyncManager,
  startDIASync,
  stopDIASync,
  stopAllDIASync,
  cleanupDIAData,
} from './DIASync';

export type DIASyncManager = typeof _diaSyncManager;

export {
  api3SyncManager,
  startAPI3Sync,
  stopAPI3Sync,
  stopAllAPI3Sync,
  cleanupAPI3Data,
} from './API3Sync';

export type API3SyncManager = typeof _api3SyncManager;

export {
  redstoneSyncManager,
  startRedStoneSync,
  stopRedStoneSync,
  stopAllRedStoneSync,
  cleanupRedStoneData,
} from './RedStoneSync';

export type RedStoneSyncManager = typeof _redstoneSyncManager;

export {
  fluxSyncManager,
  startFluxSync,
  stopFluxSync,
  stopAllFluxSync,
  cleanupFluxData,
} from './FluxSync';

export type FluxSyncManager = typeof _fluxSyncManager;

// ============================================================================
// Sync Manager 工厂
// ============================================================================

const syncManagers: Map<OracleProtocol, BaseSyncManager> = new Map();

/**
 * 获取指定协议的同步管理器
 */
export async function getSyncManager(protocol: OracleProtocol): Promise<BaseSyncManager> {
  if (!syncManagers.has(protocol)) {
    // 动态导入避免循环依赖
    switch (protocol) {
      case 'chainlink': {
        const { chainlinkSyncManager } = await import('./ChainlinkSync');
        syncManagers.set(protocol, chainlinkSyncManager);
        break;
      }
      case 'pyth': {
        const { pythSyncManager } = await import('./PythSync');
        syncManagers.set(protocol, pythSyncManager);
        break;
      }
      case 'band': {
        const { bandSyncManager } = await import('./BandSync');
        syncManagers.set(protocol, bandSyncManager);
        break;
      }
      case 'dia': {
        const { diaSyncManager } = await import('./DIASync');
        syncManagers.set(protocol, diaSyncManager);
        break;
      }
      case 'api3': {
        const { api3SyncManager } = await import('./API3Sync');
        syncManagers.set(protocol, api3SyncManager);
        break;
      }
      case 'redstone': {
        const { redstoneSyncManager } = await import('./RedStoneSync');
        syncManagers.set(protocol, redstoneSyncManager);
        break;
      }
      case 'flux': {
        const { fluxSyncManager } = await import('./FluxSync');
        syncManagers.set(protocol, fluxSyncManager);
        break;
      }
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
  const manager = await getSyncManager(protocol);
  await manager.startSync(instanceId);
  logger.info(`Started ${protocol} sync for instance: ${instanceId}`);
}

/**
 * 停止指定协议的同步
 */
export async function stopProtocolSync(
  protocol: OracleProtocol,
  instanceId: string,
): Promise<void> {
  const manager = await getSyncManager(protocol);
  manager.stopSync(instanceId);
  logger.info(`Stopped ${protocol} sync for instance: ${instanceId}`);
}

/**
 * 停止所有协议的同步
 */
export async function stopAllProtocolSync(): Promise<void> {
  for (const [protocol, manager] of syncManagers.entries()) {
    manager.stopAllSync();
    logger.info(`Stopped all ${protocol} sync instances`);
  }
}

/**
 * 清理指定协议的数据
 */
export async function cleanupProtocolData(protocol: OracleProtocol): Promise<void> {
  const manager = await getSyncManager(protocol);
  await manager.cleanupOldData();
  logger.info(`Cleaned up ${protocol} old data`);
}

type SyncStatus = 'running' | 'stopped' | 'error';

interface SyncManagerStatus {
  protocol: OracleProtocol;
  status: SyncStatus;
  instances: string[];
}

/**
 * 获取所有同步管理器状态
 */
export async function getAllSyncManagerStatus(): Promise<SyncManagerStatus[]> {
  const protocols: OracleProtocol[] = [
    'chainlink',
    'pyth',
    'band',
    'dia',
    'api3',
    'redstone',
    'flux',
  ];
  const results: SyncManagerStatus[] = [];

  for (const protocol of protocols) {
    try {
      const manager = await getSyncManager(protocol);
      // 从 syncIntervals 获取实例列表
      const instances = Array.from(
        (manager as unknown as { syncIntervals: Map<string, unknown> }).syncIntervals.keys(),
      );
      const isRunning = instances.length > 0;
      results.push({
        protocol,
        status: isRunning ? 'running' : 'stopped',
        instances,
      });
    } catch {
      // 协议未初始化，跳过
    }
  }

  return results;
}
