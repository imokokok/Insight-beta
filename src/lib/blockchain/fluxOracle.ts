/**
 * Flux Oracle Integration
 *
 * Flux 预言机集成模块
 * 支持从 Flux API 获取价格数据
 */

import { logger } from '@/lib/logger';
import type { SupportedChain, UnifiedPriceFeed } from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// Flux API 配置
// ============================================================================

const FLUX_API_ENDPOINTS = {
  mainnet: 'https://api.fluxprotocol.io/api/v1',
  testnet: 'https://api-testnet.fluxprotocol.io/api/v1',
};

// ============================================================================
// Flux Feed IDs
// ============================================================================

export const FLUX_FEED_IDS: Record<string, string> = {
  'ETH/USD': 'eth-usd',
  'BTC/USD': 'btc-usd',
  'SOL/USD': 'sol-usd',
  'AVAX/USD': 'avax-usd',
  'MATIC/USD': 'matic-usd',
  'BNB/USD': 'bnb-usd',
  'ARB/USD': 'arb-usd',
  'OP/USD': 'op-usd',
  'LINK/USD': 'link-usd',
  'UNI/USD': 'uni-usd',
  'AAVE/USD': 'aave-usd',
  'CRV/USD': 'crv-usd',
  'SNX/USD': 'snx-usd',
  'COMP/USD': 'comp-usd',
  'MKR/USD': 'mkr-usd',
  'YFI/USD': 'yfi-usd',
  '1INCH/USD': '1inch-usd',
  'SUSHI/USD': 'sushi-usd',
  'USDC/USD': 'usdc-usd',
  'USDT/USD': 'usdt-usd',
  'DAI/USD': 'dai-usd',
  'FRAX/USD': 'frax-usd',
  'LUSD/USD': 'lusd-usd',
};

// ============================================================================
// Types
// ============================================================================

export type FluxSupportedChain =
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'base'
  | 'avalanche'
  | 'bsc';

export interface FluxPriceData {
  symbol: string;
  price: bigint;
  formattedPrice: number;
  timestamp: number;
  decimals: number;
  roundId: bigint;
  answeredInRound: bigint;
  source: string;
}

export interface FluxRoundData {
  roundId: bigint;
  price: bigint;
  startedAt: bigint;
  updatedAt: bigint;
  answeredInRound: bigint;
}

// ============================================================================
// Chain 配置
// ============================================================================

const FLUX_CHAIN_CONFIG: Record<
  SupportedChain,
  {
    defaultRpcUrl: string;
    apiEndpoint: string;
    network: 'mainnet' | 'testnet';
  }
> = {
  ethereum: {
    defaultRpcUrl: 'https://eth-mainnet.g.alchemy.com/v2',
    apiEndpoint: FLUX_API_ENDPOINTS.mainnet,
    network: 'mainnet',
  },
  polygon: {
    defaultRpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2',
    apiEndpoint: FLUX_API_ENDPOINTS.mainnet,
    network: 'mainnet',
  },
  arbitrum: {
    defaultRpcUrl: 'https://arb-mainnet.g.alchemy.com/v2',
    apiEndpoint: FLUX_API_ENDPOINTS.mainnet,
    network: 'mainnet',
  },
  optimism: {
    defaultRpcUrl: 'https://opt-mainnet.g.alchemy.com/v2',
    apiEndpoint: FLUX_API_ENDPOINTS.mainnet,
    network: 'mainnet',
  },
  base: {
    defaultRpcUrl: 'https://base-mainnet.g.alchemy.com/v2',
    apiEndpoint: FLUX_API_ENDPOINTS.mainnet,
    network: 'mainnet',
  },
  avalanche: {
    defaultRpcUrl: 'https://avax-mainnet.g.alchemy.com/v2',
    apiEndpoint: FLUX_API_ENDPOINTS.mainnet,
    network: 'mainnet',
  },
  bsc: {
    defaultRpcUrl: 'https://bsc-dataseed.binance.org',
    apiEndpoint: FLUX_API_ENDPOINTS.mainnet,
    network: 'mainnet',
  },
  fantom: {
    defaultRpcUrl: '',
    apiEndpoint: '',
    network: 'mainnet',
  },
  celo: {
    defaultRpcUrl: '',
    apiEndpoint: '',
    network: 'mainnet',
  },
  gnosis: {
    defaultRpcUrl: '',
    apiEndpoint: '',
    network: 'mainnet',
  },
  linea: {
    defaultRpcUrl: '',
    apiEndpoint: '',
    network: 'mainnet',
  },
  scroll: {
    defaultRpcUrl: '',
    apiEndpoint: '',
    network: 'mainnet',
  },
  mantle: {
    defaultRpcUrl: '',
    apiEndpoint: '',
    network: 'mainnet',
  },
  mode: {
    defaultRpcUrl: '',
    apiEndpoint: '',
    network: 'mainnet',
  },
  blast: {
    defaultRpcUrl: '',
    apiEndpoint: '',
    network: 'mainnet',
  },
  solana: {
    defaultRpcUrl: '',
    apiEndpoint: '',
    network: 'mainnet',
  },
  near: {
    defaultRpcUrl: '',
    apiEndpoint: '',
    network: 'mainnet',
  },
  aptos: {
    defaultRpcUrl: '',
    apiEndpoint: '',
    network: 'mainnet',
  },
  sui: {
    defaultRpcUrl: '',
    apiEndpoint: '',
    network: 'mainnet',
  },
  polygonAmoy: {
    defaultRpcUrl: '',
    apiEndpoint: FLUX_API_ENDPOINTS.testnet,
    network: 'testnet',
  },
  sepolia: {
    defaultRpcUrl: '',
    apiEndpoint: FLUX_API_ENDPOINTS.testnet,
    network: 'testnet',
  },
  goerli: {
    defaultRpcUrl: '',
    apiEndpoint: FLUX_API_ENDPOINTS.testnet,
    network: 'testnet',
  },
  mumbai: {
    defaultRpcUrl: '',
    apiEndpoint: FLUX_API_ENDPOINTS.testnet,
    network: 'testnet',
  },
  local: {
    defaultRpcUrl: 'http://localhost:8545',
    apiEndpoint: '',
    network: 'mainnet',
  },
};

// ============================================================================
// Flux Client Class
// ============================================================================

export class FluxClient {
  private chain: SupportedChain;
  private apiEndpoint: string;
  private apiKey?: string;

  constructor(chain: SupportedChain, options: { rpcUrl?: string; apiKey?: string } = {}) {
    this.chain = chain;
    this.apiKey = options.apiKey;

    const chainConfig = FLUX_CHAIN_CONFIG[chain];
    if (!chainConfig || !chainConfig.apiEndpoint) {
      throw new Error(`Chain ${chain} not supported by Flux`);
    }

    this.apiEndpoint = chainConfig.apiEndpoint;
  }

  /**
   * 从 Flux API 获取价格数据
   */
  async fetchPriceFromAPI(symbol: string): Promise<FluxPriceData | null> {
    try {
      const feedId = FLUX_FEED_IDS[symbol];
      if (!feedId) {
        logger.warn(`No Flux feed found for ${symbol}`);
        return null;
      }

      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.apiEndpoint}/prices/${feedId}/latest`, { headers });

      if (!response.ok) {
        throw new Error(`Flux API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data || !data.price) {
        throw new Error('No price data returned from Flux API');
      }

      const decimals = data.decimals || 8;
      const price = BigInt(Math.floor(data.price * Math.pow(10, decimals)));
      const formattedPrice = data.price;

      return {
        symbol,
        price,
        formattedPrice,
        timestamp: data.timestamp || Math.floor(Date.now() / 1000),
        decimals,
        roundId: BigInt(data.roundId || 0),
        answeredInRound: BigInt(data.answeredInRound || data.roundId || 0),
        source: 'flux-api',
      };
    } catch (error) {
      logger.error('Failed to fetch Flux price from API', {
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
  async fetchMultiplePrices(symbols: string[]): Promise<Map<string, FluxPriceData>> {
    const prices = new Map<string, FluxPriceData>();

    // Flux API 通常不支持批量查询，需要逐个获取
    const promises = symbols.map(async (symbol) => {
      try {
        const priceData = await this.fetchPriceFromAPI(symbol);
        if (priceData) {
          prices.set(symbol, priceData);
        }
      } catch (error) {
        logger.error(`Failed to fetch Flux price for ${symbol}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    await Promise.all(promises);
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
      logger.error(`Failed to get Flux price for ${symbol}`, {
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
        logger.error(`Failed to convert Flux price for ${symbol}`, {
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
    const symbols = Object.keys(FLUX_FEED_IDS);
    return this.getMultiplePrices(symbols);
  }

  /**
   * 转换为统一价格喂价格式
   */
  private convertToUnifiedFeed(priceData: FluxPriceData): UnifiedPriceFeed {
    const [baseAsset, quoteAsset] = priceData.symbol.split('/');
    const timestamp = new Date(priceData.timestamp * 1000);
    const now = new Date();
    const stalenessSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);

    // Flux 数据通常 < 300秒（5分钟）
    const isStale = stalenessSeconds > 300;

    return {
      id: `flux-${this.chain}-${priceData.symbol}-${priceData.timestamp}`,
      instanceId: `flux-${this.chain}`,
      protocol: 'flux',
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

      // 检查数据新鲜度（Flux 应该 < 300秒）
      if (stalenessSeconds > 300) {
        issues.push(`Data is stale: ${stalenessSeconds}s old`);
      }

      // 检查价格是否为0
      if (priceData.price === 0n) {
        issues.push('Price is zero');
      }

      // 检查轮次
      if (priceData.answeredInRound < priceData.roundId) {
        issues.push('Round data may be incomplete');
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
   * 获取历史轮次数据
   */
  async getRoundData(symbol: string, roundId: bigint): Promise<FluxRoundData | null> {
    try {
      const feedId = FLUX_FEED_IDS[symbol];
      if (!feedId) {
        logger.warn(`No Flux feed found for ${symbol}`);
        return null;
      }

      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(
        `${this.apiEndpoint}/prices/${feedId}/rounds/${roundId.toString()}`,
        { headers },
      );

      if (!response.ok) {
        throw new Error(`Flux API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        roundId: BigInt(data.roundId),
        price: BigInt(data.price),
        startedAt: BigInt(data.startedAt),
        updatedAt: BigInt(data.updatedAt),
        answeredInRound: BigInt(data.answeredInRound),
      };
    } catch (error) {
      logger.error('Failed to fetch Flux round data', {
        chain: this.chain,
        symbol,
        roundId: roundId.toString(),
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createFluxClient(
  chain: SupportedChain,
  options?: { rpcUrl?: string; apiKey?: string },
): FluxClient {
  return new FluxClient(chain, options);
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取支持的 Flux 链列表
 */
export function getSupportedFluxChains(): SupportedChain[] {
  return Object.entries(FLUX_CHAIN_CONFIG)
    .filter(([_, config]) => config.apiEndpoint !== '')
    .map(([chain]) => chain as SupportedChain);
}

/**
 * 获取所有可用的价格喂价符号
 */
export function getAvailableFluxSymbols(): string[] {
  return Object.keys(FLUX_FEED_IDS);
}

/**
 * 检查链是否支持 Flux
 */
export function isChainSupportedByFlux(chain: SupportedChain): boolean {
  return FLUX_CHAIN_CONFIG[chain]?.apiEndpoint !== '';
}

/**
 * 获取 Feed ID
 */
export function getFluxFeedId(symbol: string): string | undefined {
  return FLUX_FEED_IDS[symbol];
}
