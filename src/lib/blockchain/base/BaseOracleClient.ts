/**
 * BaseOracleClient - 预言机客户端抽象基类
 *
 * 统一所有预言机客户端的公共逻辑，减少重复代码
 */

import { createPublicClient, http, type Address, formatUnits, type Chain } from 'viem';
import { logger } from '@/lib/logger';
import { VIEM_CHAIN_MAP } from '../chainConfig';
import type {
  SupportedChain,
  OracleHealthStatus,
  BaseOracleConfig,
} from '@/lib/types/unifiedOracleTypes';
import type { PriceFeedCore, PriceFeedCoreArray, Nullable } from '@/lib/types/oracle';

// ============================================================================
// 抽象基类
// ============================================================================

export abstract class BaseOracleClient {
  protected publicClient: ReturnType<typeof createPublicClient>;
  protected chain: SupportedChain;
  protected config: BaseOracleConfig;

  constructor(chain: SupportedChain, rpcUrl: string, config: BaseOracleConfig = {}) {
    this.chain = chain;
    this.config = config;

    this.publicClient = createPublicClient({
      chain: VIEM_CHAIN_MAP[chain] as Chain,
      transport: http(rpcUrl, { timeout: config.timeout ?? 30000 }),
    }) as ReturnType<typeof createPublicClient>;
  }

  // ============================================================================
  // 抽象方法 - 子类必须实现
  // ============================================================================

  /**
   * 获取合约地址
   */
  protected abstract getContractAddress(): Address | undefined;

  /**
   * 获取资产的喂价标识符
   */
  protected abstract getFeedId(symbol: string): string | undefined;

  /**
   * 从合约获取原始价格数据
   */
  protected abstract fetchRawPrice(feedId: string): Promise<{
    price: bigint;
    timestamp: number;
    decimals: number;
    confidence?: number;
  } | null>;

  /**
   * 获取协议名称
   */
  public abstract getProtocolName(): string;

  /**
   * 获取支持的资产列表
   */
  public abstract getSupportedSymbols(): string[];

  // ============================================================================
  // 公共方法 - 共享实现
  // ============================================================================

  /**
   * 获取单个资产的价格
   */
  public async getPriceForSymbol(symbol: string): Promise<Nullable<PriceFeedCore>> {
    try {
      const contractAddress = this.getContractAddress();
      if (!contractAddress) {
        logger.warn(`${this.getProtocolName()} not supported on chain ${this.chain}`);
        return null;
      }

      const feedId = this.getFeedId(symbol);
      if (!feedId) {
        logger.warn(`Symbol ${symbol} not supported by ${this.getProtocolName()}`);
        return null;
      }

      const rawPrice = await this.fetchRawPrice(feedId);
      if (!rawPrice) {
        return null;
      }

      return this.formatPriceFeed(symbol, rawPrice, contractAddress);
    } catch (error) {
      logger.error(`Failed to get price from ${this.getProtocolName()}`, {
        symbol,
        chain: this.chain,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * 批量获取多个资产的价格
   */
  public async getMultiplePrices(symbols: string[]): Promise<PriceFeedCoreArray> {
    const results = await Promise.allSettled(
      symbols.map((symbol) => this.getPriceForSymbol(symbol)),
    );
    return results
      .filter(
        (result): result is PromiseFulfilledResult<PriceFeedCore> =>
          result.status === 'fulfilled' && result.value !== null,
      )
      .map((result) => result.value);
  }

  /**
   * 检查喂价健康状态
   */
  public async checkFeedHealth(symbol: string): Promise<OracleHealthStatus> {
    try {
      const feed = await this.getPriceForSymbol(symbol);
      if (!feed) {
        return {
          healthy: false,
          reason: 'Feed not found',
          lastUpdate: 0,
        };
      }

      const now = Math.floor(Date.now() / 1000);
      const stalenessThreshold = this.config.stalenessThreshold ?? 3600; // 默认1小时
      const feedTimestamp =
        typeof feed.timestamp === 'string' ? parseInt(feed.timestamp, 10) : feed.timestamp;
      const isStale = now - feedTimestamp > stalenessThreshold;

      if (isStale) {
        return {
          healthy: false,
          reason: `Stale data (last update ${now - feedTimestamp}s ago)`,
          lastUpdate: feedTimestamp,
        };
      }

      return {
        healthy: true,
        lastUpdate: feedTimestamp,
      };
    } catch (error) {
      return {
        healthy: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
        lastUpdate: 0,
      };
    }
  }

  /**
   * 获取所有可用喂价
   */
  public async getAllAvailableFeeds(): Promise<PriceFeedCoreArray> {
    const symbols = this.getSupportedSymbols();
    return this.getMultiplePrices(symbols);
  }

  // ============================================================================
  // 受保护方法 - 辅助函数
  // ============================================================================

  /**
   * 格式化价格数据为统一格式
   */
  protected formatPriceFeed(
    symbol: string,
    rawPrice: {
      price: bigint;
      timestamp: number;
      decimals: number;
      confidence?: number;
    },
    _contractAddress: Address,
  ): PriceFeedCore {
    return {
      symbol,
      price: Number(formatUnits(rawPrice.price, rawPrice.decimals)),
      timestamp: Number(rawPrice.timestamp),
      confidence: rawPrice.confidence ?? 1,
      sources: [this.getProtocolName()],
      chain: this.chain,
    };
  }

  /**
   * 检查链是否支持
   */
  public isChainSupported(): boolean {
    return this.getContractAddress() !== undefined;
  }
}

// ============================================================================
// 工厂函数类型
// ============================================================================

export type OracleClientConstructor = new (
  chain: SupportedChain,
  rpcUrl: string,
  config?: BaseOracleConfig,
) => BaseOracleClient;

// ============================================================================
// 工具函数
// ============================================================================

export function isChainSupportedByOracle(
  chain: SupportedChain,
  getContractAddress: (chain: SupportedChain) => Address | undefined,
): boolean {
  return getContractAddress(chain) !== undefined;
}
