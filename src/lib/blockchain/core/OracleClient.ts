/**
 * OracleClient - 预言机客户端抽象基类
 *
 * 为所有预言机协议提供统一的接口
 */

import { type PublicClient, createPublicClient, http, type Chain } from 'viem';

import { logger } from '@/lib/logger';
import type { OracleProtocol, SupportedChain, PriceFeed, OracleHealthStatus } from '@/lib/types';

// ============================================================================
// 类型定义
// ============================================================================

export interface OracleClientOptions {
  protocol: OracleProtocol;
  chain: SupportedChain;
  rpcUrl: string;
  rpcUrls?: string[];
  timeout?: number;
  retries?: number;
  contractAddress?: string;
  contractAddresses?: Record<string, string>;
}

export interface FetchPriceOptions {
  symbol?: string;
  feedId?: string;
  timeout?: number;
}

export interface FetchPricesOptions {
  symbols?: string[];
  feedIds?: string[];
  timeout?: number;
}

// ============================================================================
// 错误类型
// ============================================================================

export class OracleClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
    public cause?: Error,
  ) {
    super(message);
    this.name = 'OracleClientError';
  }
}

export class PriceFetchError extends OracleClientError {
  constructor(message: string, retryable: boolean = false, cause?: Error) {
    super(message, 'PRICE_FETCH_ERROR', retryable, cause);
    this.name = 'PriceFetchError';
  }
}

export class ConnectionError extends OracleClientError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONNECTION_ERROR', true, cause);
    this.name = 'ConnectionError';
  }
}

// ============================================================================
// 重试策略
// ============================================================================

export interface RetryStrategy {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export const DefaultRetryStrategy: RetryStrategy = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

async function withRetry<T>(
  operation: () => Promise<T>,
  strategy: RetryStrategy = DefaultRetryStrategy,
  operationName: string,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= strategy.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === strategy.maxRetries) {
        break;
      }

      const delay = Math.min(
        strategy.baseDelay * Math.pow(strategy.backoffMultiplier, attempt),
        strategy.maxDelay,
      );

      logger.warn(`${operationName} failed, retrying...`, {
        attempt: attempt + 1,
        maxRetries: strategy.maxRetries,
        delay,
        error: lastError.message,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// ============================================================================
// 抽象基类
// ============================================================================

export abstract class OracleClient {
  protected client!: PublicClient;
  protected options: OracleClientOptions;
  protected retryStrategy: RetryStrategy;
  protected lastHealthCheck?: OracleHealthStatus;
  protected healthCheckInterval?: NodeJS.Timeout;
  private initialized = false;

  constructor(options: OracleClientOptions, retryStrategy?: RetryStrategy) {
    this.options = options;
    this.retryStrategy = retryStrategy || DefaultRetryStrategy;

    // 延迟初始化，子类可以调用 initialize() 方法
  }

  /**
   * 初始化客户端
   * 必须在子类构造函数中调用
   */
  protected async initialize(): Promise<void> {
    if (this.initialized) return;

    const chain = await this.getChainConfig(this.options.chain);

    // 创建 viem 客户端
    this.client = createPublicClient({
      chain,
      transport: http(this.options.rpcUrl, {
        timeout: this.options.timeout || 30000,
      }),
    });

    // 启动健康检查
    this.startHealthCheck();
    this.initialized = true;
  }

  // ============================================================================
  // 抽象方法 - 子类必须实现
  // ============================================================================

  /**
   * 获取单个价格
   */
  abstract fetchPrice(options: FetchPriceOptions): Promise<PriceFeed>;

  /**
   * 获取多个价格
   */
  abstract fetchPrices(options: FetchPricesOptions): Promise<PriceFeed[]>;

  /**
   * 获取支持的代币列表
   */
  abstract getSupportedSymbols(): Promise<string[]>;

  /**
   * 检查健康状态
   */
  abstract checkHealth(): Promise<OracleHealthStatus>;

  /**
   * 获取协议特定信息
   */
  abstract getProtocolInfo(): {
    name: string;
    version: string;
    features: string[];
  };

  // ============================================================================
  // 公共方法
  // ============================================================================

  /**
   * 获取价格（带重试）
   */
  async getPrice(options: FetchPriceOptions): Promise<PriceFeed> {
    return withRetry(() => this.fetchPrice(options), this.retryStrategy, 'fetchPrice');
  }

  /**
   * 获取多个价格（带重试）
   */
  async getPrices(options: FetchPricesOptions): Promise<PriceFeed[]> {
    return withRetry(() => this.fetchPrices(options), this.retryStrategy, 'fetchPrices');
  }

  /**
   * 获取健康状态
   */
  getHealth(): OracleHealthStatus | undefined {
    return this.lastHealthCheck;
  }

  /**
   * 销毁客户端
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  // ============================================================================
  // 受保护方法
  // ============================================================================

  /**
   * 获取链配置
   */
  protected async getChainConfig(chain: SupportedChain): Promise<Chain> {
    // 使用动态导入获取 viem Chain 配置
    const viemChains = await import('viem/chains');

    // 定义 viem 支持的链映射
    const chainMap: Partial<Record<SupportedChain, Chain>> = {
      ethereum: viemChains.mainnet,
      polygon: viemChains.polygon,
      arbitrum: viemChains.arbitrum,
      optimism: viemChains.optimism,
      base: viemChains.base,
      avalanche: viemChains.avalanche,
      bsc: viemChains.bsc,
      fantom: viemChains.fantom,
      celo: viemChains.celo,
      gnosis: viemChains.gnosis,
      linea: viemChains.linea,
      scroll: viemChains.scroll,
      mantle: viemChains.mantle,
      mode: viemChains.mode,
      blast: viemChains.blast,
      sepolia: viemChains.sepolia,
      goerli: viemChains.goerli,
      polygonAmoy: viemChains.polygonAmoy,
    };

    const chainConfig = chainMap[chain];
    if (!chainConfig) {
      throw new OracleClientError(
        `Unsupported chain or chain not available in viem: ${chain}`,
        'UNSUPPORTED_CHAIN',
      );
    }

    return chainConfig;
  }

  /**
   * 启动健康检查
   */
  protected startHealthCheck(intervalMs: number = 60000): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        this.lastHealthCheck = await this.checkHealth();
      } catch (error) {
        logger.error('Health check failed', {
          protocol: this.options.protocol,
          chain: this.options.chain,
          error: error instanceof Error ? error.message : String(error),
        });

        this.lastHealthCheck = {
          healthy: false,
          reason: error instanceof Error ? error.message : 'Health check failed',
          lastUpdate: Date.now(),
        };
      }
    }, intervalMs);
  }

  /**
   * 构建价格 Feed
   */
  protected buildPriceFeed(data: Partial<PriceFeed>): PriceFeed {
    return {
      id: data.id || `${this.options.protocol}:${data.symbol}`,
      symbol: data.symbol || 'UNKNOWN',
      baseAsset: data.baseAsset || data.symbol?.split('/')[0] || 'UNKNOWN',
      quoteAsset: data.quoteAsset || data.symbol?.split('/')[1] || 'USD',
      protocol: this.options.protocol,
      chain: this.options.chain,
      price: data.price || 0,
      timestamp: data.timestamp || Date.now(),
      confidence: data.confidence || 1,
      ...data,
    };
  }

  /**
   * 处理错误
   */
  protected handleError(error: unknown, operation: string): never {
    if (error instanceof OracleClientError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);

    // 判断是否是连接错误
    if (
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('network')
    ) {
      throw new ConnectionError(
        `Failed to ${operation}: ${message}`,
        error instanceof Error ? error : undefined,
      );
    }

    throw new PriceFetchError(
      `Failed to ${operation}: ${message}`,
      false,
      error instanceof Error ? error : undefined,
    );
  }

  /**
   * 获取合约地址
   */
  protected getContractAddress(key: string = 'default'): string | undefined {
    return this.options.contractAddresses?.[key] || this.options.contractAddress;
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export type OracleClientConstructor = new (options: OracleClientOptions) => OracleClient;

const clientRegistry = new Map<OracleProtocol, OracleClientConstructor>();

export function registerOracleClient(
  protocol: OracleProtocol,
  constructor: OracleClientConstructor,
): void {
  clientRegistry.set(protocol, constructor);
}

export function createOracleClient(
  protocol: OracleProtocol,
  options: OracleClientOptions,
): OracleClient {
  const Constructor = clientRegistry.get(protocol);

  if (!Constructor) {
    throw new OracleClientError(
      `No client registered for protocol: ${protocol}`,
      'UNKNOWN_PROTOCOL',
    );
  }

  return new Constructor(options);
}

export function getSupportedProtocols(): OracleProtocol[] {
  return Array.from(clientRegistry.keys());
}
