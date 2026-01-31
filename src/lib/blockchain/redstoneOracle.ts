/**
 * RedStone Oracle Integration
 *
 * RedStone 预言机集成模块
 * 支持从 RedStone API 和 EVM 合约获取价格数据
 */

import { createPublicClient, http, type PublicClient } from 'viem';
import { mainnet, polygon, arbitrum, optimism, base, avalanche, bsc } from 'viem/chains';
import { logger } from '@/lib/logger';
import type { SupportedChain, UnifiedPriceFeed } from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// RedStone Feed IDs
// ============================================================================

export const REDSTONE_FEED_IDS: Record<string, string> = {
  'ETH/USD': 'ETH',
  'BTC/USD': 'BTC',
  'SOL/USD': 'SOL',
  'AVAX/USD': 'AVAX',
  'MATIC/USD': 'MATIC',
  'BNB/USD': 'BNB',
  'ARB/USD': 'ARB',
  'OP/USD': 'OP',
  'LINK/USD': 'LINK',
  'UNI/USD': 'UNI',
  'AAVE/USD': 'AAVE',
  'CRV/USD': 'CRV',
  'SNX/USD': 'SNX',
  'COMP/USD': 'COMP',
  'MKR/USD': 'MKR',
  'YFI/USD': 'YFI',
  '1INCH/USD': '1INCH',
  'SUSHI/USD': 'SUSHI',
  'USDC/USD': 'USDC',
  'USDT/USD': 'USDT',
  'DAI/USD': 'DAI',
  'FRAX/USD': 'FRAX',
  'LUSD/USD': 'LUSD',
};

// ============================================================================
// Types
// ============================================================================

export type RedStoneSupportedChain =
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'base'
  | 'avalanche'
  | 'bsc';

export interface RedStonePriceData {
  symbol: string;
  price: bigint;
  formattedPrice: number;
  timestamp: number;
  decimals: number;
  source: string;
}

// ============================================================================
// Chain 配置
// ============================================================================

const VIEM_CHAIN_MAP = {
  ethereum: mainnet,
  polygon: polygon,
  arbitrum: arbitrum,
  optimism: optimism,
  base: base,
  avalanche: avalanche,
  bsc: bsc,
  sepolia: mainnet,
  fantom: mainnet,
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
  goerli: mainnet,
  mumbai: polygon,
  local: mainnet,
} as const;

const REDSTONE_CHAIN_CONFIG: Record<
  SupportedChain,
  { defaultRpcUrl: string; apiEndpoint: string }
> = {
  ethereum: {
    defaultRpcUrl: 'https://eth-mainnet.g.alchemy.com/v2',
    apiEndpoint: 'https://api.redstone.finance/prices',
  },
  polygon: {
    defaultRpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2',
    apiEndpoint: 'https://api.redstone.finance/prices',
  },
  arbitrum: {
    defaultRpcUrl: 'https://arb-mainnet.g.alchemy.com/v2',
    apiEndpoint: 'https://api.redstone.finance/prices',
  },
  optimism: {
    defaultRpcUrl: 'https://opt-mainnet.g.alchemy.com/v2',
    apiEndpoint: 'https://api.redstone.finance/prices',
  },
  base: {
    defaultRpcUrl: 'https://base-mainnet.g.alchemy.com/v2',
    apiEndpoint: 'https://api.redstone.finance/prices',
  },
  avalanche: {
    defaultRpcUrl: 'https://avax-mainnet.g.alchemy.com/v2',
    apiEndpoint: 'https://api.redstone.finance/prices',
  },
  bsc: {
    defaultRpcUrl: 'https://bsc-dataseed.binance.org',
    apiEndpoint: 'https://api.redstone.finance/prices',
  },
  fantom: { defaultRpcUrl: '', apiEndpoint: '' },
  celo: { defaultRpcUrl: '', apiEndpoint: '' },
  gnosis: { defaultRpcUrl: '', apiEndpoint: '' },
  linea: { defaultRpcUrl: '', apiEndpoint: '' },
  scroll: { defaultRpcUrl: '', apiEndpoint: '' },
  mantle: { defaultRpcUrl: '', apiEndpoint: '' },
  mode: { defaultRpcUrl: '', apiEndpoint: '' },
  blast: { defaultRpcUrl: '', apiEndpoint: '' },
  solana: { defaultRpcUrl: '', apiEndpoint: '' },
  near: { defaultRpcUrl: '', apiEndpoint: '' },
  aptos: { defaultRpcUrl: '', apiEndpoint: '' },
  sui: { defaultRpcUrl: '', apiEndpoint: '' },
  polygonAmoy: { defaultRpcUrl: '', apiEndpoint: '' },
  sepolia: { defaultRpcUrl: '', apiEndpoint: '' },
  goerli: { defaultRpcUrl: '', apiEndpoint: '' },
  mumbai: { defaultRpcUrl: '', apiEndpoint: '' },
  local: { defaultRpcUrl: 'http://localhost:8545', apiEndpoint: '' },
};

// ============================================================================
// RedStone Client Class
// ============================================================================

export class RedStoneClient {
  private publicClient: PublicClient | null;
  private chain: SupportedChain;
  private apiEndpoint: string;

  constructor(chain: SupportedChain, options: { rpcUrl?: string; apiKey?: string } = {}) {
    this.chain = chain;

    const chainConfig = REDSTONE_CHAIN_CONFIG[chain];
    if (!chainConfig || !chainConfig.apiEndpoint) {
      throw new Error(`Chain ${chain} not supported by RedStone`);
    }

    this.apiEndpoint = chainConfig.apiEndpoint;

    // 初始化 RPC 客户端（可选，RedStone 主要使用 API）
    if (options.rpcUrl) {
      this.publicClient = createPublicClient({
        chain: VIEM_CHAIN_MAP[chain],
        transport: http(options.rpcUrl),
      }) as PublicClient;
    } else {
      this.publicClient = null;
    }
  }

  /**
   * 从 RedStone API 获取价格数据
   */
  async fetchPriceFromAPI(symbol: string): Promise<RedStonePriceData | null> {
    try {
      const feedId = REDSTONE_FEED_IDS[symbol];
      if (!feedId) {
        logger.warn(`No RedStone feed found for ${symbol}`);
        return null;
      }

      const response = await fetch(
        `${this.apiEndpoint}?symbol=${feedId}&provider=redstone&limit=1`,
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`RedStone API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data || !data[0]) {
        throw new Error('No price data returned from RedStone API');
      }

      const priceData = data[0];
      const price = BigInt(priceData.value);
      const decimals = priceData.decimals || 8;
      const formattedPrice = Number(price) / Math.pow(10, decimals);

      return {
        symbol,
        price,
        formattedPrice,
        timestamp: priceData.timestamp || Math.floor(Date.now() / 1000),
        decimals,
        source: 'redstone-api',
      };
    } catch (error) {
      logger.error('Failed to fetch RedStone price from API', {
        chain: this.chain,
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 批量获取多个价格
   */
  async fetchMultiplePrices(symbols: string[]): Promise<Map<string, RedStonePriceData>> {
    const prices = new Map<string, RedStonePriceData>();

    // RedStone 支持批量查询
    const feedIds = symbols.map((s) => REDSTONE_FEED_IDS[s]).filter(Boolean);

    if (feedIds.length === 0) {
      return prices;
    }

    try {
      const symbolsParam = feedIds.join(',');
      const response = await fetch(`${this.apiEndpoint}?symbol=${symbolsParam}&provider=redstone`, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`RedStone API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      for (const item of data) {
        const symbol = Object.keys(REDSTONE_FEED_IDS).find(
          (key) => REDSTONE_FEED_IDS[key] === item.symbol,
        );

        if (symbol) {
          const decimals = item.decimals || 8;
          const price = BigInt(item.value);

          prices.set(symbol, {
            symbol,
            price,
            formattedPrice: Number(price) / Math.pow(10, decimals),
            timestamp: item.timestamp || Math.floor(Date.now() / 1000),
            decimals,
            source: 'redstone-api',
          });
        }
      }
    } catch (error) {
      logger.error('Failed to fetch multiple RedStone prices', {
        chain: this.chain,
        symbols,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return prices;
  }

  /**
   * 获取指定交易对的价格
   */
  async getPriceForSymbol(symbol: string): Promise<UnifiedPriceFeed | null> {
    try {
      const priceData = await this.fetchPriceFromAPI(symbol);
      if (!priceData) {
        return null;
      }

      return this.convertToUnifiedFeed(priceData);
    } catch (error) {
      logger.error(`Failed to get RedStone price for ${symbol}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * 获取多个价格喂价
   */
  async getMultiplePrices(symbols: string[]): Promise<UnifiedPriceFeed[]> {
    const feeds: UnifiedPriceFeed[] = [];
    const priceDataMap = await this.fetchMultiplePrices(symbols);

    for (const [symbol, priceData] of priceDataMap) {
      try {
        const feed = this.convertToUnifiedFeed(priceData);
        feeds.push(feed);
      } catch (error) {
        logger.error(`Failed to convert RedStone price for ${symbol}`, {
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
    const symbols = Object.keys(REDSTONE_FEED_IDS);
    return this.getMultiplePrices(symbols);
  }

  /**
   * 转换为统一价格喂价格式
   */
  private convertToUnifiedFeed(priceData: RedStonePriceData): UnifiedPriceFeed {
    const [baseAsset, quoteAsset] = priceData.symbol.split('/');
    const timestamp = new Date(priceData.timestamp * 1000);
    const now = new Date();
    const stalenessSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);

    // RedStone 数据通常很新鲜（< 60秒）
    const isStale = stalenessSeconds > 60;

    return {
      id: `redstone-${this.chain}-${priceData.symbol}-${priceData.timestamp}`,
      instanceId: `redstone-${this.chain}`,
      protocol: 'redstone',
      chain: this.chain,
      symbol: priceData.symbol,
      baseAsset: baseAsset || 'UNKNOWN',
      quoteAsset: quoteAsset || 'USD',
      price: priceData.formattedPrice,
      priceRaw: priceData.price.toString(),
      decimals: priceData.decimals,
      timestamp: timestamp.toISOString(),
      isStale,
      stalenessSeconds,
    };
  }

  /**
   * 检查价格喂价健康状态
   */
  async checkFeedHealth(symbol: string): Promise<{
    healthy: boolean;
    lastUpdate: Date;
    stalenessSeconds: number;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      const priceData = await this.fetchPriceFromAPI(symbol);
      if (!priceData) {
        return {
          healthy: false,
          lastUpdate: new Date(0),
          stalenessSeconds: Infinity,
          issues: [`No feed found for ${symbol}`],
        };
      }

      const lastUpdate = new Date(priceData.timestamp * 1000);
      const now = new Date();
      const stalenessSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);

      // 检查数据新鲜度（RedStone 应该 < 60秒）
      if (stalenessSeconds > 60) {
        issues.push(`Data is stale: ${stalenessSeconds}s old`);
      }

      // 检查价格是否为0
      if (priceData.price === 0n) {
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
   * 获取当前区块号（如果配置了 RPC）
   */
  async getBlockNumber(): Promise<bigint | null> {
    if (!this.publicClient) {
      return null;
    }
    return this.publicClient.getBlockNumber();
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createRedStoneClient(
  chain: SupportedChain,
  options?: { rpcUrl?: string; apiKey?: string },
): RedStoneClient {
  return new RedStoneClient(chain, options);
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取支持的 RedStone 链列表
 */
export function getSupportedRedStoneChains(): SupportedChain[] {
  return Object.entries(REDSTONE_CHAIN_CONFIG)
    .filter(([_, config]) => config.apiEndpoint !== '')
    .map(([chain]) => chain as SupportedChain);
}

/**
 * 获取所有可用的价格喂价符号
 */
export function getAvailableRedStoneSymbols(): string[] {
  return Object.keys(REDSTONE_FEED_IDS);
}

/**
 * 检查链是否支持 RedStone
 */
export function isChainSupportedByRedStone(chain: SupportedChain): boolean {
  return REDSTONE_CHAIN_CONFIG[chain]?.apiEndpoint !== '';
}

/**
 * 获取 Feed ID
 */
export function getRedStoneFeedId(symbol: string): string | undefined {
  return REDSTONE_FEED_IDS[symbol];
}
