/**
 * Band Sync Module (Refactored with SyncManagerFactory)
 *
 * 使用 SyncManagerFactory 重构的 Band Protocol 同步模块
 * 代码量从 120 行减少到 ~35 行
 */

import type { BandClient } from '@/lib/blockchain/bandOracle';
import { createBandClient } from '@/lib/blockchain/bandOracle';
import { createSingletonSyncManager } from '@/lib/shared';
import type { SupportedChain, UnifiedPriceFeed } from '@/lib/types/unifiedOracleTypes';

import type { IOracleClient } from './BaseSyncManager';

// ============================================================================
// Band 支持的 Symbols
// ============================================================================

const BAND_SUPPORTED_SYMBOLS = [
  'BTC/USD',
  'ETH/USD',
  'BNB/USD',
  'XRP/USD',
  'ADA/USD',
  'SOL/USD',
  'DOT/USD',
  'DOGE/USD',
  'AVAX/USD',
  'MATIC/USD',
  'LINK/USD',
  'UNI/USD',
  'LTC/USD',
  'BCH/USD',
  'ALGO/USD',
];

// ============================================================================
// Band Client Wrapper - 适配 IOracleClient 接口
// ============================================================================

class BandClientWrapper implements IOracleClient {
  private client: BandClient;

  constructor(chain: SupportedChain, rpcUrl: string, protocolConfig?: Record<string, unknown>) {
    this.client = createBandClient({
      chain,
      rpcUrl,
      bandEndpoint: protocolConfig?.bandEndpoint as string,
      minCount: protocolConfig?.minCount as number,
      askCount: protocolConfig?.askCount as number,
    });
  }

  async getBlockNumber(): Promise<bigint> {
    // Band 使用自己的区块高度系统，返回当前时间戳作为替代
    return BigInt(Math.floor(Date.now() / 1000));
  }

  async getPriceForSymbol(symbol: string): Promise<UnifiedPriceFeed | null> {
    try {
      return await this.client.getPrice(symbol);
    } catch {
      return null;
    }
  }
}

// ============================================================================
// 使用工厂创建 Band 同步管理器
// ============================================================================

const bandSync = createSingletonSyncManager(
  {
    protocol: 'band',
    syncConfig: {
      defaultIntervalMs: 300000, // 5分钟
      batchSize: 50,
      maxConcurrency: 3,
      priceChangeThreshold: 0.002, // 0.2%
      dataRetentionDays: 90,
    },
  },
  (chain, rpcUrl, protocolConfig) => new BandClientWrapper(chain, rpcUrl, protocolConfig),
  () => BAND_SUPPORTED_SYMBOLS,
);

// ============================================================================
// 导出便捷函数和管理器实例
// ============================================================================

export const bandSyncManager = bandSync.manager;

export const startBandSync = bandSync.startSync;
export const stopBandSync = bandSync.stopSync;
export const stopAllBandSync = bandSync.stopAllSync;
export const cleanupBandData = bandSync.cleanupData;

// 保持向后兼容的默认导出
const bandSyncDefault = {
  startSync: startBandSync,
  stopSync: stopBandSync,
  stopAllSync: stopAllBandSync,
  cleanupData: cleanupBandData,
  manager: bandSyncManager,
};

export default bandSyncDefault;
