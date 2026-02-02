/**
 * API3 Oracle Client
 *
 * API3 预言机客户端
 * API3 是一个第一方预言机网络，提供 dAPI 和 Airnode 服务
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

export interface Api3Config extends ProtocolConfig {
  chain: SupportedChain;
  rpcUrl: string;
  api3ServerV1?: string; // API3 Server V1 合约地址
  dapiNames?: string[]; // dAPI 名称列表
}

export interface Api3PriceData {
  value: string;
  timestamp: number;
}

// ============================================================================
// API3 客户端
// ============================================================================

export class Api3Client {
  private config: Api3Config;

  constructor(config: Api3Config) {
    this.config = {
      ...config,
      api3ServerV1: config.api3ServerV1 || this.getDefaultServerAddress(config.chain),
    };
    logger.info('Api3Client initialized', { chain: config.chain });
  }

  private getDefaultServerAddress(chain: SupportedChain): string {
    const addresses: Record<SupportedChain, string> = {
      ethereum: '0x709944a48cAf3FC80500F9B5E38A3dD3e2b4Cf5A',
      polygon: '0x709944a48cAf3FC80500F9B5E38A3dD3e2b4Cf5A',
      arbitrum: '0x709944a48cAf3FC80500F9B5E38A3dD3e2b4Cf5A',
      optimism: '0x709944a48cAf3FC80500F9B5E38A3dD3e2b4Cf5A',
      base: '0x709944a48cAf3FC80500F9B5E38A3dD3e2b4Cf5A',
      avalanche: '0x709944a48cAf3FC80500F9B5E38A3dD3e2b4Cf5A',
      bsc: '0x709944a48cAf3FC80500F9B5E38A3dD3e2b4Cf5A',
      fantom: '0x709944a48cAf3FC80500F9B5E38A3dD3e2b4Cf5A',
      celo: '0x709944a48cAf3FC80500F9B5E38A3dD3e2b4Cf5A',
      gnosis: '0x709944a48cAf3FC80500F9B5E38A3dD3e2b4Cf5A',
      linea: '0x709944a48cAf3FC80500F9B5E38A3dD3e2b4Cf5A',
      scroll: '0x709944a48cAf3FC80500F9B5E38A3dD3e2b4Cf5A',
      mantle: '0x709944a48cAf3FC80500F9B5E38A3dD3e2b4Cf5A',
      mode: '0x709944a48cAf3FC80500F9B5E38A3dD3e2b4Cf5A',
      blast: '0x709944a48cAf3FC80500F9B5E38A3dD3e2b4Cf5A',
      solana: '0x709944a48cAf3FC80500F9B5E38A3dD3e2b4Cf5A',
      near: '0x709944a48cAf3FC80500F9B5E38A3dD3e2b4Cf5A',
      aptos: '0x709944a48cAf3FC80500F9B5E38A3dD3e2b4Cf5A',
      sui: '0x709944a48cAf3FC80500F9B5E38A3dD3e2b4Cf5A',
      polygonAmoy: '0x709944a48cAf3FC80500F9B5E38A3dD3e2b4Cf5A',
      sepolia: '0x709944a48cAf3FC80500F9B5E38A3dD3e2b4Cf5A',
      goerli: '0x709944a48cAf3FC80500F9B5E38A3dD3e2b4Cf5A',
      mumbai: '0x709944a48cAf3FC80500F9B5E38A3dD3e2b4Cf5A',
      local: '0x709944a48cAf3FC80500F9B5E38A3dD3e2b4Cf5A',
    };
    return addresses[chain] ?? addresses.ethereum;
  }

  // ============================================================================
  // 价格 Feed 方法
  // ============================================================================

  async getPrice(dapiName: string): Promise<UnifiedPriceFeed> {
    try {
      const priceData = await this.fetchPriceFromApi3(dapiName);
      return this.parsePriceData(priceData, dapiName);
    } catch (error) {
      logger.error('Failed to get API3 price', { error, dapiName });
      throw error;
    }
  }

  async getMultiplePrices(dapiNames: string[]): Promise<UnifiedPriceFeed[]> {
    const results: UnifiedPriceFeed[] = [];

    for (const dapiName of dapiNames) {
      try {
        const price = await this.getPrice(dapiName);
        results.push(price);
      } catch (error) {
        logger.error('Failed to get price for dAPI', { error, dapiName });
      }
    }

    return results;
  }

  private async fetchPriceFromApi3(dapiName: string): Promise<Api3PriceData> {
    // 使用 API3 的 API 获取价格数据
    const endpoint = `https://api.api3.org/api/v1/dapi/${encodeURIComponent(dapiName)}`;

    try {
      const response = await fetch(endpoint, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API3 API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.value || !data.timestamp) {
        throw new Error(`No price data available for ${dapiName}`);
      }

      return {
        value: data.value,
        timestamp: data.timestamp,
      };
    } catch (error) {
      logger.error('API3 API request failed', { error, dapiName });
      throw error;
    }
  }

  private parsePriceData(data: Api3PriceData, dapiName: string): UnifiedPriceFeed {
    const price = parseFloat(data.value) / 1e18; // API3 使用 18 位小数
    const timestampDate = new Date(data.timestamp * 1000);
    const now = new Date();
    const stalenessThreshold = 300; // 5 分钟
    const isStale = (now.getTime() - timestampDate.getTime()) / 1000 > stalenessThreshold;

    // 解析 dAPI 名称 (例如: "ETH/USD" -> base: "ETH", quote: "USD")
    const [baseAsset, quoteAsset] = dapiName.split('/');

    return {
      id: `api3-${this.config.chain}-${dapiName}-${data.timestamp}`,
      instanceId: this.config.api3ServerV1 || '',
      protocol: 'api3' as OracleProtocol,
      chain: this.config.chain,
      symbol: dapiName,
      baseAsset: baseAsset || dapiName,
      quoteAsset: quoteAsset || 'USD',
      price,
      priceRaw: data.value,
      decimals: 18,
      timestamp: timestampDate.toISOString(),
      blockNumber: undefined,
      confidence: 0.95,
      sources: 1,
      isStale,
      stalenessSeconds: isStale ? Math.floor((now.getTime() - timestampDate.getTime()) / 1000) : 0,
      txHash: undefined,
      logIndex: undefined,
    };
  }

  // ============================================================================
  // 配置方法
  // ============================================================================

  getConfig(): Api3Config {
    return { ...this.config };
  }

  updateConfig(updates: Partial<Api3Config>): void {
    this.config = { ...this.config, ...updates };
    logger.info('Api3Client config updated', { chain: this.config.chain });
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
      customData: true, // 支持自定义数据源
    };
  }

  // ============================================================================
  // 健康检查
  // ============================================================================

  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const start = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch('https://api.api3.org/api/v1/dapi/ETH/USD', {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const latency = Date.now() - start;
      return { healthy: response.ok, latency };
    } catch (error) {
      clearTimeout(timeoutId);
      const latency = Date.now() - start;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { healthy: false, latency, error: errorMsg };
    }
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createApi3Client(config: Api3Config): Api3Client {
  return new Api3Client(config);
}

// 为了保持向后兼容的别名
export { createApi3Client as createAPI3Client };

/**
 * 获取可用的 API3 dAPI 符号列表
 */
export function getAvailableApi3Symbols(): string[] {
  // API3 支持的常用 dAPI 符号
  return [
    'ETH/USD',
    'BTC/USD',
    'LINK/USD',
    'MATIC/USD',
    'AVAX/USD',
    'BNB/USD',
    'UNI/USD',
    'AAVE/USD',
    'COMP/USD',
    'MKR/USD',
    'SNX/USD',
    'YFI/USD',
    'CRV/USD',
    'SUSHI/USD',
    '1INCH/USD',
  ];
}

// 为了保持向后兼容的别名
export { getAvailableApi3Symbols as getAvailableAPI3Symbols };
