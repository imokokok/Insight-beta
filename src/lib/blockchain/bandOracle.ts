/**
 * Band Protocol Oracle Client
 *
 * Band Protocol 是跨链数据预言机，支持：
 * - 多链数据传输
 * - Cosmos 生态系统
 * 自定义数据源
 * 数据聚合验证
 */

import { type Address, formatUnits } from 'viem';

import { DEFAULT_STALENESS_THRESHOLDS } from '@/config/constants';
import { ErrorHandler, normalizeError } from '@/lib/errors';
import { EvmOracleClient } from '@/lib/shared';
import { logger } from '@/shared/logger';
import type {
  SupportedChain,
  UnifiedPriceFeed,
  BandProtocolConfig,
  OracleProtocol,
} from '@/types/unifiedOracleTypes';

import { calculateDataFreshness } from './core/types';

// ============================================================================
// Band Protocol ABI
// ============================================================================

const BAND_STD_REFERENCE_ABI = [
  {
    name: 'getReferenceData',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'base', type: 'string' },
      { name: 'quote', type: 'string' },
    ],
    outputs: [
      { name: 'rate', type: 'uint256' },
      { name: 'lastUpdatedBase', type: 'uint256' },
      { name: 'lastUpdatedQuote', type: 'uint256' },
    ],
  },
  {
    name: 'getReferenceDataBulk',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'bases', type: 'string[]' },
      { name: 'quotes', type: 'string[]' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'rate', type: 'uint256' },
          { name: 'lastUpdatedBase', type: 'uint256' },
          { name: 'lastUpdatedQuote', type: 'uint256' },
        ],
      },
    ],
  },
] as const;

// ============================================================================
// Band Protocol 合约地址配置
// ============================================================================

export const BAND_CONTRACT_ADDRESSES: Record<SupportedChain, Address | undefined> = {
  ethereum: '0xDA7a001b254CD22e46d3eAB04d937489c93174C3',
  polygon: '0x3da0614A56b6f3E8E10e2E7d734A395E7d90Df32',
  arbitrum: '0x9E4807D7900b1D60337293f5D969A4D3268D9d26',
  optimism: '0x9E4807D7900b1D60337293f5D969A4D3268D9d26',
  avalanche: '0x9E4807D7900b1D60337293f5D969A4D3268D9d26',
  bsc: '0xDA7a001b254CD22e46d3eAB04d937489c93174C3',
  fantom: '0x9E4807D7900b1D60337293f5D969A4D3268D9d26',
  base: '0x9E4807D7900b1D60337293f5D969A4D3268D9d26',
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
  sepolia: undefined,
  goerli: undefined,
  mumbai: undefined,
  local: undefined,
};

// ============================================================================
// Band Protocol 支持的符号
// ============================================================================

export const BAND_SUPPORTED_SYMBOLS: Record<SupportedChain, string[]> = {
  ethereum: ['ETH/USD', 'BTC/USD', 'LINK/USD', 'USDC/USD', 'USDT/USD', 'DAI/USD'],
  polygon: ['MATIC/USD', 'ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD'],
  arbitrum: ['ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD', 'ARB/USD'],
  optimism: ['ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD', 'OP/USD'],
  avalanche: ['AVAX/USD', 'ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD'],
  bsc: ['BNB/USD', 'ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD'],
  fantom: ['ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD', 'FTM/USD'],
  base: ['ETH/USD', 'BTC/USD', 'USDC/USD'],
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
  sepolia: [],
  goerli: [],
  mumbai: [],
  local: [],
};

// ============================================================================
// Band Chain REST API 配置
// ============================================================================

export const BAND_CHAIN_REST_URLS = {
  mainnet: 'https://laozi1.bandchain.org/api',
  testnet: 'https://laozi-testnet4.bandchain.org/api',
} as const;

// ============================================================================
// 类型定义
// ============================================================================

export interface BandReferenceData {
  rate: bigint;
  lastUpdatedBase: bigint;
  lastUpdatedQuote: bigint;
}

export interface BandPriceData {
  symbol: string;
  price: number;
  timestamp: number;
  lastUpdatedBase: number;
  lastUpdatedQuote: number;
}

export interface BandChainPriceResponse {
  status: string;
  result: {
    symbol: string;
    px: string;
    multiplier: string;
    request_id: string;
    resolve_time: string;
  };
}

export interface BandAggregationResult {
  symbol: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  priceCount: number;
  deviation: number;
  isValid: boolean;
}

// ============================================================================
// Band Client (使用 EvmOracleClient 基类)
// ============================================================================

export class BandClient extends EvmOracleClient {
  readonly protocol = 'band' as const;
  readonly chain: SupportedChain;

  private clientConfig: BandProtocolConfig;
  private bandChainRestUrl: string;

  constructor(chain: SupportedChain, rpcUrl: string, config: BandProtocolConfig = {}) {
    super({
      chain,
      protocol: 'band',
      rpcUrl,
      timeoutMs: (config as { timeoutMs?: number }).timeoutMs ?? 30000,
      defaultDecimals: 9,
    });

    this.chain = chain;
    this.clientConfig = config;
    this.bandChainRestUrl = config.bandChainRestUrl ?? BAND_CHAIN_REST_URLS.mainnet;
  }

  // ============================================================================
  // 实现抽象方法
  // ============================================================================

  protected resolveContractAddress(): Address | undefined {
    const configAddress = this.clientConfig?.stdReferenceAddress;
    if (configAddress) {
      return configAddress as Address;
    }
    return BAND_CONTRACT_ADDRESSES[this.chain];
  }

  protected getFeedId(symbol: string): string | undefined {
    const parts = symbol.split('/');
    if (parts.length !== 2) {
      return undefined;
    }
    return symbol;
  }

  protected async fetchRawPriceData(feedId: string): Promise<BandReferenceData> {
    if (!this.contractAddress) {
      throw new Error('Contract address is not set');
    }

    const parts = feedId.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error(`Invalid symbol format: ${feedId}. Expected format: BASE/QUOTE`);
    }

    const base = parts[0];
    const quote = parts[1];

    try {
      const result = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: BAND_STD_REFERENCE_ABI,
        functionName: 'getReferenceData',
        args: [base, quote],
      });

      const [rate, lastUpdatedBase, lastUpdatedQuote] = result as [bigint, bigint, bigint];

      return {
        rate,
        lastUpdatedBase,
        lastUpdatedQuote,
      };
    } catch (error) {
      ErrorHandler.logError(this.logger, 'Failed to fetch Band price', error, {
        chain: this.chain,
        symbol: feedId,
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
      cosmosSupport: this.clientConfig.enableCosmosSupport ?? false,
    };
  }

  protected parsePriceFromContract(
    rawData: BandReferenceData,
    symbol: string,
    _feedId: string,
  ): UnifiedPriceFeed | null {
    const parts = symbol.split('/');
    const baseAsset = parts[0] || 'UNKNOWN';
    const quoteAsset = parts[1] || 'USD';

    const formattedPrice = parseFloat(formatUnits(rawData.rate, 9));

    if (!Number.isFinite(formattedPrice) || formattedPrice <= 0) {
      logger.error('Invalid price from Band Protocol', {
        symbol,
        price: rawData.rate,
        formattedPrice,
      });
      return null;
    }

    const lastUpdated = Number(rawData.lastUpdatedBase);
    const timestamp = new Date(lastUpdated * 1000);
    const stalenessThreshold =
      (this.clientConfig as { stalenessThreshold?: number }).stalenessThreshold ||
      DEFAULT_STALENESS_THRESHOLDS.BAND;
    const { isStale, stalenessSeconds } = calculateDataFreshness(timestamp, stalenessThreshold);

    return {
      id: `band-${this.chain}-${symbol}-${lastUpdated}`,
      instanceId: `band-${this.chain}`,
      protocol: 'band' as OracleProtocol,
      chain: this.chain,
      symbol,
      baseAsset,
      quoteAsset,
      price: formattedPrice,
      priceRaw: rawData.rate,
      decimals: 9,
      timestamp: timestamp.getTime(),
      confidence: 0.95,
      sources: ['band'],
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
   * 批量获取多个价格
   */
  async getReferenceDataBulk(
    symbols: string[],
  ): Promise<Array<{ symbol: string; data: BandReferenceData | null }>> {
    if (!this.contractAddress) {
      throw new Error('Contract address is not set');
    }

    const bases: string[] = [];
    const quotes: string[] = [];
    const validSymbols: string[] = [];

    for (const symbol of symbols) {
      const parts = symbol.split('/');
      if (parts.length === 2) {
        bases.push(parts[0]!);
        quotes.push(parts[1]!);
        validSymbols.push(symbol);
      }
    }

    if (validSymbols.length === 0) {
      return [];
    }

    try {
      const results = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: BAND_STD_REFERENCE_ABI,
        functionName: 'getReferenceDataBulk',
        args: [bases, quotes],
      });

      const typedResults = results as Array<{
        rate: bigint;
        lastUpdatedBase: bigint;
        lastUpdatedQuote: bigint;
      }>;

      return validSymbols.map((symbol, index) => ({
        symbol,
        data: {
          rate: typedResults[index]!.rate,
          lastUpdatedBase: typedResults[index]!.lastUpdatedBase,
          lastUpdatedQuote: typedResults[index]!.lastUpdatedQuote,
        },
      }));
    } catch (error) {
      ErrorHandler.logError(this.logger, 'Failed to fetch bulk prices from Band', error, {
        chain: this.chain,
        symbols: validSymbols,
      });
      throw error;
    }
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
          this.logger.error(`Failed to get Band price for ${symbol}`, {
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
    const symbols = BAND_SUPPORTED_SYMBOLS[this.chain] || [];
    return this.getMultiplePrices(symbols);
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
      const rawData = await this.fetchRawPriceData(symbol);
      const lastUpdate = new Date(Number(rawData.lastUpdatedBase) * 1000);
      const stalenessSeconds = this.calculateStalenessSeconds(rawData.lastUpdatedBase);

      const stalenessThreshold =
        (this.clientConfig as { stalenessThreshold?: number }).stalenessThreshold ||
        DEFAULT_STALENESS_THRESHOLDS.BAND;
      if (stalenessSeconds > stalenessThreshold) {
        issues.push(`Data is stale: ${stalenessSeconds}s old`);
      }

      if (rawData.rate === 0n) {
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

  // ============================================================================
  // 数据聚合验证方法
  // ============================================================================

  /**
   * 验证价格数据聚合
   * 从多个数据源获取价格并验证一致性
   */
  async validatePriceAggregation(
    symbol: string,
    _sources?: string[],
  ): Promise<BandAggregationResult> {
    const prices: number[] = [];

    const evmPrice = await this.getPriceForSymbol(symbol);
    if (evmPrice) {
      prices.push(evmPrice.price);
    }

    if (this.clientConfig.enableCosmosSupport) {
      try {
        const cosmosPrice = await this.fetchCosmosPrice(symbol);
        if (cosmosPrice !== null) {
          prices.push(cosmosPrice);
        }
      } catch (error) {
        this.logger.warn('Failed to fetch Cosmos price for aggregation', {
          symbol,
          error: normalizeError(error).message,
        });
      }
    }

    if (prices.length === 0) {
      return {
        symbol,
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        priceCount: 0,
        deviation: 0,
        isValid: false,
      };
    }

    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const deviation = avgPrice > 0 ? (maxPrice - minPrice) / avgPrice : 0;

    const isValid = deviation < 0.05;

    return {
      symbol,
      avgPrice,
      minPrice,
      maxPrice,
      priceCount: prices.length,
      deviation,
      isValid,
    };
  }

  // ============================================================================
  // Cosmos 链支持
  // ============================================================================

  /**
   * 从 Band Chain REST API 获取价格（Cosmos 支持）
   */
  async fetchCosmosPrice(symbol: string): Promise<number | null> {
    if (!this.clientConfig.enableCosmosSupport) {
      return null;
    }

    const parts = symbol.split('/');
    if (parts.length !== 2) {
      return null;
    }

    const base = parts[0];

    if (!base) {
      return null;
    }

    try {
      const response = await fetch(
        `${this.bandChainRestUrl}/oracle/v1/request_prices?symbols=${base}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as {
        price_results?: Array<{ symbol: string; px: string }>;
      };

      if (data.price_results && data.price_results.length > 0) {
        const priceResult = data.price_results.find(
          (p) => p.symbol.toUpperCase() === base.toUpperCase(),
        );
        if (priceResult) {
          return parseFloat(priceResult.px);
        }
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to fetch Cosmos price from Band Chain', {
        symbol,
        error: normalizeError(error).message,
      });
      return null;
    }
  }

  /**
   * 检查跨链数据桥状态
   */
  async checkBridgeStatus(): Promise<{
    status: 'active' | 'degraded' | 'inactive';
    lastRelayTime: number;
    pendingRequests: number;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      const response = await fetch(`${this.bandChainRestUrl}/oracle/v1/request_counts`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        issues.push(`Bridge API returned status ${response.status}`);
        return {
          status: 'degraded',
          lastRelayTime: 0,
          pendingRequests: 0,
          issues,
        };
      }

      const data = (await response.json()) as { request_counts?: Array<{ count: string }> };
      const pendingRequests = data.request_counts
        ? parseInt(data.request_counts[0]?.count || '0', 10)
        : 0;

      return {
        status: 'active',
        lastRelayTime: Date.now(),
        pendingRequests,
        issues,
      };
    } catch (error) {
      issues.push(`Failed to check bridge status: ${normalizeError(error).message}`);
      return {
        status: 'inactive',
        lastRelayTime: 0,
        pendingRequests: 0,
        issues,
      };
    }
  }

  /**
   * 获取 Band Chain 最新区块信息
   */
  async getBandChainLatestBlock(): Promise<{
    blockHeight: number;
    blockHash: string;
    timestamp: number;
  } | null> {
    try {
      const response = await fetch(`${this.bandChainRestUrl}/blocks/latest`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as {
        block?: {
          header?: {
            height?: string;
            time?: string;
          };
        };
        block_id?: {
          hash?: string;
        };
      };

      return {
        blockHeight: parseInt(data.block?.header?.height || '0', 10),
        blockHash: data.block_id?.hash || '',
        timestamp: data.block?.header?.time
          ? new Date(data.block.header.time).getTime()
          : Date.now(),
      };
    } catch (error) {
      this.logger.error('Failed to get Band Chain latest block', {
        error: normalizeError(error).message,
      });
      return null;
    }
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createBandClient(
  chain: SupportedChain,
  rpcUrl: string,
  config?: BandProtocolConfig,
): BandClient {
  return new BandClient(chain, rpcUrl, config);
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取所有可用的价格喂价符号
 */
export function getAvailableBandSymbols(chain: SupportedChain): string[] {
  return BAND_SUPPORTED_SYMBOLS[chain] || [];
}

/**
 * 获取支持的 Band 链列表
 */
export function getSupportedBandChains(): SupportedChain[] {
  return Object.entries(BAND_CONTRACT_ADDRESSES)
    .filter(([, address]) => address !== undefined)
    .map(([chain]) => chain as SupportedChain);
}

/**
 * 检查链是否被 Band 支持
 */
export function isChainSupportedByBand(chain: SupportedChain): boolean {
  return BAND_CONTRACT_ADDRESSES[chain] !== undefined;
}

/**
 * 获取 Band 合约地址
 */
export function getBandContractAddress(chain: SupportedChain): Address | undefined {
  return BAND_CONTRACT_ADDRESSES[chain];
}

/**
 * 获取符号格式化（用于 Band Protocol）
 */
export function formatSymbolForBand(symbol: string): { base: string; quote: string } | null {
  const parts = symbol.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return {
    base: parts[0].toUpperCase(),
    quote: parts[1].toUpperCase(),
  };
}

/**
 * 验证 Band 价格数据
 */
export function validateBandPriceData(data: BandReferenceData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (data.rate <= 0n) {
    errors.push('Price rate must be positive');
  }

  if (data.lastUpdatedBase === 0n) {
    errors.push('Base timestamp is zero');
  }

  const now = Math.floor(Date.now() / 1000);
  const baseTime = Number(data.lastUpdatedBase);
  if (baseTime > now) {
    errors.push('Base timestamp is in the future');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
