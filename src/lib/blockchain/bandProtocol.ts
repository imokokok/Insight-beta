/**
 * Band Protocol Oracle Integration
 *
 * Band 预言机集成模块
 * 支持跨链数据预言机
 */

import {
  createPublicClient,
  http,
  type PublicClient,
  type Address,
  parseAbi,
  formatUnits,
} from 'viem';
import { mainnet, polygon, bsc, fantom } from 'viem/chains';
import { logger } from '@/lib/logger';
import type {
  SupportedChain,
  UnifiedPriceFeed,
  BandProtocolConfig,
} from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// Band Standard Dataset ABI
// ============================================================================

const BAND_STANDARD_DATASET_ABI = parseAbi([
  'function getReferenceData(string memory base, string memory quote) external view returns (ReferenceData memory)',
  'function getReferenceDataBulk(string[] memory bases, string[] memory quotes) external view returns (ReferenceData[] memory)',
]);

// ReferenceData struct
// {
//   uint256 rate;
//   uint256 lastUpdatedBase;
//   uint256 lastUpdatedQuote;
// }

// ============================================================================
// Band 合约地址配置
// ============================================================================

const BAND_CONTRACT_ADDRESSES: Record<SupportedChain, Address | undefined> = {
  ethereum: '0xDA7a001b254CD22e46d3eAB04d937489c93174C3',
  polygon: '0xDA7a001b254CD22e46d3eAB04d937489c93174C3',
  bsc: '0xDA7a001b254CD22e46d3eAB04d937489c93174C3',
  fantom: '0xDA7a001b254CD22e46d3eAB04d937489c93174C3',
  // 其他链暂不支持
  arbitrum: undefined,
  optimism: undefined,
  base: undefined,
  avalanche: undefined,
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
// 常用价格喂价配置
// ============================================================================

const BAND_PRICE_PAIRS: Record<string, { base: string; quote: string }> = {
  'ETH/USD': { base: 'ETH', quote: 'USD' },
  'BTC/USD': { base: 'BTC', quote: 'USD' },
  'BNB/USD': { base: 'BNB', quote: 'USD' },
  'MATIC/USD': { base: 'MATIC', quote: 'USD' },
  'FTM/USD': { base: 'FTM', quote: 'USD' },
  'LINK/USD': { base: 'LINK', quote: 'USD' },
  'UNI/USD': { base: 'UNI', quote: 'USD' },
  'AAVE/USD': { base: 'AAVE', quote: 'USD' },
  'SUSHI/USD': { base: 'SUSHI', quote: 'USD' },
  'COMP/USD': { base: 'COMP', quote: 'USD' },
  'MKR/USD': { base: 'MKR', quote: 'USD' },
  'YFI/USD': { base: 'YFI', quote: 'USD' },
  'DAI/USD': { base: 'DAI', quote: 'USD' },
  'USDC/USD': { base: 'USDC', quote: 'USD' },
  'USDT/USD': { base: 'USDT', quote: 'USD' },
  'BUSD/USD': { base: 'BUSD', quote: 'USD' },
  'XAU/USD': { base: 'XAU', quote: 'USD' }, // 黄金
  'XAG/USD': { base: 'XAG', quote: 'USD' }, // 白银
};

// ============================================================================
// Chain 配置
// ============================================================================

// viem chain 映射
const VIEM_CHAIN_MAP = {
  ethereum: mainnet,
  polygon: polygon,
  bsc: bsc,
  fantom: fantom,
  arbitrum: mainnet,
  optimism: mainnet,
  base: mainnet,
  avalanche: mainnet,
  celo: mainnet,
  gnosis: mainnet,
  linea: mainnet,
  scroll: mainnet,
  mantle: mainnet,
  mode: mainnet,
  blast: mainnet,
  solana: mainnet,
  near: mainnet,
  aptos: mainnet,
  sui: mainnet,
  polygonAmoy: polygon,
  sepolia: mainnet,
  goerli: mainnet,
  mumbai: polygon,
  local: mainnet,
} as const;

const BAND_CHAIN_CONFIG: Record<SupportedChain, { defaultRpcUrl: string }> = {
  ethereum: { defaultRpcUrl: 'https://eth-mainnet.g.alchemy.com/v2' },
  polygon: { defaultRpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2' },
  bsc: { defaultRpcUrl: 'https://bsc-dataseed.binance.org' },
  fantom: { defaultRpcUrl: 'https://rpc.ftm.tools' },
  // 其他链
  arbitrum: { defaultRpcUrl: '' },
  optimism: { defaultRpcUrl: '' },
  base: { defaultRpcUrl: '' },
  avalanche: { defaultRpcUrl: '' },
  celo: { defaultRpcUrl: '' },
  gnosis: { defaultRpcUrl: '' },
  linea: { defaultRpcUrl: '' },
  scroll: { defaultRpcUrl: '' },
  mantle: { defaultRpcUrl: '' },
  mode: { defaultRpcUrl: '' },
  blast: { defaultRpcUrl: '' },
  solana: { defaultRpcUrl: '' },
  near: { defaultRpcUrl: '' },
  aptos: { defaultRpcUrl: '' },
  sui: { defaultRpcUrl: '' },
  polygonAmoy: { defaultRpcUrl: '' },
  sepolia: { defaultRpcUrl: '' },
  goerli: { defaultRpcUrl: '' },
  mumbai: { defaultRpcUrl: '' },
  local: { defaultRpcUrl: 'http://localhost:8545' },
};

// ============================================================================
// Band Client Class
// ============================================================================

export class BandClient {
  private publicClient: PublicClient;
  private chain: SupportedChain;
  private contractAddress: Address;

  constructor(chain: SupportedChain, rpcUrl: string, _config: BandProtocolConfig = {}) {
    this.chain = chain;

    const chainConfig = BAND_CHAIN_CONFIG[chain];
    if (!chainConfig) {
      throw new Error(`Chain ${chain} not supported by Band`);
    }

    // 使用配置的合约地址或默认地址
    this.contractAddress = (_config.endpoint as Address) || BAND_CONTRACT_ADDRESSES[chain];
    if (!this.contractAddress) {
      throw new Error(`No Band contract address for chain ${chain}`);
    }

    this.publicClient = createPublicClient({
      chain: VIEM_CHAIN_MAP[chain],
      transport: http(rpcUrl),
    });
  }

  /**
   * 获取最新价格数据
   */
  async getLatestPrice(
    base: string,
    quote: string,
  ): Promise<{
    rate: bigint;
    lastUpdatedBase: bigint;
    lastUpdatedQuote: bigint;
    formattedRate: number;
  }> {
    try {
      const priceData = (await this.publicClient.readContract({
        address: this.contractAddress,
        abi: BAND_STANDARD_DATASET_ABI,
        functionName: 'getReferenceData',
        args: [base, quote],
      })) as [bigint, bigint, bigint];

      const rate = priceData[0];
      const lastUpdatedBase = priceData[1];
      const lastUpdatedQuote = priceData[2];

      // Band 使用 18 位小数
      const formattedRate = parseFloat(formatUnits(rate, 18));

      return {
        rate,
        lastUpdatedBase,
        lastUpdatedQuote,
        formattedRate,
      };
    } catch (error) {
      logger.error('Failed to get Band price', {
        chain: this.chain,
        base,
        quote,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 获取指定交易对的价格
   */
  async getPriceForSymbol(symbol: string): Promise<UnifiedPriceFeed | null> {
    const pair = BAND_PRICE_PAIRS[symbol];

    if (!pair) {
      logger.warn(`No Band price feed found for ${symbol}`);
      return null;
    }

    return this.getUnifiedPriceFeed(symbol, pair.base, pair.quote);
  }

  /**
   * 获取多个价格喂价
   */
  async getMultiplePrices(symbols: string[]): Promise<UnifiedPriceFeed[]> {
    const feeds: UnifiedPriceFeed[] = [];

    for (const symbol of symbols) {
      try {
        const feed = await this.getPriceForSymbol(symbol);
        if (feed) {
          feeds.push(feed);
        }
      } catch (error) {
        logger.error(`Failed to get Band price for ${symbol}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return feeds;
  }

  /**
   * 获取所有可用价格喂价
   */
  async getAllAvailableFeeds(): Promise<UnifiedPriceFeed[]> {
    const symbols = Object.keys(BAND_PRICE_PAIRS);
    return this.getMultiplePrices(symbols);
  }

  /**
   * 批量获取价格
   */
  async getBulkPrices(symbols: string[]): Promise<UnifiedPriceFeed[]> {
    const pairs = symbols.map((symbol) => BAND_PRICE_PAIRS[symbol]).filter(Boolean);

    if (pairs.length === 0) {
      return [];
    }

    try {
      const bases = pairs.map((p) => p?.base).filter((b): b is string => b !== undefined);
      const quotes = pairs.map((p) => p?.quote).filter((q): q is string => q !== undefined);

      const priceData = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: BAND_STANDARD_DATASET_ABI,
        functionName: 'getReferenceDataBulk',
        args: [bases, quotes],
      });

      const feeds: UnifiedPriceFeed[] = [];

      for (let i = 0; i < symbols.length; i++) {
        const symbol = symbols[i];
        if (!symbol) continue;
        const data = priceData[i] as [bigint, bigint, bigint] | undefined;

        if (!data) continue;

        const rate = data[0];
        const lastUpdatedBase = data[1];

        const [baseAsset, quoteAsset] = symbol.split('/');
        const formattedRate = parseFloat(formatUnits(rate, 18));

        const now = new Date();
        const lastUpdate = new Date(Number(lastUpdatedBase) * 1000);
        const stalenessSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);

        // Band 数据通常很新鲜
        const isStale = stalenessSeconds > 300; // 5 分钟

        feeds.push({
          id: `band-${this.chain}-${symbol}-${lastUpdatedBase.toString()}`,
          instanceId: `band-${this.chain}`,
          protocol: 'band',
          chain: this.chain,
          symbol,
          baseAsset: baseAsset || 'UNKNOWN',
          quoteAsset: quoteAsset || 'USD',
          price: formattedRate,
          priceRaw: rate.toString(),
          decimals: 18,
          timestamp: lastUpdate.toISOString(),
          isStale,
          stalenessSeconds,
        });
      }

      return feeds;
    } catch (error) {
      logger.error('Failed to get Band bulk prices', {
        chain: this.chain,
        error: error instanceof Error ? error.message : String(error),
      });
      // 回退到逐个获取
      return this.getMultiplePrices(symbols);
    }
  }

  /**
   * 转换为统一价格喂价格式
   */
  private async getUnifiedPriceFeed(
    symbol: string,
    base: string,
    quote: string,
  ): Promise<UnifiedPriceFeed> {
    const priceData = await this.getLatestPrice(base, quote);
    const [baseAsset, quoteAsset] = symbol.split('/');

    const now = new Date();
    const lastUpdate = new Date(Number(priceData.lastUpdatedBase) * 1000);
    const stalenessSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);

    // Band 数据通常很新鲜
    const isStale = stalenessSeconds > 300; // 5 分钟

    return {
      id: `band-${this.chain}-${symbol}-${priceData.lastUpdatedBase.toString()}`,
      instanceId: `band-${this.chain}`,
      protocol: 'band',
      chain: this.chain,
      symbol,
      baseAsset: baseAsset || 'UNKNOWN',
      quoteAsset: quoteAsset || 'USD',
      price: priceData.formattedRate,
      priceRaw: priceData.rate.toString(),
      decimals: 18,
      timestamp: lastUpdate.toISOString(),
      isStale,
      stalenessSeconds,
    };
  }

  /**
   * 检查价格喂价健康状态
   */
  async checkFeedHealth(
    base: string,
    quote: string,
  ): Promise<{
    healthy: boolean;
    lastUpdate: Date;
    stalenessSeconds: number;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      const priceData = await this.getLatestPrice(base, quote);
      const lastUpdate = new Date(Number(priceData.lastUpdatedBase) * 1000);
      const now = new Date();
      const stalenessSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);

      // 检查数据新鲜度
      if (stalenessSeconds > 300) {
        issues.push(`Data is stale: ${stalenessSeconds}s old`);
      }

      // 检查价格是否为0
      if (priceData.rate === 0n) {
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
        issues: [`Failed to read feed: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  /**
   * 获取当前区块号
   */
  async getBlockNumber(): Promise<bigint> {
    return this.publicClient.getBlockNumber();
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
 * 获取支持的 Band 链列表
 */
export function getSupportedBandChains(): SupportedChain[] {
  return Object.entries(BAND_CONTRACT_ADDRESSES)
    .filter(([_, address]) => address !== undefined)
    .map(([chain]) => chain as SupportedChain);
}

/**
 * 获取所有可用的价格喂价符号
 */
export function getAvailableBandSymbols(): string[] {
  return Object.keys(BAND_PRICE_PAIRS);
}

/**
 * 检查链是否支持 Band
 */
export function isChainSupportedByBand(chain: SupportedChain): boolean {
  return BAND_CONTRACT_ADDRESSES[chain] !== undefined;
}

/**
 * 获取合约地址
 */
export function getBandContractAddress(chain: SupportedChain): Address | undefined {
  return BAND_CONTRACT_ADDRESSES[chain];
}
