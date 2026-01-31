/**
 * Price Health Check Tests
 *
 * priceHealthCheck.ts 模块的单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('@/server/db', () => ({
  query: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/server/notifications', () => ({
  notifyAlert: vi.fn(),
}));

import { query } from '@/server/db';
import { logger } from '@/lib/logger';
import { notifyAlert } from '@/server/notifications';

// Import the module under test
import {
  checkSymbolHealth,
  runHealthCheck,
  detectAnomalies,
  getHealthHistory,
  getHealthCheckConfig,
  updateHealthCheckConfig,
  startHealthCheckScheduler,
} from './priceHealthCheck';

describe('priceHealthCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  // ============================================================================
  // checkSymbolHealth Tests
  // ============================================================================

  describe('checkSymbolHealth', () => {
    it('should return healthy status for valid price data', async () => {
      const now = new Date();
      const mockRows = [
        {
          price: 3500,
          timestamp: now.toISOString(),
          protocol: 'chainlink',
          chain: 'ethereum',
        },
        {
          price: 3501,
          timestamp: new Date(now.getTime() - 1000).toISOString(),
          protocol: 'pyth',
          chain: 'solana',
        },
        {
          price: 3499,
          timestamp: new Date(now.getTime() - 2000).toISOString(),
          protocol: 'band',
          chain: 'cosmos',
        },
      ];

      vi.mocked(query).mockResolvedValueOnce({ rows: mockRows } as never);

      const result = await checkSymbolHealth('ETH/USD');

      expect(result.symbol).toBe('ETH/USD');
      expect(result.isHealthy).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.price).toBe(3500);
    });

    it('should detect stale price data', async () => {
      const oldTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      const mockRows = [
        {
          price: 3500,
          timestamp: oldTime.toISOString(),
          protocol: 'chainlink',
          chain: 'ethereum',
        },
      ];

      vi.mocked(query).mockResolvedValueOnce({ rows: mockRows } as never);

      const result = await checkSymbolHealth('ETH/USD');

      expect(result.isHealthy).toBe(false);
      expect(result.issues.some((i) => i.includes('过期'))).toBe(true);
    });

    it('should detect insufficient data sources', async () => {
      const now = new Date();
      const mockRows = [
        {
          price: 3500,
          timestamp: now.toISOString(),
          protocol: 'chainlink',
          chain: 'ethereum',
        },
      ];

      vi.mocked(query).mockResolvedValueOnce({ rows: mockRows } as never);

      const result = await checkSymbolHealth('ETH/USD');

      expect(result.isHealthy).toBe(false);
      expect(result.issues.some((i) => i.includes('数据源不足'))).toBe(true);
    });

    it('should detect price deviation', async () => {
      const now = new Date();
      const mockRows = [
        {
          price: 4000, // Significantly higher
          timestamp: now.toISOString(),
          protocol: 'chainlink',
          chain: 'ethereum',
        },
        {
          price: 3500,
          timestamp: new Date(now.getTime() - 1000).toISOString(),
          protocol: 'pyth',
          chain: 'solana',
        },
        {
          price: 3501,
          timestamp: new Date(now.getTime() - 2000).toISOString(),
          protocol: 'band',
          chain: 'cosmos',
        },
      ];

      vi.mocked(query).mockResolvedValueOnce({ rows: mockRows } as never);

      const result = await checkSymbolHealth('ETH/USD');

      expect(result.isHealthy).toBe(false);
      expect(result.issues.some((i) => i.includes('偏差'))).toBe(true);
    });

    it('should handle no price data', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never);

      const result = await checkSymbolHealth('ETH/USD');

      expect(result.isHealthy).toBe(false);
      expect(result.issues).toContain('无价格数据');
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(query).mockRejectedValueOnce(new Error('DB error'));

      const result = await checkSymbolHealth('ETH/USD');

      expect(result.isHealthy).toBe(false);
      expect(result.issues.some((i) => i.includes('检查失败'))).toBe(true);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // runHealthCheck Tests
  // ============================================================================

  describe('runHealthCheck', () => {
    it('should check all symbols when none specified', async () => {
      const mockSymbols = [{ symbol: 'ETH/USD' }, { symbol: 'BTC/USD' }];
      const mockPriceData = [
        {
          price: 3500,
          timestamp: new Date().toISOString(),
          protocol: 'chainlink',
          chain: 'ethereum',
        },
      ];

      vi.mocked(query)
        .mockResolvedValueOnce({ rows: mockSymbols } as never) // Get symbols
        .mockResolvedValueOnce({ rows: mockPriceData } as never) // ETH/USD
        .mockResolvedValueOnce({ rows: mockPriceData } as never); // BTC/USD

      const result = await runHealthCheck();

      expect(result.symbols).toHaveLength(2);
      expect(result.summary.total).toBe(2);
      expect(logger.info).toHaveBeenCalledWith('Price health check completed', expect.any(Object));
    });

    it('should check specified symbols only', async () => {
      const mockPriceData = [
        {
          price: 3500,
          timestamp: new Date().toISOString(),
          protocol: 'chainlink',
          chain: 'ethereum',
        },
      ];

      vi.mocked(query).mockResolvedValueOnce({ rows: mockPriceData } as never);

      const result = await runHealthCheck(['ETH/USD']);

      expect(result.symbols).toHaveLength(1);
      expect(result.symbols[0]!.symbol).toBe('ETH/USD');
    });

    it('should calculate summary correctly', async () => {
      const now = new Date();
      const mockSymbols = [{ symbol: 'ETH/USD' }, { symbol: 'BTC/USD' }];

      // ETH - healthy
      const healthyData = [
        { price: 3500, timestamp: now.toISOString(), protocol: 'chainlink', chain: 'ethereum' },
        { price: 3501, timestamp: now.toISOString(), protocol: 'pyth', chain: 'solana' },
        { price: 3499, timestamp: now.toISOString(), protocol: 'band', chain: 'cosmos' },
      ];

      // BTC - stale
      const staleData = [
        {
          price: 60000,
          timestamp: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
          protocol: 'chainlink',
          chain: 'ethereum',
        },
      ];

      vi.mocked(query)
        .mockResolvedValueOnce({ rows: mockSymbols } as never)
        .mockResolvedValueOnce({ rows: healthyData } as never)
        .mockResolvedValueOnce({ rows: staleData } as never);

      const result = await runHealthCheck();

      expect(result.summary.total).toBe(2);
      expect(result.summary.healthy).toBe(1);
      expect(result.summary.stale).toBe(1);
      expect(result.overallHealthy).toBe(false);
    });

    it('should throw error on database failure', async () => {
      vi.mocked(query).mockRejectedValueOnce(new Error('DB error'));

      await expect(runHealthCheck()).rejects.toThrow('DB error');
      expect(logger.error).toHaveBeenCalledWith('Health check failed', expect.any(Object));
    });
  });

  // ============================================================================
  // detectAnomalies Tests
  // ============================================================================

  describe('detectAnomalies', () => {
    it('should create alerts for unhealthy symbols', async () => {
      const now = new Date();
      const mockSymbols = [{ symbol: 'ETH/USD' }];
      const staleData = [
        {
          price: 3500,
          timestamp: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
          protocol: 'chainlink',
          chain: 'ethereum',
        },
      ];

      vi.mocked(query)
        .mockResolvedValueOnce({ rows: mockSymbols } as never) // Get symbols
        .mockResolvedValueOnce({ rows: staleData } as never) // Price data
        .mockResolvedValueOnce({ rows: [] } as never) // Check existing alerts
        .mockResolvedValueOnce({ rows: [] } as never) // Insert alert
        .mockResolvedValueOnce({ rows: [] } as never); // Update resolved

      await detectAnomalies();

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO unified_price_alerts'),
        expect.any(Array),
      );
      expect(notifyAlert).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should skip if recent alert exists', async () => {
      const now = new Date();
      const mockSymbols = [{ symbol: 'ETH/USD' }];
      const staleData = [
        {
          price: 3500,
          timestamp: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
          protocol: 'chainlink',
          chain: 'ethereum',
        },
      ];

      vi.mocked(query)
        .mockResolvedValueOnce({ rows: mockSymbols } as never)
        .mockResolvedValueOnce({ rows: staleData } as never)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] } as never); // Existing alert

      await detectAnomalies();

      expect(notifyAlert).not.toHaveBeenCalled();
    });

    it('should mark healthy symbols as resolved', async () => {
      const now = new Date();
      const mockSymbols = [{ symbol: 'ETH/USD' }];
      const healthyData = [
        { price: 3500, timestamp: now.toISOString(), protocol: 'chainlink', chain: 'ethereum' },
        { price: 3501, timestamp: now.toISOString(), protocol: 'pyth', chain: 'solana' },
        { price: 3499, timestamp: now.toISOString(), protocol: 'band', chain: 'cosmos' },
      ];

      vi.mocked(query)
        .mockResolvedValueOnce({ rows: mockSymbols } as never)
        .mockResolvedValueOnce({ rows: healthyData } as never)
        .mockResolvedValueOnce({ rows: [] } as never); // Update resolved

      await detectAnomalies();

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE unified_price_alerts'),
        expect.any(Array),
      );
    });
  });

  // ============================================================================
  // getHealthHistory Tests
  // ============================================================================

  describe('getHealthHistory', () => {
    it('should return health history for symbol', async () => {
      const mockHistory = [
        { hour: '2024-01-01 10:00:00', is_healthy: true },
        { hour: '2024-01-01 09:00:00', is_healthy: false },
      ];

      vi.mocked(query).mockResolvedValueOnce({ rows: mockHistory } as never);

      const result = await getHealthHistory('ETH/USD', 24);

      expect(result).toHaveLength(2);
      expect(result[0]!.isHealthy).toBe(true);
      expect(result[1]!.isHealthy).toBe(false);
    });

    it('should return empty array on error', async () => {
      vi.mocked(query).mockRejectedValueOnce(new Error('DB error'));

      const result = await getHealthHistory('ETH/USD');

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Config Tests
  // ============================================================================

  describe('getHealthCheckConfig', () => {
    it('should return default config', () => {
      const config = getHealthCheckConfig();

      expect(config.maxPriceAgeMs).toBe(5 * 60 * 1000);
      expect(config.maxDeviationPercent).toBe(2);
      expect(config.minDataPoints).toBe(3);
      expect(config.checkIntervalMs).toBe(60 * 1000);
    });
  });

  describe('updateHealthCheckConfig', () => {
    it('should update config values', () => {
      const newConfig = updateHealthCheckConfig({
        maxPriceAgeMs: 10 * 60 * 1000,
        maxDeviationPercent: 5,
      });

      expect(newConfig.maxPriceAgeMs).toBe(10 * 60 * 1000);
      expect(newConfig.maxDeviationPercent).toBe(5);
      expect(newConfig.minDataPoints).toBe(3); // Unchanged
      expect(logger.info).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Scheduler Tests
  // ============================================================================

  describe('startHealthCheckScheduler', () => {
    it('should start scheduler and return stop function', () => {
      const stop = startHealthCheckScheduler();

      expect(typeof stop).toBe('function');
      expect(logger.info).toHaveBeenCalledWith(
        'Starting price health check scheduler',
        expect.any(Object),
      );

      stop();
      expect(logger.info).toHaveBeenCalledWith('Price health check scheduler stopped');
    });

    it('should run check on interval', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [] } as never);

      startHealthCheckScheduler({ checkIntervalMs: 60000 });

      // Wait for initial execution
      await vi.advanceTimersByTimeAsync(100);

      expect(query).toHaveBeenCalled();

      // Advance to next interval
      await vi.advanceTimersByTimeAsync(60000);

      expect(query).toHaveBeenCalledTimes(2);
    });
  });
});
