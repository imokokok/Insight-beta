/**
 * Band Sync Module (Refactored)
 *
 * 使用 BaseSyncManager 重构的 Band Protocol 同步模块
 * 代码量从 222 行减少到 ~80 行
 */

import type { BandClient } from '@/lib/blockchain/bandOracle';
import { createBandClient } from '@/lib/blockchain/bandOracle';
import type { SupportedChain, UnifiedPriceFeed } from '@/lib/types/unifiedOracleTypes';
import { BaseSyncManager, type IOracleClient, type SyncConfig } from './BaseSyncManager';

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
// Band Sync Manager
// ============================================================================

export class BandSyncManager extends BaseSyncManager {
  protected readonly protocol = 'band' as const;

  // Band 使用较长的同步间隔（5分钟）
  protected syncConfig: SyncConfig = {
    defaultIntervalMs: 300000, // 5分钟
    batchSize: 50,
    maxConcurrency: 3,
    priceChangeThreshold: 0.002, // 0.2%
    dataRetentionDays: 90,
  };

  protected createClient(
    chain: SupportedChain,
    rpcUrl: string,
    protocolConfig?: Record<string, unknown>,
  ): IOracleClient {
    return new BandClientWrapper(chain, rpcUrl, protocolConfig);
  }

  protected getAvailableSymbols(_chain: SupportedChain): string[] {
    return BAND_SUPPORTED_SYMBOLS;
  }
}

// ============================================================================
// 单例导出
// ============================================================================

export const bandSyncManager = new BandSyncManager();

// ============================================================================
// 便捷函数
// ============================================================================

export async function startBandSync(instanceId: string): Promise<void> {
  return bandSyncManager.startSync(instanceId);
}

export function stopBandSync(instanceId: string): void {
  return bandSyncManager.stopSync(instanceId);
}

export function stopAllBandSync(): void {
  return bandSyncManager.stopAllSync();
}

export async function cleanupBandData(): Promise<void> {
  return bandSyncManager.cleanupOldData();
}
