/**
 * OracleClientBase 测试
 *
 * 测试预言机客户端基础类型和工具函数
 * 包括：价格陈旧度检查、数据新鲜度计算、价格格式化、符号解析、地址验证等
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isPriceStale,
  normalizeSymbol,
  withRetry,
  DEFAULT_STALENESS_THRESHOLDS,
  calculateDataFreshness,
  type OracleClientConfig,
  type HealthStatus,
} from './oracleClientBase';
import { calculateDeviation } from '@/lib/utils/math';
import { logger } from '@/lib/logger';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('isPriceStale', () => {
  it('should return true for stale price', () => {
    const timestamp = Math.floor(Date.now() / 1000) - 100;
    expect(isPriceStale(timestamp, 60)).toBe(true);
  });

  it('should return false for fresh price', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    expect(isPriceStale(timestamp, 60)).toBe(false);
  });

  it('should handle edge case at threshold', () => {
    const timestamp = Math.floor(Date.now() / 1000) - 60;
    expect(isPriceStale(timestamp, 60)).toBe(false);
  });

  it('should handle zero threshold', () => {
    const timestamp = Math.floor(Date.now() / 1000) - 1;
    expect(isPriceStale(timestamp, 0)).toBe(true);
  });

  it('should handle future timestamp', () => {
    const timestamp = Math.floor(Date.now() / 1000) + 100;
    expect(isPriceStale(timestamp, 60)).toBe(false);
  });
});

describe('calculateDataFreshness - 数据新鲜度计算', () => {
  it('should return isStale=false for fresh data', () => {
    const timestamp = new Date(Date.now() - 30 * 1000); // 30 seconds ago
    const result = calculateDataFreshness(timestamp, 300);
    expect(result.isStale).toBe(false);
    expect(result.stalenessSeconds).toBe(0);
  });

  it('should return isStale=true for stale data', () => {
    const timestamp = new Date(Date.now() - 400 * 1000); // 400 seconds ago
    const result = calculateDataFreshness(timestamp, 300);
    expect(result.isStale).toBe(true);
    expect(result.stalenessSeconds).toBeGreaterThan(300);
  });

  it('should handle timestamp as number (milliseconds)', () => {
    const timestampMs = Date.now() - 400 * 1000;
    const result = calculateDataFreshness(timestampMs, 300);
    expect(result.isStale).toBe(true);
  });

  it('should use default threshold of 300 seconds', () => {
    const timestamp = new Date(Date.now() - 400 * 1000);
    const result = calculateDataFreshness(timestamp);
    expect(result.isStale).toBe(true);
  });

  it('should handle edge case at threshold boundary', () => {
    const timestamp = new Date(Date.now() - 300 * 1000); // Exactly 300 seconds
    const result = calculateDataFreshness(timestamp, 300);
    expect(result.isStale).toBe(false);
  });

  it('should return 0 stalenessSeconds when not stale', () => {
    const timestamp = new Date(Date.now() - 100 * 1000);
    const result = calculateDataFreshness(timestamp, 300);
    expect(result.isStale).toBe(false);
    expect(result.stalenessSeconds).toBe(0);
  });
});

describe('normalizeSymbol', () => {
  it('should convert to uppercase', () => {
    expect(normalizeSymbol('eth/usd')).toBe('ETH/USD');
  });

  it('should replace hyphens with slashes', () => {
    expect(normalizeSymbol('ETH-USD')).toBe('ETH/USD');
  });

  it('should handle mixed case', () => {
    expect(normalizeSymbol('Eth-Usd')).toBe('ETH/USD');
  });

  it('should handle already normalized symbol', () => {
    expect(normalizeSymbol('ETH/USD')).toBe('ETH/USD');
  });

  it('should handle multiple hyphens', () => {
    expect(normalizeSymbol('ETH-USD-PERP')).toBe('ETH/USD/PERP');
  });

  it('should handle empty string', () => {
    expect(normalizeSymbol('')).toBe('');
  });
});

describe('calculateDeviation', () => {
  it('should calculate deviation correctly', () => {
    expect(calculateDeviation(110, 100)).toBe(10);
  });

  it('should return 0 when reference price is 0', () => {
    expect(calculateDeviation(100, 0)).toBe(0);
  });

  it('should calculate signed deviation', () => {
    expect(calculateDeviation(90, 100)).toBe(-10);
  });

  it('should calculate zero deviation', () => {
    expect(calculateDeviation(100, 100)).toBe(0);
  });

  it('should handle negative prices', () => {
    // calculateDeviation returns ((price - reference) / reference) * 100
    // For negative prices: ((-110) - (-100)) / (-100) * 100 = (-10 / -100) * 100 = 10
    expect(calculateDeviation(-110, -100)).toBe(10);
  });

  it('should handle large numbers', () => {
    expect(calculateDeviation(1000000, 500000)).toBe(100);
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should succeed on first try', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    const result = await withRetry(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('First error'))
      .mockRejectedValueOnce(new Error('Second error'))
      .mockResolvedValue('success');

    const result = await withRetry(operation, 3);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('should throw after max retries', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Persistent error'));

    await expect(withRetry(operation, 2)).rejects.toThrow('Persistent error');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should use exponential backoff', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('Error 1'))
      .mockRejectedValueOnce(new Error('Error 2'))
      .mockResolvedValue('success');

    const start = Date.now();
    await withRetry(operation, 3, 100);
    const duration = Date.now() - start;

    // Should have delays: 100ms, 200ms = ~300ms minimum
    expect(duration).toBeGreaterThanOrEqual(250);
  });

  it('should handle non-Error rejections', async () => {
    const operation = vi.fn().mockRejectedValue('string error');

    await expect(withRetry(operation, 1)).rejects.toThrow('string error');
  });

  it('should use default 3 retries', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Always fails'));

    await expect(withRetry(operation)).rejects.toThrow('Always fails');
    expect(operation).toHaveBeenCalledTimes(3);
  });
});

describe('DEFAULT_STALENESS_THRESHOLDS', () => {
  it('should have all protocol thresholds defined', () => {
    expect(DEFAULT_STALENESS_THRESHOLDS.PYTH).toBe(60);
    expect(DEFAULT_STALENESS_THRESHOLDS.CHAINLINK).toBe(3600);
    expect(DEFAULT_STALENESS_THRESHOLDS.BAND).toBe(300);
    expect(DEFAULT_STALENESS_THRESHOLDS.API3).toBe(300);
    expect(DEFAULT_STALENESS_THRESHOLDS.REDSTONE).toBe(60);
    expect(DEFAULT_STALENESS_THRESHOLDS.SWITCHBOARD).toBe(300);
    expect(DEFAULT_STALENESS_THRESHOLDS.FLUX).toBe(300);
    expect(DEFAULT_STALENESS_THRESHOLDS.DIA).toBe(300);
    expect(DEFAULT_STALENESS_THRESHOLDS.UMA).toBe(600);
  });

  it('should have positive values for all thresholds', () => {
    Object.entries(DEFAULT_STALENESS_THRESHOLDS).forEach(([protocol, threshold]) => {
      expect(threshold, `${protocol} threshold should be positive`).toBeGreaterThan(0);
    });
  });

  it('should have PYTH and REDSTONE as fastest (60s)', () => {
    expect(DEFAULT_STALENESS_THRESHOLDS.PYTH).toBe(60);
    expect(DEFAULT_STALENESS_THRESHOLDS.REDSTONE).toBe(60);
  });

  it('should have CHAINLINK as slowest (3600s)', () => {
    expect(DEFAULT_STALENESS_THRESHOLDS.CHAINLINK).toBe(3600);
  });
});

describe('Type Exports', () => {
  it('should export OracleClientConfig type', () => {
    // Type-only test - just verify the type exists
    const config: OracleClientConfig = {
      stalenessThreshold: 300,
      confidenceThreshold: 0.95,
    };
    expect(config.stalenessThreshold).toBe(300);
  });

  it('should export HealthStatus type', () => {
    const status: HealthStatus = {
      status: 'healthy',
      lastUpdate: Date.now(),
      issues: [],
    };
    expect(status.status).toBe('healthy');
  });
});
