/**
 * Band Oracle Client - Band Protocol 预言机客户端
 *
 * 基于新的核心架构实现的 Band Protocol 客户端
 * Band 是一个跨链数据预言机平台
 */

import type {
  OracleProtocol,
  SupportedChain,
  UnifiedPriceFeed,
} from '@/lib/types/unifiedOracleTypes';
import {
  BaseOracleClient,
  type OracleClientConfig,
  type OracleHealthStatus,
  type OracleClientCapabilities,
} from '@/lib/blockchain/core';
import { PriceFetchError } from '@/lib/blockchain/core/types';

// ============================================================================
// Band API 配置
// ============================================================================

const BAND_API_BASE = 'https://laozi1.bandchain.org/api';

// ============================================================================
// 支持的资产
// ============================================================================

const BAND_SUPPORTED_SYMBOLS: Record<SupportedChain, string[]> = {
  ethereum: ['ETH/USD', 'BTC/USD', 'LINK/USD', 'UNI/USD', 'AAVE/USD', 'SNX/USD'],
  polygon: ['MATIC/USD', 'ETH/USD', 'BTC/USD'],
  arbitrum: ['ETH/USD', 'BTC/USD', 'ARB/USD'],
  optimism: ['ETH/USD', 'BTC/USD', 'OP/USD'],
  base: ['ETH/USD', 'BTC/USD'],
  avalanche: ['AVAX/USD', 'ETH/USD', 'BTC/USD'],
  bsc: ['BNB/USD', 'ETH/USD', 'BTC/USD'],
  fantom: ['FTM/USD', 'ETH/USD', 'BTC/USD'],
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
// Band 特定类型
// ============================================================================

interface BandPriceResult {
  symbol: string;
  rate: string;
  multiplier: string;
  last_update: string;
  block_height: string;
}

interface BandApiResponse {
  price_results: BandPriceResult[];
}

// ============================================================================
// Band 客户端实现
// ============================================================================

export class BandOracleClient extends BaseOracleClient {
  readonly protocol: OracleProtocol = 'band';
  readonly chain: SupportedChain;
  private readonly apiEndpoint: string;
  private readonly minCount: number;
  private readonly askCount: number;

  constructor(config: OracleClientConfig) {
    super(config);
    this.chain = config.chain;
    this.apiEndpoint = config.apiEndpoint || BAND_API_BASE;
    this.minCount = config.minCount || 3;
    this.askCount = config.askCount || 4;
  }

  // ============================================================================
  // 抽象方法实现
  // ============================================================================

  async fetchPrice(symbol: string): Promise<UnifiedPriceFeed | null> {
    const supportedSymbols = BAND_SUPPORTED_SYMBOLS[this.chain];
    if (!supportedSymbols.includes(symbol)) {
      this.logger.warn('Symbol not supported by Band', { symbol, chain: this.chain });
      return null;
    }

    try {
      const priceData = await this.fetchPriceFromBand(symbol);
      return this.transformPriceData(priceData, symbol);
    } catch (error) {
      throw new PriceFetchError(
        `Failed to fetch Band price: ${error instanceof Error ? error.message : String(error)}`,
        this.protocol,
        this.chain,
        symbol,
        error,
      );
    }
  }

  async fetchAllFeeds(): Promise<UnifiedPriceFeed[]> {
    const symbols = BAND_SUPPORTED_SYMBOLS[this.chain];
    const results: UnifiedPriceFeed[] = [];

    for (const symbol of symbols) {
      try {
        const price = await this.fetchPrice(symbol);
        if (price) {
          results.push(price);
        }
      } catch (error) {
        this.logger.error('Failed to fetch price', { symbol, error });
      }
    }

    return results;
  }

  async checkHealth(): Promise<Omit<OracleHealthStatus, 'lastUpdate'>> {
    const startTime = Date.now();

    const symbols = BAND_SUPPORTED_SYMBOLS[this.chain];
    if (symbols.length === 0) {
      return {
        status: 'unhealthy',
        issues: ['No symbols configured for this chain'],
      };
    }

    try {
      // 尝试获取第一个资产的价格作为健康检查
      await this.fetchPriceFromBand(symbols[0]!);
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        issues: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  getCapabilities(): OracleClientCapabilities {
    return {
      priceFeeds: true,
      assertions: false,
      disputes: false,
      vrf: false,
      customData: true,
      batchQueries: false,
      websocket: false,
    };
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  private async fetchPriceFromBand(symbol: string): Promise<BandPriceResult> {
    const endpoint = `${this.apiEndpoint}/oracle/v1/request_prices`;

    const response = await fetch(
      `${endpoint}?symbols=${encodeURIComponent(symbol)}&min_count=${this.minCount}&ask_count=${this.askCount}`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Band API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as BandApiResponse;

    if (!data.price_results || data.price_results.length === 0) {
      throw new Error(`No price data available for ${symbol}`);
    }

    return data.price_results[0]!;
  }

  private transformPriceData(data: BandPriceResult, symbol: string): UnifiedPriceFeed {
    const rate = parseFloat(data.rate);
    const multiplier = parseFloat(data.multiplier);
    const price = rate / multiplier;
    const timestamp = new Date(data.last_update).getTime();
    const stalenessSeconds = Math.floor((Date.now() - timestamp) / 1000);
    const isStale = stalenessSeconds > this.config.stalenessThreshold;

    const [baseAsset, quoteAsset] = symbol.split('/');

    return {
      id: `band-${this.chain}-${symbol}-${data.block_height}`,
      symbol,
      protocol: this.protocol,
      chain: this.chain,
      price,
      priceRaw: BigInt(Math.floor(price * 1e18)),
      timestamp,
      confidence: 0.9, // Band 默认置信度
      source: 'band',
      decimals: 18,
      isStale,
      stalenessSeconds: isStale ? stalenessSeconds : 0,
      baseAsset: baseAsset || 'UNKNOWN',
      quoteAsset: quoteAsset || 'USD',
    };
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createBandClient(
  chain: SupportedChain = 'ethereum',
  config?: Partial<Omit<OracleClientConfig, 'protocol' | 'chain'>>,
): BandOracleClient {
  return new BandOracleClient({
    protocol: 'band',
    chain,
    ...config,
  });
}

// ============================================================================
// 工具函数
// ============================================================================

export function getSupportedBandSymbols(chain: SupportedChain): string[] {
  return BAND_SUPPORTED_SYMBOLS[chain] || [];
}

export function isSymbolSupportedByBand(chain: SupportedChain, symbol: string): boolean {
  return BAND_SUPPORTED_SYMBOLS[chain]?.includes(symbol) || false;
}
