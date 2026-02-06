/**
 * DIA Oracle Client - DIA 预言机客户端
 *
 * 基于新的核心架构实现的 DIA 协议客户端
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
// DIA API 配置
// ============================================================================

const DIA_API_BASE = 'https://api.diadata.org/v1';

// ============================================================================
// 支持的资产
// ============================================================================

const DIA_SUPPORTED_ASSETS: Record<SupportedChain, string[]> = {
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
// DIA 特定类型
// ============================================================================

interface DIAPriceResponse {
  Price: number;
  Time: string;
  Source: string;
}

// ============================================================================
// DIA 客户端实现
// ============================================================================

export class DIAOracleClient extends BaseOracleClient {
  readonly protocol: OracleProtocol = 'dia';
  readonly chain: SupportedChain;
  private readonly apiEndpoint: string;

  constructor(config: OracleClientConfig) {
    super(config);
    this.chain = config.chain;
    this.apiEndpoint = config.apiEndpoint || DIA_API_BASE;
  }

  // ============================================================================
  // 抽象方法实现
  // ============================================================================

  async fetchPrice(symbol: string): Promise<UnifiedPriceFeed | null> {
    const asset = symbol.split('/')[0];
    if (!asset) {
      this.logger.warn('Invalid symbol format for DIA', { symbol });
      return null;
    }

    const supportedAssets = DIA_SUPPORTED_ASSETS[this.chain];
    if (!supportedAssets.includes(asset)) {
      this.logger.warn('Asset not supported by DIA', { asset, chain: this.chain });
      return null;
    }

    try {
      const priceData = await this.fetchPriceFromDIA(asset);
      return this.transformPriceData(priceData, symbol);
    } catch (error) {
      throw new PriceFetchError(
        `Failed to fetch DIA price: ${error instanceof Error ? error.message : String(error)}`,
        this.protocol,
        this.chain,
        symbol,
        error,
      );
    }
  }

  async fetchAllFeeds(): Promise<UnifiedPriceFeed[]> {
    const assets = DIA_SUPPORTED_ASSETS[this.chain];
    const results: UnifiedPriceFeed[] = [];

    for (const asset of assets) {
      try {
        const symbol = `${asset}/USD`;
        const price = await this.fetchPrice(symbol);
        if (price) {
          results.push(price);
        }
      } catch (error) {
        this.logger.error('Failed to fetch price', { asset, error });
      }
    }

    return results;
  }

  async checkHealth(): Promise<Omit<OracleHealthStatus, 'lastUpdate'>> {
    const startTime = Date.now();

    const assets = DIA_SUPPORTED_ASSETS[this.chain];
    if (assets.length === 0) {
      return {
        status: 'unhealthy',
        issues: ['No assets configured for this chain'],
      };
    }

    try {
      await this.fetchPriceFromDIA(assets[0]!);
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

  private async fetchPriceFromDIA(asset: string): Promise<DIAPriceResponse> {
    const response = await fetch(`${this.apiEndpoint}/quotation/${asset}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`DIA API error: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as DIAPriceResponse;
  }

  private transformPriceData(data: DIAPriceResponse, symbol: string): UnifiedPriceFeed {
    const timestamp = new Date(data.Time).getTime();
    const stalenessSeconds = Math.floor((Date.now() - timestamp) / 1000);
    const isStale = stalenessSeconds > this.config.stalenessThreshold;

    const [baseAsset, quoteAsset] = symbol.split('/');

    return {
      id: `dia-${this.chain}-${symbol}-${timestamp}`,
      symbol,
      protocol: this.protocol,
      chain: this.chain,
      price: data.Price,
      priceRaw: BigInt(Math.floor(data.Price * 1e18)),
      timestamp,
      confidence: 0.95,
      source: 'dia',
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

export function createDIAClient(
  chain: SupportedChain = 'ethereum',
  config?: Partial<Omit<OracleClientConfig, 'protocol' | 'chain'>>,
): DIAOracleClient {
  return new DIAOracleClient({
    protocol: 'dia',
    chain,
    ...config,
  });
}

// ============================================================================
// 工具函数
// ============================================================================

export function getSupportedDIAAssets(chain: SupportedChain): string[] {
  return DIA_SUPPORTED_ASSETS[chain] || [];
}

export function getAvailableDIASymbols(chain: SupportedChain): string[] {
  const assets = DIA_SUPPORTED_ASSETS[chain] || [];
  return assets.map((asset) => `${asset}/USD`);
}

export function isChainSupportedByDIA(chain: SupportedChain): boolean {
  return (DIA_SUPPORTED_ASSETS[chain] || []).length > 0;
}
