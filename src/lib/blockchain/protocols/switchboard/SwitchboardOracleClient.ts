/**
 * Switchboard Oracle Client - Switchboard 预言机客户端
 *
 * 基于新的核心架构实现的 Switchboard 协议客户端
 * 支持 Solana 和 EVM 链的数据获取
 */

import {
  BaseOracleClient,
  type OracleClientConfig,
  type OracleHealthStatus,
  type OracleClientCapabilities,
} from '@/lib/blockchain/core';
import { PriceFetchError } from '@/lib/blockchain/core/types';
import type {
  OracleProtocol,
  SupportedChain,
  UnifiedPriceFeed,
} from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// Switchboard API 配置
// ============================================================================

const SWITCHBOARD_API_BASE = 'https://api.switchboard.xyz';

// ============================================================================
// 支持的链和资产
// ============================================================================

const SWITCHBOARD_SUPPORTED_SYMBOLS: Record<SupportedChain, string[]> = {
  solana: ['SOL/USD', 'BTC/USD', 'ETH/USD', 'USDC/USD', 'USDT/USD'],
  ethereum: ['ETH/USD', 'BTC/USD', 'LINK/USD'],
  polygon: ['MATIC/USD', 'ETH/USD', 'BTC/USD'],
  arbitrum: ['ETH/USD', 'BTC/USD', 'ARB/USD'],
  optimism: ['ETH/USD', 'BTC/USD', 'OP/USD'],
  base: ['ETH/USD', 'BTC/USD'],
  avalanche: ['AVAX/USD', 'ETH/USD', 'BTC/USD'],
  // 其他链暂不支持
  bsc: [],
  fantom: [],
  celo: [],
  gnosis: [],
  linea: [],
  scroll: [],
  mantle: [],
  mode: [],
  blast: [],
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
// Switchboard 特定类型
// ============================================================================

interface SwitchboardFeedResponse {
  id: string;
  name: string;
  value: string;
  valueBigInt: string;
  updatedAt: string;
  decimals: number;
}

// ============================================================================
// Switchboard 客户端实现
// ============================================================================

export class SwitchboardOracleClient extends BaseOracleClient {
  readonly protocol: OracleProtocol = 'switchboard';
  readonly chain: SupportedChain;
  private readonly apiEndpoint: string;

  constructor(config: OracleClientConfig) {
    super(config);
    this.chain = config.chain;
    this.apiEndpoint = config.apiEndpoint || SWITCHBOARD_API_BASE;
  }

  // ============================================================================
  // 抽象方法实现
  // ============================================================================

  async fetchPrice(symbol: string): Promise<UnifiedPriceFeed | null> {
    const supportedSymbols = SWITCHBOARD_SUPPORTED_SYMBOLS[this.chain];
    if (!supportedSymbols.includes(symbol)) {
      this.logger.warn('Symbol not supported by Switchboard', { symbol, chain: this.chain });
      return null;
    }

    try {
      const feedData = await this.fetchFeedFromSwitchboard(symbol);
      return this.transformPriceData(feedData, symbol);
    } catch (error) {
      throw new PriceFetchError(
        `Failed to fetch Switchboard price: ${error instanceof Error ? error.message : String(error)}`,
        this.protocol,
        this.chain,
        symbol,
        error,
      );
    }
  }

  async fetchAllFeeds(): Promise<UnifiedPriceFeed[]> {
    const symbols = SWITCHBOARD_SUPPORTED_SYMBOLS[this.chain];
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

    const symbols = SWITCHBOARD_SUPPORTED_SYMBOLS[this.chain];
    if (symbols.length === 0) {
      return {
        status: 'unhealthy',
        issues: ['No symbols configured for this chain'],
      };
    }

    try {
      await this.fetchFeedFromSwitchboard(symbols[0]!);
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
      vrf: true,
      customData: true,
      batchQueries: false,
      websocket: false,
    };
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  private async fetchFeedFromSwitchboard(symbol: string): Promise<SwitchboardFeedResponse> {
    const feedName = symbol.replace('/', '_');
    const response = await fetch(`${this.apiEndpoint}/v1/feeds/${this.chain}/${feedName}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Switchboard API error: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as SwitchboardFeedResponse;
  }

  private transformPriceData(data: SwitchboardFeedResponse, symbol: string): UnifiedPriceFeed {
    const price = parseFloat(data.value);
    const timestamp = new Date(data.updatedAt).getTime();
    const stalenessSeconds = Math.floor((Date.now() - timestamp) / 1000);
    const isStale = stalenessSeconds > this.config.stalenessThreshold;

    const [baseAsset, quoteAsset] = symbol.split('/');

    return {
      id: `switchboard-${this.chain}-${symbol}-${data.id}`,
      symbol,
      protocol: this.protocol,
      chain: this.chain,
      price,
      priceRaw: BigInt(data.valueBigInt),
      timestamp,
      confidence: 0.95,
      source: 'switchboard',
      decimals: data.decimals,
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

export function createSwitchboardClient(
  chain: SupportedChain = 'solana',
  config?: Partial<Omit<OracleClientConfig, 'protocol' | 'chain'>>,
): SwitchboardOracleClient {
  return new SwitchboardOracleClient({
    protocol: 'switchboard',
    chain,
    ...config,
  });
}

// ============================================================================
// 工具函数
// ============================================================================

export function getSupportedSwitchboardSymbols(chain: SupportedChain): string[] {
  return SWITCHBOARD_SUPPORTED_SYMBOLS[chain] || [];
}

export function isChainSupportedBySwitchboard(chain: SupportedChain): boolean {
  return (SWITCHBOARD_SUPPORTED_SYMBOLS[chain] || []).length > 0;
}
