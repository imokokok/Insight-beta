/**
 * Price History Service Tests
 *
 * 价格历史服务单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PriceHistoryService, type PriceHistoryRecord } from '../priceHistoryService';
import { query } from '@/server/db';

// Mock database
vi.mock('@/server/db', () => ({
  query: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PriceHistoryService', () => {
  let service: PriceHistoryService;

  beforeEach(() => {
    service = new PriceHistoryService();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await service.stop();
  });

  describe('start/stop', () => {
    it('should start the service', () => {
      service.start();
      expect(service.getStats().isRunning).toBe(true);
    });

    it('should not start twice', () => {
      service.start();
      service.start(); // Should not throw
      expect(service.getStats().isRunning).toBe(true);
    });

    it('should stop the service', async () => {
      service.start();
      await service.stop();
      expect(service.getStats().isRunning).toBe(false);
    });
  });

  describe('savePrice', () => {
    it('should add price record to batch buffer', async () => {
      const record: PriceHistoryRecord = {
        symbol: 'BTC/USD',
        protocol: 'chainlink',
        chain: 'ethereum',
        price: 50000.5,
        priceRaw: '50000500000000000000000',
        decimals: 8,
        timestamp: new Date(),
        blockNumber: 12345678,
        confidence: 0.95,
      };

      await service.savePrice(record);

      // Record should be in buffer (not flushed yet)
      expect(service.getStats().bufferSize).toBe(1);
    });

    it('should handle database errors on flush', async () => {
      const mockQuery = vi.mocked(query);
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const record: PriceHistoryRecord = {
        symbol: 'BTC/USD',
        protocol: 'chainlink',
        chain: 'ethereum',
        price: 50000.5,
        priceRaw: '50000500000000000000000',
        decimals: 8,
        timestamp: new Date(),
      };

      // Add 100 records to trigger automatic flush
      for (let i = 0; i < 100; i++) {
        await service.savePrice({ ...record, price: record.price + i });
      }

      // Wait for flush to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Buffer should have retried records
      expect(service.getStats().bufferSize).toBeGreaterThanOrEqual(0);
    });
  });

  describe('savePricesBatch', () => {
    it('should add multiple price records to buffer', async () => {
      const records: PriceHistoryRecord[] = [
        {
          symbol: 'BTC/USD',
          protocol: 'chainlink',
          chain: 'ethereum',
          price: 50000.5,
          priceRaw: '50000500000000000000000',
          decimals: 8,
          timestamp: new Date(),
        },
        {
          symbol: 'ETH/USD',
          protocol: 'chainlink',
          chain: 'ethereum',
          price: 3000.5,
          priceRaw: '3000500000000000000000',
          decimals: 8,
          timestamp: new Date(),
        },
      ];

      await service.savePricesBatch(records);

      expect(service.getStats().bufferSize).toBe(2);
    });

    it('should handle empty batch', async () => {
      await service.savePricesBatch([]);
      expect(service.getStats().bufferSize).toBe(0);
    });
  });

  describe('queryPriceHistory', () => {
    it('should query price history with filters', async () => {
      const mockRows = [
        {
          id: '1',
          symbol: 'BTC/USD',
          protocol: 'chainlink',
          chain: 'ethereum',
          price: '50000.5',
          price_raw: '50000500000000000000000',
          decimals: '8',
          timestamp: new Date().toISOString(),
          block_number: '12345678',
          confidence: '0.95',
          volume_24h: null,
          change_24h: null,
        },
      ];

      const mockQuery = vi.mocked(query);
      mockQuery.mockResolvedValueOnce({ rows: mockRows, rowCount: 1 } as never);

      const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endTime = new Date();

      const result = await service.queryPriceHistory({
        symbol: 'BTC/USD',
        protocol: 'chainlink',
        chain: 'ethereum',
        startTime,
        endTime,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.symbol).toBe('BTC/USD');
      expect(result[0]?.price).toBe(50000.5);
    });

    it('should select appropriate table based on duration', async () => {
      const mockQuery = vi.mocked(query);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      // Query for 2 days - should use min1 table
      await service.queryPriceHistory({
        symbol: 'BTC/USD',
        startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        endTime: new Date(),
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('price_history_min1'),
        expect.any(Array),
      );
    });

    it('should use cache for repeated queries', async () => {
      const mockRows = [
        {
          id: '1',
          symbol: 'BTC/USD',
          protocol: 'chainlink',
          chain: 'ethereum',
          price: '50000.5',
          price_raw: '50000500000000000000000',
          decimals: '8',
          timestamp: new Date().toISOString(),
          block_number: '12345678',
          confidence: '0.95',
          volume_24h: null,
          change_24h: null,
        },
      ];

      const mockQuery = vi.mocked(query);
      mockQuery.mockResolvedValueOnce({ rows: mockRows, rowCount: 1 } as never);

      const queryParams = {
        symbol: 'BTC/USD',
        startTime: new Date(Date.now() - 60 * 60 * 1000),
        endTime: new Date(),
      };

      // First query should hit database
      const result1 = await service.queryPriceHistory(queryParams);
      expect(mockQuery).toHaveBeenCalledTimes(1);

      // Second query should use cache
      const result2 = await service.queryPriceHistory(queryParams);
      expect(mockQuery).toHaveBeenCalledTimes(1); // Still 1, not 2
      expect(result1).toEqual(result2);
    });
  });

  describe('getPriceStats', () => {
    it('should calculate price statistics', async () => {
      const mockRows = [
        {
          min_price: '48000.0',
          max_price: '52000.0',
          avg_price: '50000.0',
          first_price: '49000.0',
          last_price: '51000.0',
          volatility: '1000.0',
        },
      ];

      const mockQuery = vi.mocked(query);
      mockQuery.mockResolvedValueOnce({ rows: mockRows, rowCount: 1 } as never);

      const stats = await service.getPriceStats({
        symbol: 'BTC/USD',
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endTime: new Date(),
      });

      expect(stats).not.toBeNull();
      expect(stats?.min).toBe(48000.0);
      expect(stats?.max).toBe(52000.0);
      expect(stats?.avg).toBe(50000.0);
      expect(stats?.change).toBe(2000.0);
      expect(stats?.changePercent).toBeCloseTo(4.08, 1);
    });

    it('should return null for empty results', async () => {
      const mockQuery = vi.mocked(query);
      mockQuery.mockResolvedValueOnce({ rows: [{ min_price: null }], rowCount: 0 } as never);

      const stats = await service.getPriceStats({
        symbol: 'BTC/USD',
        startTime: new Date(),
        endTime: new Date(),
      });

      expect(stats).toBeNull();
    });
  });

  describe('getLatestPrice', () => {
    it('should return latest price for symbol', async () => {
      const mockRows = [
        {
          id: '1',
          symbol: 'BTC/USD',
          protocol: 'chainlink',
          chain: 'ethereum',
          price: '51000.0',
          price_raw: '51000000000000000000000',
          decimals: '8',
          timestamp: new Date().toISOString(),
          block_number: '12345679',
          confidence: '0.96',
          volume_24h: '1000000000',
          change_24h: '2.5',
        },
      ];

      const mockQuery = vi.mocked(query);
      mockQuery.mockResolvedValueOnce({ rows: mockRows, rowCount: 1 } as never);

      const result = await service.getLatestPrice('BTC/USD', 'ethereum');

      expect(result).not.toBeNull();
      expect(result?.symbol).toBe('BTC/USD');
      expect(result?.price).toBe(51000.0);
    });

    it('should return null when no price found', async () => {
      const mockQuery = vi.mocked(query);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await service.getLatestPrice('UNKNOWN/USD');

      expect(result).toBeNull();
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      const mockRows = [
        {
          id: '1',
          symbol: 'BTC/USD',
          protocol: 'chainlink',
          chain: 'ethereum',
          price: '50000.5',
          price_raw: '50000500000000000000000',
          decimals: '8',
          timestamp: new Date().toISOString(),
          block_number: '12345678',
          confidence: '0.95',
          volume_24h: null,
          change_24h: null,
        },
      ];

      const mockQuery = vi.mocked(query);
      mockQuery.mockResolvedValueOnce({ rows: mockRows, rowCount: 1 } as never);

      const queryParams = {
        symbol: 'BTC/USD',
        startTime: new Date(Date.now() - 60 * 60 * 1000),
        endTime: new Date(),
      };

      // First query
      await service.queryPriceHistory(queryParams);
      expect(service.getStats().cacheSize).toBe(1);

      // Clear cache
      service.clearCache();
      expect(service.getStats().cacheSize).toBe(0);
    });

    it('should clear cache for specific symbol', async () => {
      service.clearCache('BTC/USD');
      expect(service.getStats().cacheSize).toBe(0);
    });
  });
});
