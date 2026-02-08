/**
 * GraphQL DataLoader - 数据加载器优化
 *
 * 解决 GraphQL N+1 查询问题：
 * - 批量加载
 * - 缓存优化
 * - 去重请求
 * - 性能监控
 */

import DataLoader from 'dataloader';

import { logger } from '@/lib/logger';
import type {
  SupportedChain,
  OracleProtocol,
  UnifiedPriceFeed,
} from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// 类型定义
// ============================================================================

export interface LoaderOptions {
  /** 缓存时间（毫秒） */
  cacheExpiryMs?: number;
  /** 最大批量大小 */
  maxBatchSize?: number;
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 是否启用去重 */
  enableDeduplication?: boolean;
}

export interface LoadResult<T> {
  data: T | null;
  error?: Error;
  duration: number;
  cacheHit: boolean;
}

export type LoaderKey = string | { id: string; chain?: SupportedChain; protocol?: OracleProtocol };

// ============================================================================
// 基础数据加载器
// ============================================================================

export class OracleDataLoader {
  private loaders: Map<string, DataLoader<LoaderKey, unknown>> = new Map();
  private cache: Map<string, { value: unknown; expiry: number }> = new Map();
  private options: Required<LoaderOptions>;
  private metrics: {
    totalRequests: number;
    cacheHits: number;
    batchRequests: number;
    errors: number;
  } = {
    totalRequests: 0,
    cacheHits: 0,
    batchRequests: 0,
    errors: 0,
  };

  constructor(options: LoaderOptions = {}) {
    this.options = {
      cacheExpiryMs: options.cacheExpiryMs ?? 5000,
      maxBatchSize: options.maxBatchSize ?? 100,
      enableCache: options.enableCache ?? true,
      enableDeduplication: options.enableDeduplication ?? true,
    };
  }

  /**
   * 获取或创建加载器
   */
  protected getLoader<T>(
    name: string,
    batchLoadFn: (keys: readonly LoaderKey[]) => Promise<(T | Error)[]>,
  ): DataLoader<LoaderKey, T> {
    if (!this.loaders.has(name)) {
      const loader = new DataLoader<LoaderKey, T>(
        async (keys) => {
          this.metrics.batchRequests++;
          const startTime = performance.now();

          try {
            // 检查缓存
            if (this.options.enableCache) {
              const cachedResults = keys.map((key) => this.getFromCache<T>(key));
              const uncachedKeys = keys.filter((_, index) => cachedResults[index] === undefined);

              if (uncachedKeys.length === 0) {
                this.metrics.cacheHits += keys.length;
                return cachedResults as T[];
              }

              // 只加载未缓存的数据
              const results = await batchLoadFn(uncachedKeys);

              // 缓存结果
              uncachedKeys.forEach((key, index) => {
                this.setCache(key, results[index]);
              });

              // 合并缓存和加载结果
              let resultIndex = 0;
              return cachedResults.map((cached) =>
                cached !== undefined ? cached : (results[resultIndex++] as T),
              );
            }

            // 不使用缓存，直接加载
            const results = await batchLoadFn(keys);
            return results as T[];
          } catch (error) {
            this.metrics.errors++;
            logger.error('DataLoader batch load failed', { name, error });
            throw error;
          } finally {
            const duration = performance.now() - startTime;
            logger.debug('DataLoader batch load completed', {
              name,
              keyCount: keys.length,
              duration: `${duration.toFixed(2)}ms`,
            });
          }
        },
        {
          maxBatchSize: this.options.maxBatchSize,
          cache: this.options.enableDeduplication,
          batchScheduleFn: (callback) => setTimeout(callback, 1), // 1ms 批处理窗口
        },
      );

      this.loaders.set(name, loader as DataLoader<LoaderKey, unknown>);
    }

    return this.loaders.get(name) as DataLoader<LoaderKey, T>;
  }

  /**
   * 从缓存获取
   */
  private getFromCache<T>(key: LoaderKey): T | undefined {
    const cacheKey = this.normalizeKey(key);
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.value as T;
    }

    // 清理过期缓存
    if (cached) {
      this.cache.delete(cacheKey);
    }

    return undefined;
  }

  /**
   * 设置缓存
   */
  private setCache(key: LoaderKey, value: unknown): void {
    const cacheKey = this.normalizeKey(key);
    this.cache.set(cacheKey, {
      value,
      expiry: Date.now() + this.options.cacheExpiryMs,
    });
  }

  /**
   * 规范化键
   */
  private normalizeKey(key: LoaderKey): string {
    if (typeof key === 'string') {
      return key;
    }
    return JSON.stringify(key);
  }

  /**
   * 加载价格数据
   */
  async loadPrice(
    key: LoaderKey,
    fetchFn: (keys: readonly LoaderKey[]) => Promise<UnifiedPriceFeed[]>,
  ): Promise<UnifiedPriceFeed | null> {
    this.metrics.totalRequests++;

    const loader = this.getLoader<UnifiedPriceFeed | null>('price', async (keys) => {
      const results = await fetchFn(keys);
      return keys.map((key) => {
        const keyStr = this.normalizeKey(key);
        return results.find((r) => r.id === keyStr || r.symbol === keyStr) ?? null;
      });
    });

    try {
      return await loader.load(key);
    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to load price', { key, error });
      return null;
    }
  }

  /**
   * 加载多个价格数据
   */
  async loadManyPrices(
    keys: LoaderKey[],
    fetchFn: (keys: readonly LoaderKey[]) => Promise<UnifiedPriceFeed[]>,
  ): Promise<(UnifiedPriceFeed | null)[]> {
    this.metrics.totalRequests += keys.length;

    const loader = this.getLoader<UnifiedPriceFeed | null>('price', async (batchKeys) => {
      const results = await fetchFn(batchKeys);
      return batchKeys.map((key) => {
        const keyStr = this.normalizeKey(key);
        return results.find((r) => r.id === keyStr || r.symbol === keyStr) ?? null;
      });
    });

    try {
      const results = await loader.loadMany(keys);
      return results.map((result) => (result instanceof Error ? null : result));
    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to load prices', { keys, error });
      return keys.map(() => null);
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
    this.loaders.forEach((loader) => loader.clearAll());
    logger.info('DataLoader cache cleared');
  }

  /**
   * 清除特定键的缓存
   */
  clearCacheKey(key: LoaderKey): void {
    const cacheKey = this.normalizeKey(key);
    this.cache.delete(cacheKey);
  }

  /**
   * 获取指标
   */
  getMetrics(): {
    totalRequests: number;
    cacheHits: number;
    cacheHitRate: number;
    batchRequests: number;
    errors: number;
    errorRate: number;
  } {
    return {
      ...this.metrics,
      cacheHitRate:
        this.metrics.totalRequests > 0
          ? (this.metrics.cacheHits / this.metrics.totalRequests) * 100
          : 0,
      errorRate:
        this.metrics.totalRequests > 0
          ? (this.metrics.errors / this.metrics.totalRequests) * 100
          : 0,
    };
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      batchRequests: 0,
      errors: 0,
    };
  }
}

// ============================================================================
// 专用加载器
// ============================================================================

export class PriceFeedLoader extends OracleDataLoader {
  private fetchFn: (symbols: string[]) => Promise<UnifiedPriceFeed[]>;

  constructor(
    fetchFn: (symbols: string[]) => Promise<UnifiedPriceFeed[]>,
    options?: LoaderOptions,
  ) {
    super(options);
    this.fetchFn = fetchFn;
  }

  /**
   * 加载价格
   */
  async load(symbol: string): Promise<UnifiedPriceFeed | null> {
    return this.loadPrice(symbol, async (keys: readonly LoaderKey[]) => {
      const symbols = keys.map((k) => (typeof k === 'string' ? k : k.id));
      return this.fetchFn(symbols);
    });
  }

  /**
   * 加载多个价格
   */
  async loadMany(symbols: string[]): Promise<(UnifiedPriceFeed | null)[]> {
    return this.loadManyPrices(symbols, async (keys: readonly LoaderKey[]) => {
      const syms = keys.map((k) => (typeof k === 'string' ? k : k.id));
      return this.fetchFn(syms);
    });
  }
}

export class ProtocolLoader extends OracleDataLoader {
  private fetchFn: (protocols: string[]) => Promise<Array<{ protocol: string; data: unknown }>>;

  constructor(
    fetchFn: (protocols: string[]) => Promise<Array<{ protocol: string; data: unknown }>>,
    options?: LoaderOptions,
  ) {
    super(options);
    this.fetchFn = fetchFn;
  }

  /**
   * 加载协议数据
   */
  async load(protocol: string): Promise<unknown | null> {
    const loader = this.getLoader<unknown>('protocol', async (keys) => {
      const protocols = keys.map((k) => (typeof k === 'string' ? k : k.id));
      const results = await this.fetchFn(protocols);
      return keys.map((key) => {
        const keyStr = typeof key === 'string' ? key : key.id;
        return results.find((r) => r.protocol === keyStr)?.data ?? null;
      });
    });

    return loader.load(protocol);
  }
}

// ============================================================================
// 单例导出
// ============================================================================

export const oracleDataLoader = new OracleDataLoader();

// ============================================================================
// 便捷函数
// ============================================================================

export function createPriceFeedLoader(
  fetchFn: (symbols: string[]) => Promise<UnifiedPriceFeed[]>,
  options?: LoaderOptions,
): PriceFeedLoader {
  return new PriceFeedLoader(fetchFn, options);
}

export function createProtocolLoader(
  fetchFn: (protocols: string[]) => Promise<Array<{ protocol: string; data: unknown }>>,
  options?: LoaderOptions,
): ProtocolLoader {
  return new ProtocolLoader(fetchFn, options);
}

export function clearAllCache(): void {
  oracleDataLoader.clearCache();
}

export function getLoaderMetrics(): ReturnType<OracleDataLoader['getMetrics']> {
  return oracleDataLoader.getMetrics();
}
