/**
 * Flux Oracle Client (Refactored with EvmOracleClient)
 *
 * 使用 EvmOracleClient 基类重构的 Flux 预言机集成模块
 * Flux 是一个去中心化预言机聚合器，支持多链部署
 */

import { type Address, parseAbi, formatUnits } from 'viem';

import { EvmOracleClient } from '@/lib/shared';
import { ErrorHandler, normalizeError } from '@/lib/shared/errors/ErrorHandler';
import type {
  SupportedChain,
  UnifiedPriceFeed,
  FluxProtocolConfig,
  OracleProtocol,
} from '@/lib/types/unifiedOracleTypes';

import { calculateDataFreshness, normalizeSymbol } from './core/types';

// ============================================================================
// Flux 聚合器合约 ABI
// ============================================================================

const FLUX_AGGREGATOR_ABI = parseAbi([
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() external view returns (uint8)',
  'function description() external view returns (string)',
  'function getRoundData(uint80 _roundId) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
]);

// ============================================================================
// Flux 合约地址配置
// ============================================================================

export const FLUX_AGGREGATOR_ADDRESSES: Record<
  SupportedChain,
  Record<string, Address> | undefined
> = {
  ethereum: {
    'ETH/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5d3',
    'BTC/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5d4',
    'LINK/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5d5',
    'USDC/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5d6',
    'USDT/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5d7',
  },
  polygon: {
    'MATIC/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5d8',
    'ETH/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5d9',
    'BTC/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5da',
    'USDC/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5db',
  },
  arbitrum: {
    'ETH/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5dc',
    'BTC/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5dd',
    'USDC/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5de',
    'ARB/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5df',
  },
  optimism: {
    'ETH/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5e0',
    'BTC/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5e1',
    'USDC/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5e2',
    'OP/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5e3',
  },
  base: {
    'ETH/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5e4',
    'BTC/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5e5',
    'USDC/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5e6',
  },
  avalanche: {
    'AVAX/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5e7',
    'ETH/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5e8',
    'BTC/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5e9',
  },
  bsc: {
    'BNB/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5ea',
    'ETH/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5eb',
    'BTC/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5ec',
    'USDT/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5ed',
  },
  fantom: {
    'FTM/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5ee',
    'ETH/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5ef',
    'BTC/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5f0',
  },
  // 其他链暂不支持
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
  sepolia: {
    'ETH/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5f1',
    'BTC/USD': '0x0d3d5A9B6e5C4b3E5d3e5C4b3E5d3e5C4b3E5f2',
  },
  goerli: undefined,
  mumbai: undefined,
  local: undefined,
};

// ============================================================================
// 支持的 Feed
// ============================================================================

export const FLUX_SUPPORTED_FEEDS: Record<SupportedChain, string[]> = {
  ethereum: ['ETH/USD', 'BTC/USD', 'LINK/USD', 'USDC/USD', 'USDT/USD'],
  polygon: ['MATIC/USD', 'ETH/USD', 'BTC/USD', 'USDC/USD'],
  arbitrum: ['ETH/USD', 'BTC/USD', 'USDC/USD', 'ARB/USD'],
  optimism: ['ETH/USD', 'BTC/USD', 'USDC/USD', 'OP/USD'],
  base: ['ETH/USD', 'BTC/USD', 'USDC/USD'],
  avalanche: ['AVAX/USD', 'ETH/USD', 'BTC/USD'],
  bsc: ['BNB/USD', 'ETH/USD', 'BTC/USD', 'USDT/USD'],
  fantom: ['FTM/USD', 'ETH/USD', 'BTC/USD'],
  // 其他链
  celo: [],
  gnosis: [],
  linea: [],
  scroll: [],
  mantle: [],
  mode: [],
  blast: [],
  solana: [],
  near: [],
  aptos: [],
  sui: [],
  polygonAmoy: [],
  sepolia: ['ETH/USD', 'BTC/USD'],
  goerli: [],
  mumbai: [],
  local: [],
};

// ============================================================================
// Flux Client (使用 EvmOracleClient 基类)
// ============================================================================

export class FluxClient extends EvmOracleClient {
  readonly protocol = 'flux' as const;
  readonly chain: SupportedChain;

  private clientConfig: FluxProtocolConfig;
  private feedDecimals: Map<string, number> = new Map();

  constructor(chain: SupportedChain, rpcUrl: string, config: FluxProtocolConfig = {}) {
    super({
      chain,
      protocol: 'flux',
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
    // Flux 每个 feed 有独立的合约地址
    const feedId = (this.clientConfig as { feedId?: string }).feedId;
    if (feedId) {
      const addresses = FLUX_AGGREGATOR_ADDRESSES[this.chain];
      return addresses?.[feedId];
    }
    return undefined;
  }

  protected getFeedId(symbol: string): string | undefined {
    const normalizedSymbol = normalizeSymbol(symbol);
    const availableFeeds = FLUX_SUPPORTED_FEEDS[this.chain] || [];
    return availableFeeds.includes(normalizedSymbol) ? normalizedSymbol : undefined;
  }

  protected async fetchRawPriceData(feedId: string): Promise<{
    value: bigint;
    timestamp: number;
    roundId: bigint;
    decimals: number;
  }> {
    const addresses = FLUX_AGGREGATOR_ADDRESSES[this.chain];
    const contractAddress = addresses?.[feedId];

    if (!contractAddress) {
      throw new Error(`No Flux aggregator contract found for ${feedId} on ${this.chain}`);
    }

    try {
      // 获取 decimals（缓存）
      let decimals = this.feedDecimals.get(feedId);
      if (decimals === undefined) {
        const decimalsResult = await this.publicClient.readContract({
          address: contractAddress,
          abi: FLUX_AGGREGATOR_ABI,
          functionName: 'decimals',
        });
        decimals = Number(decimalsResult);
        this.feedDecimals.set(feedId, decimals);
      }

      // 获取最新轮次数据
      const result = await this.publicClient.readContract({
        address: contractAddress,
        abi: FLUX_AGGREGATOR_ABI,
        functionName: 'latestRoundData',
      });

      return {
        value: result[1],
        timestamp: Number(result[3]),
        roundId: BigInt(result[0]),
        decimals,
      };
    } catch (error) {
      ErrorHandler.logError(this.logger, 'Failed to read Flux aggregator data', error, {
        chain: this.chain,
        feedId,
        contractAddress,
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
      customData: false,
      batchQueries: true,
    };
  }

  protected parsePriceFromContract(
    rawData: {
      value: bigint;
      timestamp: number;
      roundId: bigint;
      decimals: number;
    },
    symbol: string,
    _feedId: string,
  ): UnifiedPriceFeed | null {
    const timestampDate = new Date(rawData.timestamp * 1000);
    const { isStale, stalenessSeconds } = calculateDataFreshness(timestampDate, 300);

    const [baseAsset, quoteAsset] = symbol.split('/');

    const formattedValue = parseFloat(formatUnits(rawData.value, rawData.decimals));

    return {
      id: `flux-${this.chain}-${symbol}-${rawData.timestamp}`,
      instanceId: `flux-${this.chain}`,
      protocol: 'flux' as OracleProtocol,
      chain: this.chain,
      symbol,
      baseAsset: baseAsset || 'UNKNOWN',
      quoteAsset: quoteAsset || 'USD',
      price: formattedValue,
      priceRaw: rawData.value,
      decimals: rawData.decimals,
      timestamp: timestampDate.getTime(),
      confidence: 0.95,
      sources: ['flux'],
      isStale,
      stalenessSeconds,
      blockNumber: Number(rawData.roundId),
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
   * 获取多个价格
   */
  async getMultiplePrices(symbols: string[]): Promise<UnifiedPriceFeed[]> {
    const results = await Promise.allSettled(
      symbols.map(async (symbol) => {
        try {
          return await this.getPriceForSymbol(symbol);
        } catch (error) {
          this.logger.error(`Failed to get Flux price for ${symbol}`, {
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
   * 获取所有可用价格
   */
  async fetchAllFeeds(): Promise<UnifiedPriceFeed[]> {
    const symbols = FLUX_SUPPORTED_FEEDS[this.chain] || [];
    return this.getMultiplePrices(symbols);
  }

  /**
   * 获取指定轮次的数据
   */
  async getRoundData(
    symbol: string,
    roundId: bigint,
  ): Promise<{
    roundId: bigint;
    answer: bigint;
    startedAt: number;
    updatedAt: number;
    answeredInRound: bigint;
  } | null> {
    const addresses = FLUX_AGGREGATOR_ADDRESSES[this.chain];
    const contractAddress = addresses?.[symbol];

    if (!contractAddress) {
      this.logger.warn('No contract address found for symbol', { symbol });
      return null;
    }

    try {
      const result = await this.publicClient.readContract({
        address: contractAddress,
        abi: FLUX_AGGREGATOR_ABI,
        functionName: 'getRoundData',
        args: [roundId],
      });

      return {
        roundId: BigInt(result[0]),
        answer: result[1],
        startedAt: Number(result[2]),
        updatedAt: Number(result[3]),
        answeredInRound: BigInt(result[4]),
      };
    } catch (error) {
      ErrorHandler.logError(this.logger, 'Failed to get Flux round data', error, {
        symbol,
        roundId: roundId.toString(),
      });
      return null;
    }
  }

  /**
   * 检查 Feed 健康状态
   */
  async checkFeedHealth(symbol: string): Promise<{
    healthy: boolean;
    lastUpdate: Date;
    stalenessSeconds: number;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      const feedId = this.getFeedId(symbol);
      if (!feedId) {
        return {
          healthy: false,
          lastUpdate: new Date(0),
          stalenessSeconds: Infinity,
          issues: [`Feed ${symbol} not supported`],
        };
      }

      const data = await this.fetchRawPriceData(feedId);
      const lastUpdate = new Date(data.timestamp * 1000);
      const now = new Date();
      const stalenessSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);

      // 检查数据新鲜度
      if (stalenessSeconds > 300) {
        issues.push(`Data is stale: ${stalenessSeconds}s old`);
      }

      // 检查价格是否为0
      if (data.value === 0n) {
        issues.push('Price is zero');
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
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createFluxClient(
  chain: SupportedChain,
  rpcUrl: string,
  config?: FluxProtocolConfig,
): FluxClient {
  return new FluxClient(chain, rpcUrl, config);
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取支持的 Flux 链列表
 */
export function getSupportedFluxChains(): SupportedChain[] {
  return Object.entries(FLUX_AGGREGATOR_ADDRESSES)
    .filter(([_, addresses]) => addresses !== undefined)
    .map(([chain]) => chain as SupportedChain);
}

/**
 * 获取指定链的可用 Feed 列表
 */
export function getAvailableFluxFeeds(chain: SupportedChain): string[] {
  return FLUX_SUPPORTED_FEEDS[chain] || [];
}

/**
 * 检查链是否支持 Flux
 */
export function isChainSupportedByFlux(chain: SupportedChain): boolean {
  return FLUX_AGGREGATOR_ADDRESSES[chain] !== undefined;
}

/**
 * 获取 Feed 的聚合器合约地址
 */
export function getFluxAggregatorAddress(
  chain: SupportedChain,
  symbol: string,
): Address | undefined {
  return FLUX_AGGREGATOR_ADDRESSES[chain]?.[symbol];
}
