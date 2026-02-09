/**
 * Price Aggregator
 * 价格聚合器 - 聚合多个预言机的价格数据
 */

import { createLogger } from '@oracle-monitor/shared';

import type { AggregatedPrice, PriceSource } from './types';

export interface PriceAggregatorOptions {
  deviationThreshold: number;
  maxPriceAgeMs: number;
}

interface PricePoint {
  protocol: string;
  chain: string;
  price: number;
  timestamp: number;
  confidence: number;
}

export class PriceAggregator {
  private readonly logger: ReturnType<typeof createLogger>;
  private readonly deviationThreshold: number;
  private readonly maxPriceAgeMs: number;
  private readonly priceStore: Map<string, Map<string, PricePoint>> = new Map();

  constructor(options: PriceAggregatorOptions) {
    this.logger = createLogger({ serviceName: 'orchestrator-aggregator' });
    this.deviationThreshold = options.deviationThreshold;
    this.maxPriceAgeMs = options.maxPriceAgeMs;
  }

  /**
   * Initialize the aggregator
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing price aggregator', {
      deviationThreshold: this.deviationThreshold,
      maxPriceAgeMs: this.maxPriceAgeMs,
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

    this.logger.debug('Price added', { symbol, protocol, chain, price });
  }

  /**
   * Get aggregated price for a symbol
   */
  getAggregatedPrice(symbol: string): AggregatedPrice | null {
    const symbolStore = this.priceStore.get(symbol);
    if (!symbolStore || symbolStore.size === 0) {
      return null;
    }

    const now = Date.now();
    const validPrices: PricePoint[] = [];

    // Filter out stale prices
    for (const point of symbolStore.values()) {
      if (now - point.timestamp <= this.maxPriceAgeMs) {
        validPrices.push(point);
      }
    }

    if (validPrices.length === 0) {
      this.logger.warn('No valid prices for symbol', { symbol });
      return null;
    }

    // Calculate aggregated price using median
    const sortedPrices = validPrices.map((p) => p.price).sort((a, b) => a - b);
    const medianPrice = this.calculateMedian(sortedPrices);

    // Calculate deviation
    const maxPrice = Math.max(...sortedPrices);
    const minPrice = Math.min(...sortedPrices);
    const deviation = maxPrice > 0 ? ((maxPrice - minPrice) / minPrice) * 100 : 0;

    // Check for significant deviation
    if (deviation > this.deviationThreshold * 100) {
      this.logger.warn('Significant price deviation detected', {
        symbol,
        deviation: deviation.toFixed(2) + '%',
        threshold: (this.deviationThreshold * 100).toFixed(2) + '%',
        minPrice,
        maxPrice,
      });
    }

    // Build sources
    const sources: PriceSource[] = validPrices.map((p) => ({
      protocol: p.protocol,
      chain: p.chain,
      price: p.price,
      timestamp: p.timestamp,
      confidence: p.confidence,
    }));

    // Calculate confidence based on number of sources and deviation
    const confidence = this.calculateConfidence(validPrices.length, deviation);

    return {
      symbol,
      price: medianPrice,
      timestamp: now,
      sources,
      aggregatedPrice: medianPrice,
      confidence,
      deviation,
    };
  }

  /**
   * Get aggregated prices for all symbols
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
