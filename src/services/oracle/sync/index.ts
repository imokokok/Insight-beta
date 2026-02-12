/**
 * Oracle Sync Modules - 统一导出
 *
 * 所有预言机同步模块的集中导出
 * 提供统一的工厂函数和管理接口
 */

// ============================================================================
// 类型导入
// ============================================================================

import type { OracleProtocol } from '@/types/unifiedOracleTypes';

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

export {
  pythSyncManager,
  startPythSync,
  stopPythSync,
  stopAllPythSync,
  cleanupPythData,
} from './PythSync';

export {
  bandSyncManager,
  startBandSync,
  stopBandSync,
  stopAllBandSync,
  cleanupBandData,
} from './BandSync';

export {
  diaSyncManager,
  startDIASync,
  stopDIASync,
  stopAllDIASync,
  cleanupDIAData,
} from './DIASync';

export {
  api3SyncManager,
  startAPI3Sync,
  stopAPI3Sync,
  stopAllAPI3Sync,
  cleanupAPI3Data,
} from './API3Sync';

export {
  redstoneSyncManager,
  startRedStoneSync,
  stopRedStoneSync,
  stopAllRedStoneSync,
  cleanupRedStoneData,
} from './RedStoneSync';

// Flux Sync
export {
  fluxSyncManager,
  startFluxSync,
  stopFluxSync,
  stopAllFluxSync,
  cleanupFluxData,
} from './FluxSync';

// Switchboard Sync
export {
  switchboardSyncManager,
  startSwitchboardSync,
  stopSwitchboardSync,
  stopAllSwitchboardSync,
  cleanupSwitchboardData,
} from './SwitchboardSync';

// UMA Sync
export {
  umaSyncManager,
  startUMASync,
  stopUMASync,
  stopAllUMASync,
  cleanupUMAData,
  syncUMAEvents,
} from './UMASync';

// ============================================================================
// Sync Manager 工厂
// ============================================================================

const syncManagers: Map<OracleProtocol, import('./BaseSyncManager').BaseSyncManager> = new Map();

/**
 * 获取指定协议的同步管理器
 */
export async function getSyncManager(
  protocol: OracleProtocol,
): Promise<import('./BaseSyncManager').BaseSyncManager> {
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
      case 'switchboard': {
        const { switchboardSyncManager } = await import('./SwitchboardSync');
        syncManagers.set(protocol, switchboardSyncManager);
        break;
      }
      case 'uma': {
        const { umaSyncManager } = await import('./UMASync');
        syncManagers.set(protocol, umaSyncManager);
        break;
      }
      default:
        throw new Error(`Unsupported protocol: ${protocol}`);
    }
  }

  const manager = syncManagers.get(protocol);
  if (!manager) {
    throw new Error(`Failed to create sync manager for: ${protocol}`);
  }

  return manager;
}
