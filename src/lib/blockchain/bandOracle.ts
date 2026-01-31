/**
 * Band Protocol Oracle Client
 *
 * Band Protocol 预言机客户端
 * Band 是一个跨链数据预言机平台，支持多种数据源
 */

import { logger } from '@/lib/logger';
import type {
  OracleProtocol,
  SupportedChain,
  UnifiedPriceFeed,
} from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// 类型定义
// ============================================================================

interface ProtocolConfig {
  chain: SupportedChain;
  rpcUrl: string;
}

interface ProtocolCapabilities {
  priceFeeds: boolean;
  assertions: boolean;
  disputes: boolean;
  vrf: boolean;
  customData: boolean;
}

export interface BandConfig extends ProtocolConfig {
  chain: SupportedChain;
  rpcUrl: string;
  bandEndpoint?: string; // BandChain API endpoint
  bandChainId?: string; // BandChain ID
  dataSourceIds?: number[]; // 数据源 ID 列表
  minCount?: number; // 最小数据源数量
  askCount?: number; // 请求数据源数量
}

export interface BandPriceData {
  symbol: string;
  rate: number;
  multiplier: number;
  lastUpdate: string;
  blockHeight: number;
}

export interface BandOracleResponse {
  requestId: string;
  oracleScriptId: number;
  blockHeight: number;
  result: string;
  resolveTime: string;
  minCount: number;
  askCount: number;
}

// ============================================================================
// Band Protocol 客户端
// ============================================================================

export class BandClient {
  private config: BandConfig;

  constructor(config: BandConfig) {
    this.config = {
      ...config,
      bandEndpoint: config.bandEndpoint || 'https://laozi1.bandchain.org/api',
      bandChainId: config.bandChainId || 'laozi-mainnet',
      minCount: config.minCount || 3,
      askCount: config.askCount || 4,
    };
    logger.info('BandClient initialized', { chain: config.chain });
  }

  // ============================================================================
  // 价格 Feed 方法
  // ============================================================================

  async getPrice(symbol: string): Promise<UnifiedPriceFeed> {
    try {
      const priceData = await this.fetchPriceFromBand(symbol);
      return this.parsePriceData(priceData, symbol);
    } catch (error) {
      logger.error('Failed to get Band price', { error, symbol });
      throw error;
    }
  }

  async getMultiplePrices(symbols: string[]): Promise<UnifiedPriceFeed[]> {
    const results: UnifiedPriceFeed[] = [];

    for (const symbol of symbols) {
      try {
        const price = await this.getPrice(symbol);
        results.push(price);
      } catch (error) {
        logger.error('Failed to get price for symbol', { error, symbol });
      }
    }

    return results;
  }

  private async fetchPriceFromBand(symbol: string): Promise<BandPriceData> {
    // Band Protocol API 调用
    const endpoint = `${this.config.bandEndpoint}/oracle/v1/request_prices`;

    try {
      const response = await fetch(
        `${endpoint}?symbols=${encodeURIComponent(symbol)}&min_count=${this.config.minCount}&ask_count=${this.config.askCount}`,
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Band API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.price_results || data.price_results.length === 0) {
        throw new Error(`No price data available for ${symbol}`);
      }

      const result = data.price_results[0];
      return {
        symbol: result.symbol,
        rate: parseFloat(result.rate),
        multiplier: parseFloat(result.multiplier),
        lastUpdate: result.last_update,
        blockHeight: parseInt(result.block_height, 10),
      };
    } catch (error) {
      logger.error('Band API request failed', { error, symbol });
      throw error;
    }
  }

  private parsePriceData(data: BandPriceData, symbol: string): UnifiedPriceFeed {
    const price = data.rate / data.multiplier;
    const timestampDate = new Date(data.lastUpdate);
    const now = new Date();
    const stalenessThreshold = 300; // 5 分钟
    const isStale = (now.getTime() - timestampDate.getTime()) / 1000 > stalenessThreshold;

    return {
      id: `band-${this.config.chain}-${symbol}-${data.blockHeight}`,
      instanceId: this.config.bandEndpoint || '',
      protocol: 'band' as OracleProtocol,
      chain: this.config.chain,
      symbol,
      baseAsset: symbol.split('/')[0] || symbol,
      quoteAsset: symbol.split('/')[1] || 'USD',
      price,
      priceRaw: data.rate.toString(),
      decimals: 18,
      timestamp: timestampDate.toISOString(),
      blockNumber: data.blockHeight,
      confidence: 0.9,
      sources: this.config.askCount,
      isStale,
      stalenessSeconds: isStale ? Math.floor((now.getTime() - timestampDate.getTime()) / 1000) : 0,
      txHash: undefined,
      logIndex: undefined,
    };
  }

  // ============================================================================
  // 配置方法
  // ============================================================================

  getConfig(): BandConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<BandConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('BandClient config updated', { chain: this.config.chain });
  }

  // ============================================================================
  // 协议能力
  // ============================================================================

  getCapabilities(): ProtocolCapabilities {
    return {
      priceFeeds: true,
      assertions: false,
      disputes: false,
      vrf: false,
      customData: true,
    };
  }

  // ============================================================================
  // 健康检查
  // ============================================================================

  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();
    try {
      const response = await fetch(
        `${this.config.bandEndpoint}/oracle/v1/request_prices?symbols=BTC&min_count=3&ask_count=4`,
        {
          headers: { Accept: 'application/json' },
        },
      );
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

export function createBandClient(config: BandConfig): BandClient {
  return new BandClient(config);
}
