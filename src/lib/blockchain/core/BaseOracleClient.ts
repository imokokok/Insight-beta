/**
 * Base Oracle Client - 预言机客户端抽象基类
 *
 * 提供所有预言机客户端的通用功能：
 * - 统一的配置管理
 * - 批量处理和并发控制
 * - 错误处理和重试机制
 * - 健康检查
 * - 结构化日志
 */

import { logger as defaultLogger } from '@/lib/logger';
import type {
  OracleProtocol,
  SupportedChain,
  UnifiedPriceFeed,
} from '@/lib/types/unifiedOracleTypes';
import { sleep } from '@/lib/utils/common';

import { PriceFetchError, normalizeSymbol } from './types';

import type {
  IOracleClient,
  OracleClientConfig,
  RequiredOracleClientConfig,
  OracleHealthStatus,
  OracleClientCapabilities,
  PriceFetchOptions,
  BatchPriceResult,
  OracleClientLogger,
} from './types';
import type { Address } from 'viem';

// ============================================================================
// 默认配置常量
// ============================================================================

const DEFAULT_CONFIG = {
  rpcUrl: '',
  rpcUrls: [] as string[],
  timeoutMs: 10000,
  retryAttempts: 3,
  concurrencyLimit: 5,
  stalenessThreshold: 300,
  confidenceThreshold: 0.8,
  contractAddress: undefined as Address | undefined,
  apiKey: undefined as string | undefined,
};

// ============================================================================
// 抽象基类
// ============================================================================

export abstract class BaseOracleClient implements IOracleClient {
  /** 客户端配置 */
  readonly config: RequiredOracleClientConfig;
  /** 日志记录器 */
  protected readonly logger: OracleClientLogger;
  /** 价格符号到ID的映射 */
  protected symbolToId: Map<string, string> = new Map();
  /** ID到价格符号的映射 */
  protected idToSymbol: Map<string, string> = new Map();
  /** 客户端创建时间 */
  protected readonly createdAt: number;
  /** 最后活动时间 */
  protected lastActivityAt: number;

  constructor(config: OracleClientConfig) {
    this.config = {
      chain: config.chain,
      protocol: config.protocol,
      rpcUrl: config.rpcUrl ?? DEFAULT_CONFIG.rpcUrl,
      rpcUrls: config.rpcUrls ?? DEFAULT_CONFIG.rpcUrls,
      timeoutMs: config.timeoutMs ?? DEFAULT_CONFIG.timeoutMs,
      retryAttempts: config.retryAttempts ?? DEFAULT_CONFIG.retryAttempts,
      concurrencyLimit: config.concurrencyLimit ?? DEFAULT_CONFIG.concurrencyLimit,
      stalenessThreshold: config.stalenessThreshold ?? DEFAULT_CONFIG.stalenessThreshold,
      confidenceThreshold: config.confidenceThreshold ?? DEFAULT_CONFIG.confidenceThreshold,
      contractAddress: config.contractAddress ?? DEFAULT_CONFIG.contractAddress,
      apiKey: config.apiKey ?? DEFAULT_CONFIG.apiKey,
    };
    this.logger = this.createLogger();
    this.createdAt = Date.now();
    this.lastActivityAt = this.createdAt;

    // 注意：这里不能访问 this.protocol 和 this.chain，因为它们是抽象属性
    // 子类需要在 super() 调用后自行记录日志
  }

  // ============================================================================
  // 抽象属性 - 子类必须实现
  // ============================================================================

  abstract readonly protocol: OracleProtocol;
  abstract readonly chain: SupportedChain;

  // ============================================================================
  // 抽象方法 - 子类必须实现
  // ============================================================================

  /**
   * 获取单个价格 - 子类必须实现
   */
  abstract fetchPrice(symbol: string): Promise<UnifiedPriceFeed | null>;

  /**
   * 获取所有可用价格源 - 子类必须实现
   */
  abstract fetchAllFeeds(): Promise<UnifiedPriceFeed[]>;

  /**
   * 执行健康检查 - 子类必须实现
   */
  abstract checkHealth(): Promise<Omit<OracleHealthStatus, 'lastUpdate'>>;

  /**
   * 获取客户端能力 - 子类必须实现
   */
  abstract getCapabilities(): OracleClientCapabilities;

  // ============================================================================
  // 公共方法
  // ============================================================================

  /**
   * 获取单个价格（带缓存和错误处理）
   */
  async getPrice(
    symbol: string,
    options: PriceFetchOptions = {},
  ): Promise<UnifiedPriceFeed | null> {
    const startTime = Date.now();
    this.updateActivity();

    try {
      const normalizedSymbol = normalizeSymbol(symbol);
      this.logger.debug('Fetching price', { symbol: normalizedSymbol, options });

      const price = await this.withRetry(
        () => this.fetchPrice(normalizedSymbol),
        `getPrice(${normalizedSymbol})`,
      );

      const duration = Date.now() - startTime;
      this.logger.info('Price fetched successfully', {
        symbol: normalizedSymbol,
        durationMs: duration,
        found: price !== null,
      });

      return price;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to fetch price', {
        symbol,
        durationMs: duration,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new PriceFetchError(
        `Failed to fetch price for ${symbol}: ${error instanceof Error ? error.message : String(error)}`,
        this.protocol,
        this.chain,
        symbol,
        error,
      );
    }
  }

  /**
   * 批量获取价格（带并发控制）
   */
  async getPrices(symbols: string[], options: PriceFetchOptions = {}): Promise<BatchPriceResult> {
    const startTime = Date.now();
    this.updateActivity();

    this.logger.info('Batch price fetch started', {
      count: symbols.length,
      symbols: symbols.slice(0, 5),
    });

    const maxConcurrent = options.maxConcurrent ?? this.config.concurrencyLimit;

    const results = await this.withConcurrencyLimit(
      symbols,
      async (symbol) => {
        try {
          const price = await this.getPrice(symbol, options);
          return { success: true as const, symbol, price };
        } catch (error) {
          return {
            success: false as const,
            symbol,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
      maxConcurrent,
    );

    const prices: UnifiedPriceFeed[] = [];
    const failed: Array<{ symbol: string; error: string }> = [];

    for (const result of results) {
      // 跳过 null 结果（并发执行中出现错误）
      if (result === null) continue;
      if (result.success && result.price) {
        prices.push(result.price);
      } else if (!result.success) {
        failed.push({ symbol: result.symbol, error: result.error });
      }
    }

    const duration = Date.now() - startTime;
    this.logger.info('Batch price fetch completed', {
      total: symbols.length,
      success: prices.length,
      failed: failed.length,
      durationMs: duration,
    });

    return {
      prices,
      failed,
      durationMs: duration,
    };
  }

  /**
   * 获取所有可用价格源
   */
  async getAllFeeds(): Promise<UnifiedPriceFeed[]> {
    this.updateActivity();

    try {
      return await this.withRetry(() => this.fetchAllFeeds(), 'getAllFeeds');
    } catch (error) {
      this.logger.error('Failed to fetch all feeds', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<OracleHealthStatus> {
    const startTime = Date.now();

    try {
      const result = await this.checkHealth();
      const latency = Date.now() - startTime;

      return {
        ...result,
        lastUpdate: Date.now(),
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error('Health check failed', { error: errorMessage });

      return {
        status: 'unhealthy',
        lastUpdate: Date.now(),
        latency,
        issues: [errorMessage],
      };
    }
  }

  /**
   * 销毁客户端资源
   */
  async destroy(): Promise<void> {
    this.logger.debug('Destroying oracle client', {
      protocol: this.protocol,
      chain: this.chain,
      lifetimeMs: Date.now() - this.createdAt,
    });

    // 子类可以覆盖此方法进行资源清理
  }

  // ============================================================================
  // 保护方法 - 子类可以使用
  // ============================================================================

  /**
   * 带重试的执行
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
    customRetryAttempts?: number,
  ): Promise<T> {
    const maxRetries = customRetryAttempts ?? this.config.retryAttempts;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          this.logger.warn(`${context} failed, retrying`, {
            attempt: attempt + 1,
            maxRetries,
            delayMs: delay,
            error: lastError.message,
          });
          await sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * 并发控制执行
   * 使用 p-limit 模式正确实现并发限制
   */
  protected async withConcurrencyLimit<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    limit: number,
  ): Promise<(R | null)[]> {
    const results: (R | null)[] = new Array(items.length).fill(null);
    
    // 使用队列模式实现并发控制
    const queue = items.map((item, index) => ({ item, index }));
    const executing = new Set<Promise<void>>();
    
    const processItem = async ({ item, index }: { item: T; index: number }) => {
      try {
        const result = await fn(item);
        results[index] = result;
      } catch (error) {
        this.logger.error('Concurrency operation failed', {
          error: error instanceof Error ? error.message : String(error),
          index,
        });
        // 错误时保持 null（已初始化）
      }
    };
    
    // 分批处理，确保并发数不超过限制
    while (queue.length > 0 || executing.size > 0) {
      // 启动新的任务直到达到并发限制
      while (executing.size < limit && queue.length > 0) {
        const next = queue.shift();
        if (next) {
          const promise = processItem(next).finally(() => {
            executing.delete(promise);
          });
          executing.add(promise);
        }
      }
      
      // 等待至少一个任务完成
      if (executing.size > 0) {
        await Promise.race(executing);
      }
    }

    return results;
  }

  /**
   * 构建反向映射（priceId -> symbol）
   */
  protected buildMappings(priceFeedIds: Record<string, string>): void {
    this.symbolToId = new Map(Object.entries(priceFeedIds));
    this.idToSymbol = new Map(
      Object.entries(priceFeedIds).map(([symbol, id]) => [id.toLowerCase(), symbol]),
    );
  }

  /**
   * 根据 priceId 查找 symbol
   */
  protected getSymbolByPriceId(priceId: string): string | undefined {
    return this.idToSymbol.get(priceId.toLowerCase());
  }

  /**
   * 根据 symbol 查找 priceId
   */
  protected getPriceIdBySymbol(symbol: string): string | undefined {
    return this.symbolToId.get(normalizeSymbol(symbol));
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  private createLogger(): OracleClientLogger {
    const prefix = `${this.protocol}[${this.chain}]`;

    return {
      debug: (message: string, meta?: Record<string, unknown>) => {
        defaultLogger.debug(`${prefix}: ${message}`, meta);
      },
      info: (message: string, meta?: Record<string, unknown>) => {
        defaultLogger.info(`${prefix}: ${message}`, meta);
      },
      warn: (message: string, meta?: Record<string, unknown>) => {
        defaultLogger.warn(`${prefix}: ${message}`, meta);
      },
      error: (message: string, meta?: Record<string, unknown>) => {
        defaultLogger.error(`${prefix}: ${message}`, meta);
      },
    };
  }

  private updateActivity(): void {
    this.lastActivityAt = Date.now();
  }
}
