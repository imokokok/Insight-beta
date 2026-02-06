/**
 * Base Oracle Client - 预言机客户端抽象基类
 *
 * 提供通用的预言机客户端功能：
 * - 批量价格获取
 * - 错误处理和重试
 * - 并发控制
 */

import { logger } from '@/lib/logger';
import type {
  SupportedChain,
  UnifiedPriceFeed,
  OracleProtocol,
} from '@/lib/types/unifiedOracleTypes';

export interface OracleClientConfig {
  chain: SupportedChain;
  protocol: OracleProtocol;
  timeoutMs?: number;
  retryAttempts?: number;
  concurrencyLimit?: number;
}

export abstract class BaseOracleClient {
  protected config: Required<OracleClientConfig>;
  protected priceIdToSymbol: Map<string, string> = new Map();

  constructor(config: OracleClientConfig) {
    this.config = {
      timeoutMs: 10000,
      retryAttempts: 3,
      concurrencyLimit: 5,
      ...config,
    };
  }

  /**
   * 获取单个价格（子类必须实现）
   */
  abstract getPriceForSymbol(symbol: string): Promise<UnifiedPriceFeed | null>;

  /**
   * 批量获取价格（通用实现）
   */
  async getMultiplePrices(symbols: string[]): Promise<UnifiedPriceFeed[]> {
    const results = await this.runWithConcurrencyLimit(
      symbols,
      (symbol) => this.getPriceForSymbol(symbol),
      this.config.concurrencyLimit,
    );

    return results
      .filter(
        (result): result is PromiseFulfilledResult<UnifiedPriceFeed | null> =>
          result.status === 'fulfilled',
      )
      .map((result) => result.value)
      .filter((feed): feed is UnifiedPriceFeed => feed !== null);
  }

  /**
   * 获取所有可用价格源
   */
  abstract getAllAvailableFeeds(): Promise<UnifiedPriceFeed[]>;

  /**
   * 并发控制执行
   */
  protected async runWithConcurrencyLimit<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    limit: number,
  ): Promise<PromiseSettledResult<R>[]> {
    const results: PromiseSettledResult<R>[] = [];
    const executing: Promise<void>[] = [];

    for (const item of items) {
      const promise = fn(item).then(
        (value): PromiseSettledResult<R> => ({ status: 'fulfilled', value }),
        (reason): PromiseSettledResult<R> => ({ status: 'rejected', reason }),
      );

      results.push(promise as unknown as PromiseSettledResult<R>);

      const execution = promise.then(() => {});
      executing.push(execution);

      if (executing.length >= limit) {
        await Promise.race(executing);
        const index = executing.findIndex((p) => p === execution);
        if (index !== -1) {
          executing.splice(index, 1);
        }
      }
    }

    return Promise.all(results);
  }

  /**
   * 带重试的执行
   */
  protected async withRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.config.retryAttempts - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          logger.warn(`${context} failed, retrying`, {
            attempt: attempt + 1,
            delay,
            error: lastError.message,
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * 构建反向映射（priceId -> symbol）
   */
  protected buildReverseMapping(priceFeedIds: Record<string, string>): void {
    this.priceIdToSymbol = new Map(
      Object.entries(priceFeedIds).map(([symbol, id]) => [id.toLowerCase(), symbol]),
    );
  }

  /**
   * 根据 priceId 查找 symbol
   */
  protected getSymbolByPriceId(priceId: string): string | undefined {
    return this.priceIdToSymbol.get(priceId.toLowerCase());
  }
}
