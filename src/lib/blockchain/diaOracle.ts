/**
 * DIA Oracle Client
 *
 * DIA 预言机集成模块
 * 支持多链价格数据获取
 */

import { logger } from '@/lib/logger';
import type {
  OracleProtocol,
  SupportedChain,
  UnifiedPriceFeed,
  DIAProtocolConfig,
} from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// DIA API 配置
// ============================================================================

const DIA_API_BASE = 'https://api.diadata.org/v1';

// ============================================================================
// 支持的资产
// ============================================================================

export const DIA_SUPPORTED_ASSETS: Record<SupportedChain, string[]> = {
  ethereum: ['ETH', 'BTC', 'USDC', 'USDT', 'DAI', 'LINK', 'UNI', 'AAVE', 'MKR', 'SNX'],
  polygon: ['MATIC', 'ETH', 'BTC', 'USDC', 'USDT', 'DAI'],
  arbitrum: ['ETH', 'BTC', 'USDC', 'USDT', 'DAI', 'ARB'],
  optimism: ['ETH', 'BTC', 'USDC', 'USDT', 'DAI', 'OP'],
  base: ['ETH', 'BTC', 'USDC', 'USDT'],
  avalanche: ['AVAX', 'ETH', 'BTC', 'USDC', 'USDT'],
  bsc: ['BNB', 'ETH', 'BTC', 'USDC', 'USDT', 'CAKE'],
  fantom: ['FTM', 'ETH', 'BTC', 'USDC', 'USDT'],
  // 其他链暂不支持
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
// DIA 客户端
// ============================================================================

export class DIAClient {
  private chain: SupportedChain;

  private apiEndpoint: string;

  constructor(chain: SupportedChain, _rpcUrl: string, config: DIAProtocolConfig = {}) {
    this.chain = chain;
    this.apiEndpoint = config.apiEndpoint || DIA_API_BASE;
  }

  /**
   * 获取最新价格
   */
  async getPrice(asset: string): Promise<{
    symbol: string;
    price: number;
    timestamp: string;
    source: string;
  }> {
    try {
      const response = await fetch(`${this.apiEndpoint}/quotation/${asset}`, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`DIA API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        symbol: `${asset}/USD`,
        price: parseFloat(data.Price),
        timestamp: new Date(data.Time).toISOString(),
        source: data.Source,
      };
    } catch (error) {
      logger.error('Failed to get DIA price', {
        chain: this.chain,
        asset,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 获取指定交易对的价格
   */
  async getPriceForSymbol(symbol: string): Promise<UnifiedPriceFeed | null> {
    try {
      const asset = symbol.split('/')[0];
      if (!asset) {
        logger.warn(`Invalid symbol format for DIA: ${symbol}`);
        return null;
      }

      const priceData = await this.getPrice(asset);
      return this.parsePriceData(priceData, symbol);
    } catch (error) {
      logger.error(`Failed to get DIA price for ${symbol}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * 获取多个价格
   */
  async getMultiplePrices(symbols: string[]): Promise<UnifiedPriceFeed[]> {
    const results: UnifiedPriceFeed[] = [];

    for (const symbol of symbols) {
      try {
        const price = await this.getPriceForSymbol(symbol);
        if (price) {
          results.push(price);
        }
      } catch (error) {
        logger.error(`Failed to get DIA price for ${symbol}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * 获取所有可用价格
   */
  async getAllAvailableFeeds(): Promise<UnifiedPriceFeed[]> {
    const assets = DIA_SUPPORTED_ASSETS[this.chain] || [];
    const symbols = assets.map((asset) => `${asset}/USD`);
    return this.getMultiplePrices(symbols);
  }

  /**
   * 解析价格数据
   */
  private parsePriceData(
    data: {
      symbol: string;
      price: number;
      timestamp: string;
      source: string;
    },
    symbol: string,
  ): UnifiedPriceFeed {
    const timestampDate = new Date(data.timestamp);
    const now = new Date();
    const stalenessThreshold = 300; // 5 分钟
    const isStale = (now.getTime() - timestampDate.getTime()) / 1000 > stalenessThreshold;

    const [baseAsset, quoteAsset] = symbol.split('/');

    return {
      id: `dia-${this.chain}-${symbol}-${timestampDate.getTime()}`,
      instanceId: `dia-${this.chain}`,
      protocol: 'dia' as OracleProtocol,
      chain: this.chain,
      symbol,
      baseAsset: baseAsset || 'UNKNOWN',
      quoteAsset: quoteAsset || 'USD',
      price: data.price,
      priceRaw: Math.floor(data.price * 1e18).toString(),
      decimals: 18,
      timestamp: data.timestamp,
      confidence: 0.95,
      sources: [data.source],
      isStale,
      stalenessSeconds: isStale ? Math.floor((now.getTime() - timestampDate.getTime()) / 1000) : 0,
    };
  }

  /**
   * 获取当前区块号（DIA 使用时间戳作为替代）
   */
  async getBlockNumber(): Promise<bigint> {
    return BigInt(Math.floor(Date.now() / 1000));
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.apiEndpoint}/quotation/BTC`, {
        headers: { Accept: 'application/json' },
      });
      const latency = Date.now() - start;
      return { healthy: response.ok, latency };
    } catch {
      return { healthy: false, latency: Date.now() - start };
    }
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createDIAClient(
  chain: SupportedChain,
  rpcUrl: string,
  config?: DIAProtocolConfig,
): DIAClient {
  return new DIAClient(chain, rpcUrl, config);
}

/**
 * 获取支持的 DIA 链列表
 */
export function getSupportedDIAChains(): SupportedChain[] {
  return Object.entries(DIA_SUPPORTED_ASSETS)
    .filter(([_, assets]) => assets.length > 0)
    .map(([chain]) => chain as SupportedChain);
}

/**
 * 获取指定链的可用资产列表
 */
export function getAvailableDIAAssets(chain: SupportedChain): string[] {
  return DIA_SUPPORTED_ASSETS[chain] || [];
}

/**
 * 获取所有可用价格符号
 */
export function getAvailableDIASymbols(chain: SupportedChain): string[] {
  const assets = DIA_SUPPORTED_ASSETS[chain] || [];
  return assets.map((asset) => `${asset}/USD`);
}

/**
 * 检查链是否支持 DIA
 */
export function isChainSupportedByDIA(chain: SupportedChain): boolean {
  return (DIA_SUPPORTED_ASSETS[chain] || []).length > 0;
}
