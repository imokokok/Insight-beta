/**
 * Pyth Network Oracle Integration (Refactored with EvmOracleClient)
 *
 * 使用 EvmOracleClient 基类重构的 Pyth 预言机集成模块
 * 代码量从 468 行减少到 ~220 行
 */

import { type Address, parseAbi, formatUnits } from 'viem';

import { DEFAULT_STALENESS_THRESHOLDS } from '@/lib/config/constants';
import {
  PYTH_PRICE_FEED_IDS,
  getPriceFeedId as getPythPriceFeedId,
  getAvailablePythSymbols as getPythAvailableSymbols,
} from '@/lib/config/pythPriceFeeds';
import { ErrorHandler, normalizeError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { EvmOracleClient } from '@/lib/shared';
import type {
  SupportedChain,
  UnifiedPriceFeed,
  PythProtocolConfig,
} from '@/lib/types/unifiedOracleTypes';

// 重新导出以保持向后兼容
export { PYTH_PRICE_FEED_IDS };

// ============================================================================
// Pyth ABI
// ============================================================================

const PYTH_ABI = parseAbi([
  'function getPrice(bytes32 id) external view returns (int64 price, uint64 conf, int32 expo, uint publishTime)',
  'function getEmaPrice(bytes32 id) external view returns (int64 price, uint64 conf, int32 expo, uint publishTime)',
  'function getPriceUnsafe(bytes32 id) external view returns (int64 price, uint64 conf, int32 expo, uint publishTime)',
  'function getPriceNoOlderThan(bytes32 id, uint age) external view returns (int64 price, uint64 conf, int32 expo, uint publishTime)',
]);

// ============================================================================
// Pyth 合约地址配置
// ============================================================================

export const PYTH_CONTRACT_ADDRESSES: Record<SupportedChain, Address | undefined> = {
  ethereum: '0x4305FB66699C3B2702D4d05CF36551390A4c69C6',
  polygon: '0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a',
  arbitrum: '0xff1a0f4744e8582DF1aE09D5611b887B6a12925C',
  optimism: '0xff1a0f4744e8582DF1aE09D5611b887B6a12925C',
  base: '0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a',
  avalanche: '0x4305FB66699C3B2702D4d05CF36551390A4c69C6',
  bsc: '0x4D7E825f80bDf85e913E0DD2A2D54927e9dE1594',
  // 其他链暂不支持
  fantom: undefined,
  celo: undefined,
  gnosis: undefined,
  linea: undefined,
  scroll: undefined,
  mantle: undefined,
  mode: undefined,
  blast: undefined,
  solana: undefined,
  near: undefined,
  aptos: undefined,
  sui: undefined,
  polygonAmoy: undefined,
  sepolia: '0xDd24F84d36BF92C65F92307595335bdFab5Bbd21',
  goerli: undefined,
  mumbai: undefined,
  local: undefined,
};

// ============================================================================
// Pyth Client (使用 EvmOracleClient 基类)
// ============================================================================

export class PythClient extends EvmOracleClient {
  readonly protocol = 'pyth' as const;
  readonly chain: SupportedChain;

  private clientConfig: PythProtocolConfig;

  constructor(chain: SupportedChain, rpcUrl: string, config: PythProtocolConfig = {}) {
    super({
      chain,
      protocol: 'pyth',
      rpcUrl,
      timeoutMs: (config as { timeoutMs?: number }).timeoutMs ?? 30000,
      defaultDecimals: 8,
    });

    this.chain = chain;
    this.clientConfig = config;
  }

  // ============================================================================
  // 实现抽象方法
  // ============================================================================

  protected resolveContractAddress(): Address | undefined {
    const address =
      (this.clientConfig as { pythContractAddress?: Address }).pythContractAddress ||
      PYTH_CONTRACT_ADDRESSES[this.chain];
    return address;
  }

  protected getFeedId(symbol: string): string | undefined {
    return PYTH_PRICE_FEED_IDS[symbol];
  }

  protected async fetchRawPriceData(feedId: string): Promise<{
    price: bigint;
    conf: bigint;
    expo: number;
    publishTime: bigint;
  }> {
    if (!this.contractAddress) {
      throw new Error('Contract address is not set');
    }
    try {
      const priceData = (await this.publicClient.readContract({
        address: this.contractAddress,
        abi: PYTH_ABI,
        functionName: 'getPrice',
        args: [feedId as `0x${string}`],
      })) as [bigint, bigint, number, bigint];

      return {
        price: priceData[0],
        conf: priceData[1],
        expo: priceData[2],
        publishTime: priceData[3],
      };
    } catch (error) {
      ErrorHandler.logError(this.logger, 'Failed to fetch Pyth price', error, {
        chain: this.chain,
        feedId,
      });
      throw error;
    }
  }

  /**
   * 获取客户端能力
   */
  getCapabilities() {
    return {
      priceFeeds: true,
      assertions: false,
      disputes: false,
      vrf: false,
      customData: true,
      batchQueries: true,
    };
  }

  protected parsePriceFromContract(
    rawData: {
      price: bigint;
      conf: bigint;
      expo: number;
      publishTime: bigint;
    },
    symbol: string,
    _feedId: string,
  ): UnifiedPriceFeed | null {
    const parts = symbol.split('/');
    const baseAsset = parts[0] || 'UNKNOWN';
    const quoteAsset = parts[1] || 'USD';

    // 格式化价格 (考虑指数)
    const formattedPrice = parseFloat(formatUnits(rawData.price, Math.abs(Number(rawData.expo))));
    const confidence = parseFloat(formatUnits(rawData.conf, Math.abs(Number(rawData.expo))));

    // 检查价格有效性，防止除零
    if (!Number.isFinite(formattedPrice) || formattedPrice <= 0) {
      logger.error('Invalid price from Pyth', { symbol, price: rawData.price, formattedPrice });
      return null;
    }

    const publishTime = new Date(Number(rawData.publishTime) * 1000);
    const stalenessSeconds = this.calculateStalenessSeconds(rawData.publishTime);

    // 判断数据是否过期
    const stalenessThreshold =
      (this.clientConfig as { stalenessThreshold?: number }).stalenessThreshold ||
      DEFAULT_STALENESS_THRESHOLDS.PYTH;
    const isStale = stalenessSeconds > stalenessThreshold;

    // 计算置信度百分比，确保除数不为零
    const confidencePercent = formattedPrice > 0 ? (confidence / formattedPrice) * 100 : 0;

    return {
      id: `pyth-${this.chain}-${symbol}-${rawData.publishTime.toString()}`,
      instanceId: `pyth-${this.chain}`,
      protocol: 'pyth',
      chain: this.chain,
      symbol,
      baseAsset: baseAsset || 'UNKNOWN',
      quoteAsset: quoteAsset || 'USD',
      price: formattedPrice,
      priceRaw: rawData.price,
      decimals: Math.abs(rawData.expo),
      timestamp: publishTime.getTime(),
      confidence: confidencePercent,
      sources: ['pyth'],
      isStale,
      stalenessSeconds,
    };
  }

  // ============================================================================
  // 公共方法
  // ============================================================================

  /**
   * 获取指定交易对的价格（兼容旧接口）
   */
  async getPriceForSymbol(symbol: string): Promise<UnifiedPriceFeed | null> {
    return this.fetchPrice(symbol);
  }

  /**
   * 获取多个价格喂价
   */
  async getMultiplePrices(symbols: string[]): Promise<UnifiedPriceFeed[]> {
    const results = await Promise.allSettled(
      symbols.map(async (symbol) => {
        try {
          return await this.getPriceForSymbol(symbol);
        } catch (error) {
          this.logger.error(`Failed to get Pyth price for ${symbol}`, {
            error: normalizeError(error).message,
          });
          return null;
        }
      }),
    );

    return results
      .filter(
        (result): result is PromiseFulfilledResult<UnifiedPriceFeed | null> =>
          result.status === 'fulfilled',
      )
      .map((result) => result.value)
      .filter((feed): feed is UnifiedPriceFeed => feed !== null);
  }

  /**
   * 获取所有可用价格喂价
   */
  async fetchAllFeeds(): Promise<UnifiedPriceFeed[]> {
    const symbols = Object.keys(PYTH_PRICE_FEED_IDS);
    return this.getMultiplePrices(symbols);
  }

  /**
   * 检查价格喂价健康状态
   */
  async checkFeedHealth(priceId: string): Promise<{
    healthy: boolean;
    lastUpdate: Date;
    stalenessSeconds: number;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      const rawData = await this.fetchRawPriceData(priceId);
      const lastUpdate = new Date(Number(rawData.publishTime) * 1000);
      const stalenessSeconds = this.calculateStalenessSeconds(rawData.publishTime);

      // 检查数据新鲜度
      const stalenessThreshold =
        (this.clientConfig as { stalenessThreshold?: number }).stalenessThreshold ||
        DEFAULT_STALENESS_THRESHOLDS.PYTH;
      if (stalenessSeconds > stalenessThreshold) {
        issues.push(`Data is stale: ${stalenessSeconds}s old`);
      }

      // 检查价格是否为0
      if (rawData.price === 0n) {
        issues.push('Price is zero');
      }

      // 检查置信度
      const formattedPrice = parseFloat(formatUnits(rawData.price, Math.abs(Number(rawData.expo))));
      const confidence = parseFloat(formatUnits(rawData.conf, Math.abs(Number(rawData.expo))));
      const confidencePercent = (confidence / formattedPrice) * 100;
      if (confidencePercent > 1) {
        issues.push(`High uncertainty: ${confidencePercent.toFixed(2)}% confidence interval`);
      }

      return {
        healthy: issues.length === 0,
        lastUpdate,
        stalenessSeconds,
        issues,
      };
    } catch (error) {
      return {
        healthy: false,
        lastUpdate: new Date(0),
        stalenessSeconds: Infinity,
        issues: [`Failed to read feed: ${normalizeError(error).message}`],
      };
    }
  }

  /**
   * 获取 EMA (指数移动平均) 价格
   */
  async getEmaPrice(priceId: string): Promise<{
    price: bigint;
    conf: bigint;
    expo: number;
    publishTime: bigint;
    formattedPrice: number;
  }> {
    if (!this.contractAddress) {
      throw new Error('Contract address is not set');
    }
    try {
      const priceData = (await this.publicClient.readContract({
        address: this.contractAddress,
        abi: PYTH_ABI,
        functionName: 'getEmaPrice',
        args: [priceId as `0x${string}`],
      })) as [bigint, bigint, number, bigint];

      const price = priceData[0];
      const conf = priceData[1];
      const expo = priceData[2];
      const publishTime = priceData[3];

      const formattedPrice = parseFloat(formatUnits(price, Math.abs(Number(expo))));

      return {
        price,
        conf,
        expo: Number(expo),
        publishTime,
        formattedPrice,
      };
    } catch (error) {
      ErrorHandler.logError(this.logger, 'Failed to get Pyth EMA price', error, {
        chain: this.chain,
        priceId,
      });
      throw error;
    }
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createPythClient(
  chain: SupportedChain,
  rpcUrl: string,
  config?: PythProtocolConfig,
): PythClient {
  return new PythClient(chain, rpcUrl, config);
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取所有可用的价格喂价符号
 */
export function getAvailablePythSymbols(): string[] {
  return getPythAvailableSymbols();
}
