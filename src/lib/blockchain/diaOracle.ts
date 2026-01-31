/**
 * DIA Oracle Integration
 *
 * DIA 预言机集成模块
 * 支持从 DIA API 获取价格数据
 */

import { logger } from '@/lib/logger';
import type { SupportedChain, UnifiedPriceFeed } from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// DIA API 配置
// ============================================================================

const DIA_API_ENDPOINTS = {
  mainnet: 'https://api.diadata.org/v1',
  testnet: 'https://api.diadata.org/v1',
};

// ============================================================================
// DIA Assets
// ============================================================================

export const DIA_ASSETS: Record<string, string> = {
  'ETH/USD': 'Ethereum',
  'BTC/USD': 'Bitcoin',
  'SOL/USD': 'Solana',
  'AVAX/USD': 'Avalanche',
  'MATIC/USD': 'Polygon',
  'BNB/USD': 'BNB',
  'ARB/USD': 'Arbitrum',
  'OP/USD': 'Optimism',
  'LINK/USD': 'Chainlink',
  'UNI/USD': 'Uniswap',
  'AAVE/USD': 'Aave',
  'CRV/USD': 'Curve',
  'SNX/USD': 'Synthetix',
  'COMP/USD': 'Compound',
  'MKR/USD': 'Maker',
  'YFI/USD': 'Yearn',
  '1INCH/USD': '1inch',
  'SUSHI/USD': 'SushiSwap',
  'USDC/USD': 'USD Coin',
  'USDT/USD': 'Tether',
  'DAI/USD': 'Dai',
  'FRAX/USD': 'Frax',
  'LUSD/USD': 'Liquity',
};

// ============================================================================
// Types
// ============================================================================

export type DIASupportedChain =
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'base'
  | 'avalanche'
  | 'bsc';

export interface DIAPriceData {
  symbol: string;
  asset: string;
  price: bigint;
  formattedPrice: number;
  timestamp: number;
  decimals: number;
  source: string;
  volume24h?: number;
  marketCap?: number;
}

// ============================================================================
// Chain 配置
// ============================================================================

const DIA_CHAIN_CONFIG: Record<
  SupportedChain,
  {
    defaultRpcUrl: string;
    apiEndpoint: string;
  }
> = {
  ethereum: {
    defaultRpcUrl: 'https://eth-mainnet.g.alchemy.com/v2',
    apiEndpoint: DIA_API_ENDPOINTS.mainnet,
  },
  polygon: {
    defaultRpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2',
    apiEndpoint: DIA_API_ENDPOINTS.mainnet,
  },
  arbitrum: {
    defaultRpcUrl: 'https://arb-mainnet.g.alchemy.com/v2',
    apiEndpoint: DIA_API_ENDPOINTS.mainnet,
  },
  optimism: {
    defaultRpcUrl: 'https://opt-mainnet.g.alchemy.com/v2',
    apiEndpoint: DIA_API_ENDPOINTS.mainnet,
  },
  base: {
    defaultRpcUrl: 'https://base-mainnet.g.alchemy.com/v2',
    apiEndpoint: DIA_API_ENDPOINTS.mainnet,
  },
  avalanche: {
    defaultRpcUrl: 'https://avax-mainnet.g.alchemy.com/v2',
    apiEndpoint: DIA_API_ENDPOINTS.mainnet,
  },
  bsc: {
    defaultRpcUrl: 'https://bsc-dataseed.binance.org',
    apiEndpoint: DIA_API_ENDPOINTS.mainnet,
  },
  fantom: {
    defaultRpcUrl: '',
    apiEndpoint: '',
  },
  celo: {
    defaultRpcUrl: '',
    apiEndpoint: '',
  },
  gnosis: {
    defaultRpcUrl: '',
    apiEndpoint: '',
  },
  linea: {
    defaultRpcUrl: '',
    apiEndpoint: '',
  },
  scroll: {
    defaultRpcUrl: '',
    apiEndpoint: '',
  },
  mantle: {
    defaultRpcUrl: '',
    apiEndpoint: '',
  },
  mode: {
    defaultRpcUrl: '',
    apiEndpoint: '',
  },
  blast: {
    defaultRpcUrl: '',
    apiEndpoint: '',
  },
  solana: {
    defaultRpcUrl: '',
    apiEndpoint: '',
  },
  near: {
    defaultRpcUrl: '',
    apiEndpoint: '',
  },
  aptos: {
    defaultRpcUrl: '',
    apiEndpoint: '',
  },
  sui: {
    defaultRpcUrl: '',
    apiEndpoint: '',
  },
  polygonAmoy: {
    defaultRpcUrl: '',
    apiEndpoint: DIA_API_ENDPOINTS.testnet,
  },
  sepolia: {
    defaultRpcUrl: '',
    apiEndpoint: DIA_API_ENDPOINTS.testnet,
  },
  goerli: {
    defaultRpcUrl: '',
    apiEndpoint: DIA_API_ENDPOINTS.testnet,
  },
  mumbai: {
    defaultRpcUrl: '',
    apiEndpoint: DIA_API_ENDPOINTS.testnet,
  },
  local: {
    defaultRpcUrl: 'http://localhost:8545',
    apiEndpoint: '',
  },
};

// ============================================================================
// DIA Client Class
// ============================================================================

export class DIAClient {
  private chain: SupportedChain;
  private apiEndpoint: string;
  private apiKey?: string;

  constructor(chain: SupportedChain, options: { rpcUrl?: string; apiKey?: string } = {}) {
    this.chain = chain;
    this.apiKey = options.apiKey;

    const chainConfig = DIA_CHAIN_CONFIG[chain];
    if (!chainConfig || !chainConfig.apiEndpoint) {
      throw new Error(`Chain ${chain} not supported by DIA`);
    }

    this.apiEndpoint = chainConfig.apiEndpoint;
  }

  /**
   * 从 DIA API 获取价格数据
   */
  async fetchPriceFromAPI(asset: string): Promise<DIAPriceData | null> {
    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      // DIA API 使用资产名称而不是 symbol
      const response = await fetch(`${this.apiEndpoint}/assetQuotation/${asset}`, { headers });

      if (!response.ok) {
        throw new Error(`DIA API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data || !data.Price) {
        throw new Error('No price data returned from DIA API');
      }

      // 找到对应的 symbol
      const symbol =
        Object.keys(DIA_ASSETS).find((key) => DIA_ASSETS[key] === asset) || `${asset}/USD`;

      const decimals = 8; // DIA 默认使用 8 位小数
      const price = BigInt(Math.floor(data.Price * Math.pow(10, decimals)));
      const formattedPrice = data.Price;

      return {
        symbol,
        asset,
        price,
        formattedPrice,
        timestamp: data.Time
          ? Math.floor(new Date(data.Time).getTime() / 1000)
          : Math.floor(Date.now() / 1000),
        decimals,
        source: data.Source || 'dia-api',
        volume24h: data.Volume24h,
        marketCap: data.MarketCap,
      };
    } catch (error) {
      logger.error('Failed to fetch DIA price from API', {
        chain: this.chain,
        asset,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 批量获取多个价格
   */
  async fetchMultiplePrices(assets: string[]): Promise<Map<string, DIAPriceData>> {
    const prices = new Map<string, DIAPriceData>();

    // DIA API 通常不支持批量查询，需要逐个获取
    const promises = assets.map(async (asset) => {
      try {
        const priceData = await this.fetchPriceFromAPI(asset);
        if (priceData) {
          prices.set(asset, priceData);
        }
      } catch (error) {
        logger.error(`Failed to fetch DIA price for ${asset}`, {
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
      const asset = DIA_ASSETS[symbol];
      if (!asset) {
        logger.warn(`No DIA asset found for ${symbol}`);
        return null;
      }

      const priceData = await this.fetchPriceFromAPI(asset);
      if (!priceData) {
        return null;
      }

      return this.convertToUnifiedFeed(priceData);
    } catch (error) {
      logger.error(`Failed to get DIA price for ${symbol}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * 获取多个价格喂价
   */
  async getMultiplePricesBySymbols(symbols: string[]): Promise<UnifiedPriceFeed[]> {
    const feeds: UnifiedPriceFeed[] = [];

    const promises = symbols.map(async (symbol) => {
      try {
        const feed = await this.getPriceForSymbol(symbol);
        if (feed) {
          feeds.push(feed);
        }
      } catch (error) {
        logger.error(`Failed to get DIA price for ${symbol}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    await Promise.all(promises);
    return feeds;
  }

  /**
   * 获取所有可用价格喂价
   */
  async getAllAvailableFeeds(): Promise<UnifiedPriceFeed[]> {
    const symbols = Object.keys(DIA_ASSETS);
    return this.getMultiplePricesBySymbols(symbols);
  }

  /**
   * 转换为统一价格喂价格式
   */
  private convertToUnifiedFeed(priceData: DIAPriceData): UnifiedPriceFeed {
    const [baseAsset, quoteAsset] = priceData.symbol.split('/');
    const timestamp = new Date(priceData.timestamp * 1000);
    const now = new Date();
    const stalenessSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);

    // DIA 数据通常 < 300秒（5分钟）
    const isStale = stalenessSeconds > 300;

    return {
      id: `dia-${this.chain}-${priceData.symbol}-${priceData.timestamp}`,
      instanceId: `dia-${this.chain}`,
      protocol: 'dia',
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
      const asset = DIA_ASSETS[symbol];
      if (!asset) {
        return {
          healthy: false,
          lastUpdate: new Date(0),
          stalenessSeconds: Infinity,
          issues: [`No asset found for ${symbol}`],
        };
      }

      const priceData = await this.fetchPriceFromAPI(asset);
      if (!priceData) {
        return {
          healthy: false,
          lastUpdate: new Date(0),
          stalenessSeconds: Infinity,
          issues: [`No price data for ${symbol}`],
        };
      }

      const lastUpdate = new Date(priceData.timestamp * 1000);
      const now = new Date();
      const stalenessSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);

      // 检查数据新鲜度（DIA 应该 < 300秒）
      if (stalenessSeconds > 300) {
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
   * 获取所有可用资产列表
   */
  async getAvailableAssets(): Promise<string[]> {
    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.apiEndpoint}/assets`, { headers });

      if (!response.ok) {
        throw new Error(`DIA API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch DIA assets', {
        chain: this.chain,
        error: error instanceof Error ? error.message : String(error),
      });
      return Object.values(DIA_ASSETS);
    }
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createDIAClient(
  chain: SupportedChain,
  options?: { rpcUrl?: string; apiKey?: string },
): DIAClient {
  return new DIAClient(chain, options);
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取支持的 DIA 链列表
 */
export function getSupportedDIAChains(): SupportedChain[] {
  return Object.entries(DIA_CHAIN_CONFIG)
    .filter(([_, config]) => config.apiEndpoint !== '')
    .map(([chain]) => chain as SupportedChain);
}

/**
 * 获取所有可用的价格喂价符号
 */
export function getAvailableDIASymbols(): string[] {
  return Object.keys(DIA_ASSETS);
}

/**
 * 检查链是否支持 DIA
 */
export function isChainSupportedByDIA(chain: SupportedChain): boolean {
  return DIA_CHAIN_CONFIG[chain]?.apiEndpoint !== '';
}

/**
 * 获取资产名称
 */
export function getDIAsset(symbol: string): string | undefined {
  return DIA_ASSETS[symbol];
}
