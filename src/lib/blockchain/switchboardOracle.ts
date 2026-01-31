/**
 * Switchboard Oracle Client
 *
 * Switchboard 预言机客户端 - 支持 Solana 和 EVM 链
 * Switchboard 是一个去中心化的预言机网络，支持 VRF、价格 feeds 和自定义数据
 */

import { logger } from '@/lib/logger';
import type {
  OracleProtocol,
  SupportedChain,
  UnifiedPriceFeed,
} from '@/lib/types/unifiedOracleTypes';

// Local type definitions
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

type PriceUpdateCallback = (feed: UnifiedPriceFeed) => void;
type AssertionCallback = (assertion: unknown) => void;
type DisputeCallback = (dispute: unknown) => void;

// ============================================================================
// 类型定义
// ============================================================================

export interface SwitchboardConfig extends ProtocolConfig {
  chain: SupportedChain;
  rpcUrl: string;
  switchboardAddress?: string; // 聚合器地址
  queueAddress?: string; // Switchboard 队列地址
  vrfAddress?: string; // VRF 合约地址
  apiEndpoint?: string; // Switchboard API 端点
  apiKey?: string; // API 密钥
}

export interface SwitchboardPriceData {
  id: string;
  result: string;
  roundId: number;
  timestamp: number;
  blockNumber: number;
  minResponse: string;
  maxResponse: string;
  oracleKeys: string[];
  median: string;
  stdDeviation: string;
}

export interface SwitchboardVRFRequest {
  id: string;
  callbackAddress: string;
  callbackFunction: string;
  numWords: number;
  minConfirmations: number;
  createdAt: number;
  fulfilled: boolean;
  randomness?: string[];
}

export interface SwitchboardAggregator {
  address: string;
  name: string;
  feedHash: string;
  queueAddress: string;
  heartbeat: number;
  varianceThreshold: number;
  latestRound: number;
}

// ============================================================================
// 价格 Feed ID 映射
// ============================================================================

const SWITCHBOARD_FEED_IDS: Record<string, string> = {
  'SOL/USD': 'GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR',
  'BTC/USD': '8SXvChNYFhRq4EZuZvnhjrB3jJRQCuh4mtH4rFHTyP1e',
  'ETH/USD': 'HNStfhaSgP8fVHbPjtXWfEq5Q2NFWk7AQ5p7ZfUzAyD',
  'USDC/USD': 'Gnt27xtC473ZT2Mw5u8wZ68Z3gUESmVWbSFoFHcXf9F',
  'USDT/USD': 'HT2PLQBcG5EiCcNSaMHAjSgd9F98KpHNtG3JxCHyDpvz',
  'BONK/USD': '6qBqGAYmoZw2r4LmC6d1J1gLX4xH9z6V6Vt7QqQZ7J3t',
  'JTO/USD': '7yyFRrP1L3pK4v6tK8z7q8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8',
  'JUP/USD': '8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z',
  'RAY/USD': '9aA1bB2cC3dD4eE5fF6gG7hH8iI9jJ0kK1lL2mM3nN4o',
  'SRM/USD': '1bB2cC3dD4eE5fF6gG7hH8iI9jJ0kK1lL2mM3nN4oO5p',
  'MNGO/USD': '2cC3dD4eE5fF6gG7hH8iI9jJ0kK1lL2mM3nN4oO5pP6q',
  'ORCA/USD': '3dD4eE5fF6gG7hH8iI9jJ0kK1lL2mM3nN4oO5pP6qQ7r',
};

// ============================================================================
// Switchboard 客户端
// ============================================================================

export class SwitchboardClient {
  private config: SwitchboardConfig;
  private priceCallbacks: Set<PriceUpdateCallback> = new Set();
  private assertionCallbacks: Set<AssertionCallback> = new Set();
  private disputeCallbacks: Set<DisputeCallback> = new Set();
  private isMonitoring: boolean = false;
  private monitorInterval?: NodeJS.Timeout;

  constructor(config: SwitchboardConfig) {
    this.config = {
      ...config,
      switchboardAddress: config.switchboardAddress || this.getDefaultAddress(config.chain),
      apiEndpoint: config.apiEndpoint || 'https://api.switchboard.xyz',
    };
    logger.info('SwitchboardClient initialized', { chain: config.chain });
  }

  // ============================================================================
  // 配置方法
  // ============================================================================

  private getDefaultAddress(chain: SupportedChain): string {
    const addresses: Record<string, string> = {
      solana: 'SBv3i8J3jN7sQ7X9Y1Z2A3B4C5D6E7F8G9H0I1J2K3L',
      ethereum: '0x1234567890123456789012345678901234567890',
      arbitrum: '0x2345678901234567890123456789012345678901',
      optimism: '0x3456789012345678901234567890123456789012',
      base: '0x4567890123456789012345678901234567890123',
      avalanche: '0x5678901234567890123456789012345678901234',
      bsc: '0x6789012345678901234567890123456789012345',
      polygon: '0x7890123456789012345678901234567890123456',
    };
    return addresses[chain] || addresses.ethereum || '';
  }

  getConfig(): SwitchboardConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<SwitchboardConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('SwitchboardClient config updated', { chain: this.config.chain });
  }

  // ============================================================================
  // 价格 Feed 方法
  // ============================================================================

  async getLatestPrice(symbol: string): Promise<UnifiedPriceFeed> {
    const feedId = this.getFeedId(symbol);
    if (!feedId) {
      throw new Error(`Price feed ID not found for symbol: ${symbol}`);
    }

    try {
      // 调用 Switchboard API 获取价格
      const response = await fetch(
        `${this.config.apiEndpoint}/api/v1/aggregators/${feedId}/latest`
      );

      if (!response.ok) {
        throw new Error(`Switchboard API error: ${response.statusText}`);
      }

      const data: SwitchboardPriceData = await response.json();
      return this.parsePriceData(data, symbol);
    } catch (error) {
      logger.error('Failed to get Switchboard price', { error, symbol, feedId });
      throw error;
    }
  }

  async getMultiplePrices(symbols: string[]): Promise<UnifiedPriceFeed[]> {
    const promises = symbols.map((symbol) =>
      this.getLatestPrice(symbol).catch((error) => {
        logger.error(`Failed to get price for ${symbol}`, { error });
        return null;
      })
    );

    const results = await Promise.all(promises);
    return results.filter((price): price is UnifiedPriceFeed => price !== null);
  }

  async getHistoricalPrices(
    symbol: string,
    from: Date,
    to: Date
  ): Promise<UnifiedPriceFeed[]> {
    const feedId = this.getFeedId(symbol);
    if (!feedId) {
      throw new Error(`Price feed ID not found for symbol: ${symbol}`);
    }

    try {
      const response = await fetch(
        `${this.config.apiEndpoint}/api/v1/aggregators/${feedId}/history?` +
          `from=${from.toISOString()}&to=${to.toISOString()}`
      );

      if (!response.ok) {
        throw new Error(`Switchboard API error: ${response.statusText}`);
      }

      const data: SwitchboardPriceData[] = await response.json();
      return data.map((item) => this.parsePriceData(item, symbol));
    } catch (error) {
      logger.error('Failed to get historical prices', { error, symbol });
      throw error;
    }
  }

  private parsePriceData(data: SwitchboardPriceData, symbol: string): UnifiedPriceFeed {
    const price = Number(data.result) / 1e8; // Switchboard 使用 8 位小数
    const timestampDate = new Date(data.timestamp * 1000);
    const now = new Date();
    const stalenessThreshold = 300; // 5 分钟
    const isStale = (now.getTime() - timestampDate.getTime()) / 1000 > stalenessThreshold;

    return {
      id: `${this.config.chain}-${symbol}-${data.roundId}`,
      instanceId: this.config.switchboardAddress || '',
      protocol: 'switchboard' as OracleProtocol,
      chain: this.config.chain,
      symbol,
      baseAsset: symbol.split('/')[0] || symbol,
      quoteAsset: symbol.split('/')[1] || 'USD',
      price,
      priceRaw: data.result,
      decimals: 8,
      timestamp: timestampDate.toISOString(),
      blockNumber: data.blockNumber,
      confidence: 0.95,
      sources: data.oracleKeys,
      isStale,
      stalenessSeconds: isStale ? Math.floor((now.getTime() - timestampDate.getTime()) / 1000) : 0,
      txHash: undefined,
      logIndex: undefined,
    };
  }

  // ============================================================================
  // VRF 功能
  // ============================================================================

  async requestVRF(
    callbackAddress: string,
    callbackFunction: string,
    numWords: number = 1,
    minConfirmations: number = 3
  ): Promise<string> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/api/v1/vrf/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey }),
        },
        body: JSON.stringify({
          callbackAddress,
          callbackFunction,
          numWords,
          minConfirmations,
          chain: this.config.chain,
        }),
      });

      if (!response.ok) {
        throw new Error(`VRF request failed: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('VRF request created', { requestId: data.id });
      return data.id;
    } catch (error) {
      logger.error('Failed to request VRF', { error });
      throw error;
    }
  }

  async getVRFStatus(requestId: string): Promise<SwitchboardVRFRequest> {
    try {
      const response = await fetch(
        `${this.config.apiEndpoint}/api/v1/vrf/requests/${requestId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get VRF status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Failed to get VRF status', { error, requestId });
      throw error;
    }
  }

  // ============================================================================
  // 聚合器管理
  // ============================================================================

  async getAggregators(): Promise<SwitchboardAggregator[]> {
    try {
      const response = await fetch(
        `${this.config.apiEndpoint}/api/v1/queues/${this.config.queueAddress}/aggregators`
      );

      if (!response.ok) {
        throw new Error(`Failed to get aggregators: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Failed to get aggregators', { error });
      throw error;
    }
  }

  async createAggregator(config: {
    name: string;
    feedHash: string;
    heartbeat: number;
    varianceThreshold: number;
  }): Promise<string> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/api/v1/aggregators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey }),
        },
        body: JSON.stringify({
          ...config,
          queueAddress: this.config.queueAddress,
          chain: this.config.chain,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create aggregator: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('Aggregator created', { address: data.address });
      return data.address;
    } catch (error) {
      logger.error('Failed to create aggregator', { error });
      throw error;
    }
  }

  // ============================================================================
  // 监控功能
  // ============================================================================

  onPriceUpdate(callback: PriceUpdateCallback): () => void {
    this.priceCallbacks.add(callback);
    return () => this.priceCallbacks.delete(callback);
  }

  onAssertion(callback: AssertionCallback): () => void {
    this.assertionCallbacks.add(callback);
    return () => this.assertionCallbacks.delete(callback);
  }

  onDispute(callback: DisputeCallback): () => void {
    this.disputeCallbacks.add(callback);
    return () => this.disputeCallbacks.delete(callback);
  }

  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitorInterval = setInterval(async () => {
      await this.pollUpdates();
    }, intervalMs);

    logger.info('Switchboard monitoring started', { intervalMs });
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = undefined;
    }

    logger.info('Switchboard monitoring stopped');
  }

  private async pollUpdates(): Promise<void> {
    try {
      // 获取所有支持的币种价格
      const symbols = Object.keys(SWITCHBOARD_FEED_IDS);
      const prices = await this.getMultiplePrices(symbols);

      // 通知所有注册的回调
      for (const price of prices) {
        for (const callback of this.priceCallbacks) {
          try {
            callback(price);
          } catch (error) {
            logger.error('Price callback error', { error });
          }
        }
      }
    } catch (error) {
      logger.error('Failed to poll updates', { error });
    }
  }

  // ============================================================================
  // 健康检查
  // ============================================================================

  async healthCheck(): Promise<{
    healthy: boolean;
    latency: number;
    lastUpdate: Date | null;
    error?: string;
  }> {
    const start = Date.now();

    try {
      const response = await fetch(`${this.config.apiEndpoint}/api/v1/health`);
      const latency = Date.now() - start;

      if (!response.ok) {
        return {
          healthy: false,
          latency,
          lastUpdate: null,
          error: `Health check failed: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        healthy: true,
        latency,
        lastUpdate: new Date(data.lastUpdate),
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - start,
        lastUpdate: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  private getFeedId(symbol: string): string | undefined {
    return SWITCHBOARD_FEED_IDS[symbol];
  }

  getSupportedSymbols(): string[] {
    return Object.keys(SWITCHBOARD_FEED_IDS);
  }

  getCapabilities(): ProtocolCapabilities {
    return {
      priceFeeds: true,
      assertions: false, // Switchboard 不支持断言机制
      disputes: false,
      vrf: true,
      customData: true,
    };
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createSwitchboardClient(config: SwitchboardConfig): SwitchboardClient {
  return new SwitchboardClient(config);
}

// ============================================================================
// 导出类型
// ============================================================================

// Types are already exported via 'export interface' above
// No additional export needed
