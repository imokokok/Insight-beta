/**
 * UMA Sync Module
 *
 * UMA 乐观预言机同步模块
 * 支持断言、争议、投票等事件的同步
 */

import { logger } from '@/lib/logger';
import {
  createUMAClient,
  getSupportedUMAChains,
  isChainSupportedByUMA,
} from '@/lib/blockchain/umaOracle';
import { BaseSyncManager, type IOracleClient } from './BaseSyncManager';
import type {
  SupportedChain,
  UnifiedPriceFeed,
} from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// UMA Client Wrapper - 适配 IOracleClient 接口
// ============================================================================

class UMAClientWrapper implements IOracleClient {
  private client: ReturnType<typeof createUMAClient>;

  constructor(chain: SupportedChain, rpcUrl: string, protocolConfig?: Record<string, unknown>) {
    this.client = createUMAClient(chain, rpcUrl, {
      timeoutMs: protocolConfig?.timeoutMs as number,
      stalenessThreshold: protocolConfig?.stalenessThreshold as number,
    });
  }

  async getBlockNumber(): Promise<bigint> {
    // UMA 使用 Optimistic Oracle，返回当前时间戳作为区块号替代
    return BigInt(Math.floor(Date.now() / 1000));
  }

  async getPriceForSymbol(assertionId: string): Promise<UnifiedPriceFeed | null> {
    try {
      const health = await this.client.checkFeedHealth(assertionId);
      
      if (!health.healthy) {
        return null;
      }

      // UMA 不直接提供价格，而是提供断言状态
      // 这里返回一个表示断言状态的 feed
      return {
        id: `uma-${this.client.chain}-${assertionId}`,
        instanceId: `uma-${this.client.chain}`,
        protocol: 'uma',
        chain: this.client.chain,
        symbol: assertionId,
        baseAsset: 'ASSERTION',
        quoteAsset: 'USD',
        price: health.activeDisputes > 0 ? 0 : 1, // 0 = 有争议, 1 = 正常
        priceRaw: BigInt(health.activeDisputes > 0 ? 0 : 1),
        decimals: 0,
        timestamp: health.lastUpdate.getTime(),
        confidence: health.healthy ? 1 : 0,
        sources: ['uma'],
        isStale: health.stalenessSeconds > 600,
        stalenessSeconds: health.stalenessSeconds,
      };
    } catch (error) {
      logger.error('Failed to get UMA assertion health', { error, assertionId });
      return null;
    }
  }

  /**
   * 获取断言健康状态
   */
  async checkAssertionHealth(assertionId: string) {
    return this.client.checkFeedHealth(assertionId);
  }

  /**
   * 检测活跃争议
   */
  async detectDisputes(fromBlock?: bigint, toBlock?: bigint) {
    return this.client.detectActiveDisputes(fromBlock, toBlock);
  }
}

// ============================================================================
// UMA 同步管理器
// ============================================================================

class UMASyncManager extends BaseSyncManager {
  protected readonly protocol = 'uma' as const;

  protected syncConfig = {
    defaultIntervalMs: 60000, // 1分钟
    batchSize: 50,
    maxConcurrency: 3,
    priceChangeThreshold: 0.1, // UMA 是二元状态，变化阈值设高
    dataRetentionDays: 90,
  };

  protected createClient(
    chain: SupportedChain,
    rpcUrl: string,
    protocolConfig?: Record<string, unknown>,
  ): IOracleClient {
    return new UMAClientWrapper(chain, rpcUrl, protocolConfig);
  }

  protected getAvailableSymbols(chain: SupportedChain): string[] {
    // UMA 的 symbols 实际上是断言 ID 列表
    // 实际实现中应该从数据库或配置中获取活跃的断言 ID
    if (!isChainSupportedByUMA(chain)) {
      return [];
    }
    return ['uma-assertion-1', 'uma-assertion-2']; // 占位符
  }

  /**
   * 同步 UMA 特定事件
   */
  async syncUMAEvents(instanceId: string): Promise<void> {
    const instance = await this.getInstanceConfig(instanceId);
    if (!instance) {
      logger.error(`UMA instance ${instanceId} not found`);
      return;
    }

    const client = new UMAClientWrapper(
      instance.chain,
      instance.config.rpcUrl,
      instance.config.protocolConfig,
    );

    try {
      // 检测活跃争议
      const disputes = await client.detectDisputes();
      
      logger.info(`UMA events synced for instance ${instanceId}`, {
        chain: instance.chain,
        totalDisputes: disputes.totalDisputes,
        pendingDisputes: disputes.pendingDisputes,
      });

      // 保存争议数据到数据库
      await this.saveDisputes(instanceId, disputes.disputes);
    } catch (error) {
      logger.error(`Failed to sync UMA events for instance ${instanceId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 保存争议数据到数据库
   */
  private async saveDisputes(
    instanceId: string,
    disputes: Array<{
      disputeId: string;
      assertionId: string;
      disputer: string;
      timestamp: number;
      status: string;
    }>,
  ): Promise<void> {
    // 实际实现中应该保存到数据库
    logger.debug(`Saving ${disputes.length} disputes for instance ${instanceId}`);
  }
}

// ============================================================================
// 单例实例和导出
// ============================================================================

const umaSyncManager = new UMASyncManager();

export { umaSyncManager, UMASyncManager, UMAClientWrapper };

// 便捷函数
export const startUMASync = (instanceId: string) => umaSyncManager.startSync(instanceId);
export const stopUMASync = (instanceId: string) => umaSyncManager.stopSync(instanceId);
export const stopAllUMASync = () => umaSyncManager.stopAllSync();
export const cleanupUMAData = () => umaSyncManager.cleanupOldData();
export const syncUMAEvents = (instanceId: string) => umaSyncManager.syncUMAEvents(instanceId);

// 默认导出
const umaSyncDefault = {
  startSync: startUMASync,
  stopSync: stopUMASync,
  stopAllSync: stopAllUMASync,
  cleanupData: cleanupUMAData,
  syncUMAEvents,
  manager: umaSyncManager,
};

export default umaSyncDefault;
