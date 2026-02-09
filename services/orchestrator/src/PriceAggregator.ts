/**
 * Price Aggregator
 * 价格聚合器 - 聚合多个预言机的价格数据
 */

import { createLogger } from '@oracle-monitor/shared';

import type { AggregatedPrice, PriceSource } from './types';

export interface PriceAggregatorOptions {
  deviationThreshold: number;
  maxPriceAgeMs: number;
  aggregationCacheTtlMs?: number; // 聚合结果缓存时间
}

interface PricePoint {
  protocol: string;
  chain: string;
  price: number;
  timestamp: number;
  confidence: number;
}

// 聚合结果缓存条目
interface AggregationCacheEntry {
  aggregatedPrice: AggregatedPrice;
  timestamp: number;
  priceHash: string; // 用于检测价格是否变化
}

export class PriceAggregator {
  private readonly logger: ReturnType<typeof createLogger>;
  private readonly deviationThreshold: number;
  private readonly maxPriceAgeMs: number;
  private readonly aggregationCacheTtlMs: number;
  private readonly priceStore: Map<string, Map<string, PricePoint>> = new Map();
  // 聚合结果缓存 - P0 优化：避免重复计算
  private readonly aggregationCache: Map<string, AggregationCacheEntry> = new Map();

  constructor(options: PriceAggregatorOptions) {
    this.logger = createLogger({ serviceName: 'orchestrator-aggregator' });
    this.deviationThreshold = options.deviationThreshold;
    this.maxPriceAgeMs = options.maxPriceAgeMs;
    this.aggregationCacheTtlMs = options.aggregationCacheTtlMs ?? 1000; // 默认1秒缓存
  }

  /**
   * Initialize the aggregator
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing price aggregator', {
      deviationThreshold: this.deviationThreshold,
      maxPriceAgeMs: this.maxPriceAgeMs,
      aggregationCacheTtlMs: this.aggregationCacheTtlMs,
    });
  }

  /**
   * Add a price update from a service
   */
  addPrice(
    symbol: string,
    protocol: string,
    chain: string,
    price: number,
    timestamp: number,
    confidence: number = 0.95,
  ): void {
    if (!this.priceStore.has(symbol)) {
      this.priceStore.set(symbol, new Map());
    }

    const symbolStore = this.priceStore.get(symbol)!;
    const key = `${protocol}-${chain}`;

    symbolStore.set(key, {
      protocol,
      chain,
      price,
      timestamp,
      confidence,
    });

    // 清除该 symbol 的聚合缓存，因为价格已更新
    this.aggregationCache.delete(symbol);

    this.logger.debug('Price added', { symbol, protocol, chain, price });
  }

  /**
   * 生成价格数据的哈希值，用于检测变化
   */
  private generatePriceHash(prices: PricePoint[]): string {
    return prices
      .map((p) => `${p.protocol}-${p.chain}-${p.price.toFixed(8)}-${p.timestamp}`)
      .sort()
      .join('|');
  }

  /**
   * Get aggregated price for a symbol
   * P0 优化：添加聚合结果缓存
   */
  getAggregatedPrice(symbol: string): AggregatedPrice | null {
    const now = Date.now();

    // 1. 获取有效价格数据
    const symbolStore = this.priceStore.get(symbol);
    if (!symbolStore || symbolStore.size === 0) {
      return null;
    }

    const validPrices: PricePoint[] = [];
    for (const point of symbolStore.values()) {
      if (now - point.timestamp <= this.maxPriceAgeMs) {
        validPrices.push(point);
      }
    }

    if (validPrices.length === 0) {
      this.logger.warn('No valid prices for symbol', { symbol });
      return null;
    }

    // 2. 检查缓存是否有效
    const currentPriceHash = this.generatePriceHash(validPrices);
    const cached = this.aggregationCache.get(symbol);

    if (cached) {
      const isCacheValid =
        now - cached.timestamp < this.aggregationCacheTtlMs &&
        cached.priceHash === currentPriceHash;

      if (isCacheValid) {
        this.logger.debug('Aggregation cache hit', { symbol });
        return cached.aggregatedPrice;
      }
    }

    // 3. 计算聚合价格
    const sortedPrices = validPrices.map((p) => p.price).sort((a, b) => a - b);
    const medianPrice = this.calculateMedian(sortedPrices);

    // 4. 计算偏差
    const maxPrice = Math.max(...sortedPrices);
    const minPrice = Math.min(...sortedPrices);
    const deviation = maxPrice > 0 ? ((maxPrice - minPrice) / minPrice) * 100 : 0;

    // 5. 检查显著偏差
    if (deviation > this.deviationThreshold * 100) {
      this.logger.warn('Significant price deviation detected', {
        symbol,
        deviation: deviation.toFixed(2) + '%',
        threshold: (this.deviationThreshold * 100).toFixed(2) + '%',
        minPrice,
        maxPrice,
      });
    }

    // 6. 构建结果
    const sources: PriceSource[] = validPrices.map((p) => ({
      protocol: p.protocol,
      chain: p.chain,
      price: p.price,
      timestamp: p.timestamp,
      confidence: p.confidence,
    }));

    const confidence = this.calculateConfidence(validPrices.length, deviation);

    const aggregatedPrice: AggregatedPrice = {
      symbol,
      price: medianPrice,
      timestamp: now,
      sources,
      aggregatedPrice: medianPrice,
      confidence,
      deviation,
    };

    // 7. 更新缓存
    this.aggregationCache.set(symbol, {
      aggregatedPrice,
      timestamp: now,
      priceHash: currentPriceHash,
    });

    return aggregatedPrice;
  }

  /**
   * Get aggregated prices for all symbols
   * P0 优化：批量获取时复用缓存
   */
  getAllAggregatedPrices(): AggregatedPrice[] {
    const results: AggregatedPrice[] = [];

    for (const symbol of this.priceStore.keys()) {
      const aggregated = this.getAggregatedPrice(symbol);
      if (aggregated) {
        results.push(aggregated);
      }
    }

    return results;
  }

  /**
   * Get symbols with significant price deviations
   */
  getDeviatedSymbols(threshold?: number): Array<{ symbol: string; deviation: number }> {
    const actualThreshold = threshold ?? this.deviationThreshold * 100;
    const results: Array<{ symbol: string; deviation: number }> = [];

    for (const symbol of this.priceStore.keys()) {
      const aggregated = this.getAggregatedPrice(symbol);
      if (aggregated && aggregated.deviation > actualThreshold) {
        results.push({
          symbol,
          deviation: aggregated.deviation,
        });
      }
    }

    return results.sort((a, b) => b.deviation - a.deviation);
  }

  /**
   * Get price comparison across protocols for a symbol
   */
  getPriceComparison(symbol: string): {
    symbol: string;
    sources: PriceSource[];
    aggregatedPrice: number;
    deviation: number;
  } | null {
    const aggregated = this.getAggregatedPrice(symbol);
    if (!aggregated) {
      return null;
    }

    return {
      symbol,
      sources: aggregated.sources,
      aggregatedPrice: aggregated.aggregatedPrice,
      deviation: aggregated.deviation,
    };
  }

  /**
   * Clear old price data
   */
  cleanupOldData(maxAgeMs: number = this.maxPriceAgeMs * 2): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [symbol, symbolStore] of this.priceStore) {
      for (const [key, point] of symbolStore) {
        if (now - point.timestamp > maxAgeMs) {
          symbolStore.delete(key);
          cleanedCount++;
        }
      }

      // Remove empty symbol stores
      if (symbolStore.size === 0) {
        this.priceStore.delete(symbol);
        // 同时清除聚合缓存
        this.aggregationCache.delete(symbol);
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug('Cleaned up old price data', { cleanedCount });
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalSymbols: number;
    totalPricePoints: number;
    deviatedSymbols: number;
    cacheHitRate: number;
  } {
    let totalPricePoints = 0;
    let deviatedSymbols = 0;

    for (const symbol of this.priceStore.keys()) {
      const symbolStore = this.priceStore.get(symbol)!;
      totalPricePoints += symbolStore.size;

      const aggregated = this.getAggregatedPrice(symbol);
      if (aggregated && aggregated.deviation > this.deviationThreshold * 100) {
        deviatedSymbols++;
      }
    }

    return {
      totalSymbols: this.priceStore.size,
      totalPricePoints,
      deviatedSymbols,
      cacheHitRate: this.aggregationCache.size / Math.max(1, this.priceStore.size),
    };
  }

  /**
   * Calculate median
   */
  private calculateMedian(sortedValues: number[]): number {
    const n = sortedValues.length;
    if (n === 0) return 0;
    if (n === 1) return sortedValues[0];

    const mid = Math.floor(n / 2);
    if (n % 2 === 0) {
      return (sortedValues[mid - 1] + sortedValues[mid]) / 2;
    }
    return sortedValues[mid];
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(sourceCount: number, deviation: number): number {
    // Base confidence from number of sources
    let confidence = Math.min(0.5 + sourceCount * 0.1, 0.95);

    // Reduce confidence if deviation is high
    if (deviation > this.deviationThreshold * 100) {
      confidence *= 0.8;
    }

    return Math.max(0, Math.min(1, confidence));
  }
}
