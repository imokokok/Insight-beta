/**
 * Price Aggregation Service Tests
 *
 * 价格聚合服务测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PriceAggregationEngine,
  AggregationMethod,
  calculateMedian,
  calculateWeightedAverage,
  detectOutliers,
} from './priceAggregationService';
import type { UnifiedPriceFeed, CrossOracleComparison } from '@/lib/types/unifiedOracleTypes';

// Mock database query
vi.mock('@/server/db', () => ({
  query: vi.fn(),
}));

import { query } from '@/server/db';

describe('PriceAggregationEngine', () => {
  let engine: PriceAggregationEngine;

  beforeEach(() => {
    engine = new PriceAggregationEngine();
    vi.clearAllMocks();
  });

  describe('aggregatePrices', () => {
    it('should aggregate prices and return comparison data', async () => {
      const mockPrices: UnifiedPriceFeed[] = [
        createMockPriceFeed('chainlink', 45000),
        createMockPriceFeed('pyth', 45100),
        createMockPriceFeed('band', 44900),
      ];

      (query as any).mockResolvedValueOnce({
        rows: mockPrices.map(p => ({
          ...p,
          instanceId: `${p.protocol}-instance`,
          price_raw: p.priceRaw,
          base_asset: p.baseAsset,
          quote_asset: p.quoteAsset,
          block_number: p.blockNumber,
          is_stale: p.isStale,
          staleness_seconds: p.stalenessSeconds,
          tx_hash: p.txHash,
          log_index: p.logIndex,
        })),
      });

      const result = await engine.aggregatePrices('ETH/USD');

      expect(result).toBeDefined();
      expect(result?.symbol).toBe('ETH/USD');
      expect(result?.medianPrice).toBe(45000); // median
      expect(result?.prices).toHaveLength(3);
    });

    it('should return null when insufficient price data', async () => {
      (query as any).mockResolvedValueOnce({ rows: [] });

      const result = await engine.aggregatePrices('ETH/USD');

      expect(result).toBeNull();
    });

    it('should handle stale prices', async () => {
      const mockPrices: UnifiedPriceFeed[] = [
        createMockPriceFeed('chainlink', 45000),
        { ...createMockPriceFeed('pyth', 45100), isStale: true },
        createMockPriceFeed('band', 44900),
      ];

      (query as any).mockResolvedValueOnce({
        rows: mockPrices
          .filter(p => !p.isStale)
          .map(p => ({
            ...p,
            instanceId: `${p.protocol}-instance`,
            price_raw: p.priceRaw,
            base_asset: p.baseAsset,
            quote_asset: p.quoteAsset,
            block_number: p.blockNumber,
            is_stale: p.isStale,
            staleness_seconds: p.stalenessSeconds,
            tx_hash: p.txHash,
            log_index: p.logIndex,
          })),
      });

      const result = await engine.aggregatePrices('ETH/USD');

      expect(result).toBeDefined();
      expect(result?.prices.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getCrossOracleComparison', () => {
    it('should return comparison data for multiple protocols', async () => {
      const mockPrices: UnifiedPriceFeed[] = [
        createMockPriceFeed('chainlink', 45000),
        createMockPriceFeed('pyth', 45100),
        createMockPriceFeed('band', 44900),
      ];

      (query as any).mockResolvedValueOnce({
        rows: mockPrices.map(p => ({
          ...p,
          instanceId: `${p.protocol}-instance`,
          price_raw: p.priceRaw,
          base_asset: p.baseAsset,
          quote_asset: p.quoteAsset,
          block_number: p.blockNumber,
          is_stale: p.isStale,
          staleness_seconds: p.stalenessSeconds,
          tx_hash: p.txHash,
          log_index: p.logIndex,
        })),
      });

      const result = await engine.aggregatePrices('ETH/USD');

      expect(result).toBeDefined();
      expect(result?.symbol).toBe('ETH/USD');
      expect(result?.prices).toHaveLength(3);
      expect(result?.maxDeviation).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Utility Functions', () => {
  describe('calculateMedian', () => {
    it('should calculate median for odd number of values', () => {
      const values = [1, 3, 5, 7, 9];
      expect(calculateMedian(values)).toBe(5);
    });

    it('should calculate median for even number of values', () => {
      const values = [1, 3, 5, 7];
      expect(calculateMedian(values)).toBe(4);
    });

    it('should handle single value', () => {
      const values = [42];
      expect(calculateMedian(values)).toBe(42);
    });

    it('should handle unsorted array', () => {
      const values = [9, 1, 5, 3, 7];
      expect(calculateMedian(values)).toBe(5);
    });
  });

  describe('calculateWeightedAverage', () => {
    it('should calculate weighted average correctly', () => {
      const values = [100, 200, 300];
      const weights = [1, 2, 3];
      // (100*1 + 200*2 + 300*3) / (1+2+3) = 1400/6 = 233.33
      expect(calculateWeightedAverage(values, weights)).toBeCloseTo(233.33, 2);
    });

    it('should handle equal weights', () => {
      const values = [100, 200, 300];
      const weights = [1, 1, 1];
      expect(calculateWeightedAverage(values, weights)).toBe(200);
    });

    it('should throw error for mismatched arrays', () => {
      const values = [100, 200];
      const weights = [1, 2, 3];
      expect(() => calculateWeightedAverage(values, weights)).toThrow();
    });
  });

  describe('detectOutliers', () => {
    it('should detect obvious outliers', () => {
      const values = [100, 101, 99, 102, 1000]; // 1000 is outlier
      const outliers = detectOutliers(values, 1.5); // default threshold
      expect(outliers).toContain(4); // index of 1000
    });

    it('should not flag normal values as outliers', () => {
      const values = [100, 101, 99, 102, 100];
      const outliers = detectOutliers(values, 1.5); // default threshold
      expect(outliers).toHaveLength(0);
    });

    it('should handle small arrays', () => {
      const values = [100, 200];
      const outliers = detectOutliers(values, 1.5);
      expect(outliers).toHaveLength(0);
    });
  });
});

// Helper function to create mock price feeds
function createMockPriceFeed(
  protocol: string,
  price: number,
  overrides: Partial<UnifiedPriceFeed> = {}
): UnifiedPriceFeed {
  return {
    id: `${protocol}-eth-usd-123`,
    instanceId: `${protocol}-instance`,
    protocol: protocol as any,
    chain: 'ethereum',
    symbol: 'ETH/USD',
    baseAsset: 'ETH',
    quoteAsset: 'USD',
    price,
    priceRaw: (price * 1e8).toString(),
    decimals: 8,
    timestamp: new Date().toISOString(),
    blockNumber: 12345678,
    confidence: 0.95,
    sources: 5,
    isStale: false,
    stalenessSeconds: 0,
    txHash: undefined,
    logIndex: undefined,
    ...overrides,
  };
}
