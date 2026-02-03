import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AggregationManager } from '../AggregationManager';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/server/websocket/priceStream', () => ({
  priceStreamManager: {
    broadcast: vi.fn(),
    getStats: vi.fn().mockReturnValue({
      totalClients: 5,
      totalSubscriptions: 10,
    }),
  },
}));

vi.mock('../../priceAggregationService', () => ({
  priceAggregationEngine: {
    aggregateMultipleSymbols: vi.fn().mockResolvedValue([
      {
        symbol: 'ETH/USD',
        prices: [{ protocol: 'chainlink', price: 2000, timestamp: Date.now() }],
        aggregatedPrice: 2000,
        deviation: 0.01,
      },
    ]),
  },
}));

describe('AggregationManager', () => {
  let manager: AggregationManager;
  const defaultSymbols = ['ETH/USD', 'BTC/USD'];
  const intervalMs = 1000;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    manager = new AggregationManager(defaultSymbols, intervalMs);
  });

  describe('start', () => {
    it('should start aggregation and run immediately', async () => {
      manager.start();

      // Wait for immediate execution
      await vi.advanceTimersByTimeAsync(0);

      const { priceAggregationEngine } = await import('../../priceAggregationService');
      expect(priceAggregationEngine.aggregateMultipleSymbols).toHaveBeenCalledWith(defaultSymbols);
    });

    it('should run aggregation at intervals', async () => {
      manager.start();

      await vi.advanceTimersByTimeAsync(0);

      const { priceAggregationEngine } = await import('../../priceAggregationService');
      expect(priceAggregationEngine.aggregateMultipleSymbols).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(intervalMs);
      expect(priceAggregationEngine.aggregateMultipleSymbols).toHaveBeenCalledTimes(2);
    });
  });

  describe('stop', () => {
    it('should stop aggregation', () => {
      manager.start();
      expect(manager.isRunning()).toBe(true);

      manager.stop();
      expect(manager.isRunning()).toBe(false);
    });
  });

  describe('aggregate', () => {
    it('should aggregate specific symbols', async () => {
      const symbols = ['LINK/USD'];
      const results = await manager.aggregate(symbols);

      const { priceAggregationEngine } = await import('../../priceAggregationService');
      expect(priceAggregationEngine.aggregateMultipleSymbols).toHaveBeenCalledWith(symbols);
      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe('ETH/USD');
    });

    it('should use default symbols when not provided', async () => {
      await manager.aggregate();

      const { priceAggregationEngine } = await import('../../priceAggregationService');
      expect(priceAggregationEngine.aggregateMultipleSymbols).toHaveBeenCalledWith(defaultSymbols);
    });
  });

  describe('isRunning', () => {
    it('should return false when not started', () => {
      expect(manager.isRunning()).toBe(false);
    });

    it('should return true when started', () => {
      manager.start();
      expect(manager.isRunning()).toBe(true);
    });
  });
});
