/**
 * Pyth Oracle Client - Pyth 预言机客户端
 *
 * 基于新的核心架构实现的 Pyth 协议客户端
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
// Pyth 特定类型
// ============================================================================

interface PythPriceFeed {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publishTime: number;
  };
  emaPrice?: {
    price: string;
    conf: string;
    expo: number;
    publishTime: number;
  };
}

// ============================================================================
// 配置常量
// ============================================================================

const PYTH_API_ENDPOINTS = {
  mainnet: 'https://hermes.pyth.network',
  pythtest: 'https://hermes-beta.pyth.network',
} as const;

const DEFAULT_PRICE_FEED_IDS: Record<string, string> = {
  'BTC/USD': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'ETH/USD': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'SOL/USD': '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  'AVAX/USD': '0x93da3352f9f1d105fdfe4971cfa80e9dd777ddc355984dd12ac00583026a8bef',
  'LINK/USD': '0x8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221',
  'MATIC/USD': '0x5de33a9112c2b700b8d30b8a3402c103578ccfa2765696471cc672bd5cf6ac52',
  'BNB/USD': '0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f',
  'UNI/USD': '0x78d185a741d07edb3412b09008b7c5cfb9bbbd7d568bf00ba737b456ba171501',
  'AAVE/USD': '0x2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445',
  // MKR/USD 价格ID - 从环境变量获取或配置文件中读取
  // 如需添加，请在配置中设置或通过 addPriceFeed 方法添加
};

// ============================================================================
// Pyth 客户端实现
// ============================================================================

export class PythOracleClient extends BaseOracleClient {
  readonly protocol: OracleProtocol = 'pyth';
  readonly chain: SupportedChain;
  private readonly apiEndpoint: string;
  private readonly priceFeedIds: Map<string, string>;

  constructor(config: OracleClientConfig) {
    super(config);
    this.chain = config.chain;
    this.apiEndpoint = this.resolveApiEndpoint(config);
    this.priceFeedIds = new Map(Object.entries(DEFAULT_PRICE_FEED_IDS));
    this.buildMappings(DEFAULT_PRICE_FEED_IDS);
  }

  // ============================================================================
  // 抽象方法实现
  // ============================================================================

  async fetchPrice(symbol: string): Promise<UnifiedPriceFeed | null> {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const priceId = this.getPriceIdBySymbol(normalizedSymbol);

    if (!priceId) {
      this.logger.warn('Unknown symbol', { symbol: normalizedSymbol });
      return null;
    }

    try {
      const response = await fetch(`${this.apiEndpoint}/v2/updates/price/latest?ids[]=${priceId}`, {
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as { parsed: PythPriceFeed[] };

      if (!data.parsed || data.parsed.length === 0 || !data.parsed[0]) {
        return null;
      }

      const feed = data.parsed[0];
      return this.transformPriceFeed(feed, normalizedSymbol);
    } catch (error) {
      throw new PriceFetchError(
        `Failed to fetch Pyth price: ${error instanceof Error ? error.message : String(error)}`,
        this.protocol,
        this.chain,
        symbol,
        error,
      );
    }
  }

  async fetchAllFeeds(): Promise<UnifiedPriceFeed[]> {
    const priceIds = Array.from(this.priceFeedIds.values());
    const results: UnifiedPriceFeed[] = [];

    // 分批获取，每批 10 个
    const batchSize = 10;
    for (let i = 0; i < priceIds.length; i += batchSize) {
      const batch = priceIds.slice(i, i + batchSize);
      const queryParams = batch.map((id) => `ids[]=${id}`).join('&');

      try {
        const response = await fetch(`${this.apiEndpoint}/v2/updates/price/latest?${queryParams}`, {
          headers: {
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(this.config.timeoutMs),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as { parsed: PythPriceFeed[] };

        for (const feed of data.parsed) {
          const symbol = this.getSymbolByPriceId(feed.id);
          if (symbol) {
            const unifiedFeed = this.transformPriceFeed(feed, symbol);
            results.push(unifiedFeed);
          }
        }
      } catch (error) {
        this.logger.error('Failed to fetch batch', {
          batchIndex: i / batchSize,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  async checkHealth(): Promise<Omit<OracleHealthStatus, 'lastUpdate'>> {
    const startTime = Date.now();

    try {
      // 尝试获取 BTC 价格作为健康检查
      const response = await fetch(
        `${this.apiEndpoint}/v2/updates/price/latest?ids[]=${DEFAULT_PRICE_FEED_IDS['BTC/USD']}`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(5000),
        },
      );

      const latency = Date.now() - startTime;

      if (!response.ok) {
        return {
          status: 'unhealthy',
          latency,
          issues: [`HTTP ${response.status}: ${response.statusText}`],
        };
      }

      const data = (await response.json()) as { parsed: PythPriceFeed[] };

      if (!data.parsed || data.parsed.length === 0 || !data.parsed[0]) {
        return {
          status: 'degraded',
          latency,
          issues: ['No price data returned'],
        };
      }

      const feed = data.parsed[0];
      const publishTime = feed.price.publishTime;
      const stalenessSeconds = Math.floor(Date.now() / 1000) - publishTime;

      if (stalenessSeconds > this.config.stalenessThreshold) {
        return {
          status: 'degraded',
          latency,
          issues: [`Data is stale: ${stalenessSeconds}s old`],
        };
      }

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
      customData: false,
      batchQueries: true,
      websocket: false,
    };
  }

  // ============================================================================
  // 公共方法
  // ============================================================================

  /**
   * 添加自定义价格源
   */
  addPriceFeed(symbol: string, priceId: string): void {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    this.priceFeedIds.set(normalizedSymbol, priceId);
    this.buildMappings(Object.fromEntries(this.priceFeedIds));
    this.logger.info('Price feed added', { symbol: normalizedSymbol, priceId });
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  private resolveApiEndpoint(config: OracleClientConfig): string {
    // 优先使用配置中的 endpoint
    if (config.rpcUrl) {
      return config.rpcUrl;
    }

    // 根据链选择默认 endpoint
    // 注意：solana 在主网也使用主网 endpoint
    return PYTH_API_ENDPOINTS.mainnet;
  }

  private transformPriceFeed(feed: PythPriceFeed, symbol: string): UnifiedPriceFeed {
    const price = BigInt(feed.price.price);
    const expo = feed.price.expo;
    const adjustedPrice = this.adjustPrice(price, expo);

    const publishTime = feed.price.publishTime;
    const now = Math.floor(Date.now() / 1000);
    const stalenessSeconds = now - publishTime;
    const isStale = stalenessSeconds > this.config.stalenessThreshold;

    return {
      id: feed.id,
      symbol,
      protocol: this.protocol,
      chain: this.chain,
      price: adjustedPrice,
      priceRaw: price,
      timestamp: publishTime * 1000,
      confidence: this.calculateConfidence(feed.price.conf, feed.price.price),
      source: 'pyth',
      decimals: Math.abs(expo),
      isStale,
      stalenessSeconds: isStale ? stalenessSeconds : 0,
      baseAsset: symbol.split('/')[0],
      quoteAsset: symbol.split('/')[1] || 'USD',
    };
  }

  private adjustPrice(price: bigint, expo: number): number {
    // 验证 price 的有效性
    if (price === undefined || price === null) {
      this.logger.warn('Invalid price value: null or undefined');
      return 0;
    }

    // 检查 price 是否超出安全范围
    const MAX_SAFE_PRICE = BigInt(Number.MAX_SAFE_INTEGER);
    if (price > MAX_SAFE_PRICE) {
      this.logger.warn(`Price value too large: ${price.toString()}, using max safe integer`);
      return Number.MAX_SAFE_INTEGER;
    }

    const decimal = 10 ** Math.abs(expo);
    const priceNum = Number(price);

    if (expo < 0) {
      const result = priceNum / decimal;
      // 检查结果是否为有效数字
      if (!isFinite(result) || isNaN(result)) {
        this.logger.warn(`Invalid price calculation: ${priceNum} / ${decimal} = ${result}`);
        return 0;
      }
      return result;
    }

    const result = priceNum * decimal;
    // 检查结果是否为有效数字
    if (!isFinite(result) || isNaN(result)) {
      this.logger.warn(`Invalid price calculation: ${priceNum} * ${decimal} = ${result}`);
      return 0;
    }
    return result;
  }

  private calculateConfidence(conf: string, price: string): number {
    try {
      const confValue = BigInt(conf);
      const priceValue = BigInt(price);

      // 检查 priceValue 是否为 0 或无效
      if (priceValue === 0n) return 0;

      const priceNum = Number(priceValue);
      // 再次检查转换后的数值
      if (!priceNum || priceNum === 0 || !isFinite(priceNum)) {
        return 0;
      }

      const confNum = Number(confValue);
      if (!isFinite(confNum)) {
        return 0;
      }

      return 1 - confNum / priceNum;
    } catch (error) {
      this.logger.warn('Failed to calculate confidence', { conf, price, error });
      return 0;
    }
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createPythClient(
  chain: SupportedChain = 'ethereum',
  config?: Partial<Omit<OracleClientConfig, 'protocol' | 'chain'>>,
): PythOracleClient {
  return new PythOracleClient({
    protocol: 'pyth',
    chain,
    ...config,
  });
}
