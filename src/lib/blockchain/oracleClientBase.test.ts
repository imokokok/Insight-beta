/**
 * OracleClientBase 测试
 *
 * 测试预言机客户端基础类型和工具函数
 * 包括：价格陈旧度检查、数据新鲜度计算、价格格式化、符号解析、地址验证等
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isPriceStale,
  formatPriceValue,
  parseSymbolPair,
  normalizeSymbol,
  isValidAddressFormat,
  createLogger,
  processBatch,
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

describe('formatPriceValue', () => {
  it('should format price with 8 decimals', () => {
    const price = 150000000000n; // 1500 with 8 decimals
    expect(formatPriceValue(price, 8)).toBe(1500);
  });

  it('should format price with 18 decimals', () => {
    const price = 1500000000000000000000n; // 1500 with 18 decimals
    expect(formatPriceValue(price, 18)).toBe(1500);
  });

  it('should use default 8 decimals', () => {
    const price = 150000000000n;
    expect(formatPriceValue(price)).toBe(1500);
  });

  it('should handle zero price', () => {
    expect(formatPriceValue(0n, 8)).toBe(0);
  });

  it('should handle small decimals', () => {
    const price = 1500n; // 1500 with 0 decimals
    expect(formatPriceValue(price, 0)).toBe(1500);
  });

  it('should handle fractional prices', () => {
    const price = 123456789n; // 1.23456789 with 8 decimals
    expect(formatPriceValue(price, 8)).toBeCloseTo(1.23456789, 8);
  });
});

describe('parseSymbolPair', () => {
  it('should parse valid symbol', () => {
    const result = parseSymbolPair('ETH/USD');
    expect(result).toEqual({ base: 'ETH', quote: 'USD' });
  });

  it('should return null for invalid symbol', () => {
    const result = parseSymbolPair('INVALID');
    expect(result).toBeNull();
  });

  it('should return null for symbol with multiple slashes', () => {
    const result = parseSymbolPair('ETH/USD/BTC');
    expect(result).toBeNull();
  });

  it('should return null for empty string', () => {
    const result = parseSymbolPair('');
    expect(result).toBeNull();
  });

  it('should return null for symbol ending with slash', () => {
    const result = parseSymbolPair('ETH/');
    expect(result).toBeNull();
  });

  it('should return null for symbol starting with slash', () => {
    const result = parseSymbolPair('/USD');
    expect(result).toBeNull();
  });

  it('should handle various trading pairs', () => {
    expect(parseSymbolPair('BTC/USD')).toEqual({ base: 'BTC', quote: 'USD' });
    expect(parseSymbolPair('ETH/BTC')).toEqual({ base: 'ETH', quote: 'BTC' });
    expect(parseSymbolPair('LINK/ETH')).toEqual({ base: 'LINK', quote: 'ETH' });
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

describe('isValidAddressFormat', () => {
  it('should return true for valid address', () => {
    expect(isValidAddressFormat('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbD')).toBe(true);
  });

  it('should return false for invalid address', () => {
    expect(isValidAddressFormat('invalid')).toBe(false);
  });

  it('should return false for address without 0x prefix', () => {
    expect(isValidAddressFormat('742d35Cc6634C0532925a3b844Bc9e7595f0bEbD')).toBe(false);
  });

  it('should return false for address with wrong length', () => {
    expect(isValidAddressFormat('0x742d35Cc6634C0532925a3b844Bc9e7595f0b')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isValidAddressFormat('')).toBe(false);
  });

  it('should return false for address too long', () => {
    expect(isValidAddressFormat('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbD00')).toBe(false);
  });

  it('should handle lowercase hex', () => {
    expect(isValidAddressFormat('0x742d35cc6634c0532925a3b844bc9e7595f0bebd')).toBe(true);
  });

  it('should handle uppercase hex', () => {
    expect(isValidAddressFormat('0x742D35CC6634C0532925A3B844BC9E7595F0BEBD')).toBe(true);
  });

  it('should return false for non-hex characters', () => {
    expect(isValidAddressFormat('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbG')).toBe(false);
  });
});

describe('createLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create logger with prefix', () => {
    const log = createLogger('Pyth', 'ethereum');

    log.info('test message', { key: 'value' });

    expect(logger.info).toHaveBeenCalledWith('Pyth[ethereum]: test message', { key: 'value' });
  });

  it('should support all log levels', () => {
    const log = createLogger('Chainlink', 'polygon');

    log.debug('debug');
    log.info('info');
    log.warn('warn');
    log.error('error');

    expect(logger.debug).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });

  it('should handle empty meta', () => {
    const log = createLogger('Band', 'ethereum');
    log.info('message only');

    expect(logger.info).toHaveBeenCalledWith('Band[ethereum]: message only', undefined);
  });

  it('should handle different chain names', () => {
    const log = createLogger('API3', 'arbitrum');
    log.info('test');

    expect(logger.info).toHaveBeenCalledWith('API3[arbitrum]: test', undefined);
  });
});

describe('processBatch', () => {
  it('should process items in batches', async () => {
    const items = [1, 2, 3, 4, 5];
    const processor = vi.fn((x: number) => Promise.resolve(x * 2));

    const results = await processBatch(items, processor, 2);

    expect(results).toEqual([2, 4, 6, 8, 10]);
    expect(processor).toHaveBeenCalledTimes(5);
  });

  it('should handle errors gracefully', async () => {
    const items = [1, 2, 3];
    const processor = vi.fn((x: number) => {
      if (x === 2) return Promise.reject(new Error('Test error'));
      return Promise.resolve(x * 2);
    });

    const results = await processBatch(items, processor);

    expect(results).toEqual([2, 6]);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('should use default batch size of 10', async () => {
    const items = Array.from({ length: 15 }, (_, i) => i + 1);
    const processor = vi.fn((x: number) => Promise.resolve(x));

    await processBatch(items, processor);

    // Should process all items despite not specifying batch size
    expect(processor).toHaveBeenCalledTimes(15);
  });

  it('should handle empty array', async () => {
    const results = await processBatch([], vi.fn());
    expect(results).toEqual([]);
  });

  it('should handle all items failing', async () => {
    const items = [1, 2, 3];
    const processor = vi.fn(() => Promise.reject(new Error('Always fails')));

    const results = await processBatch(items, processor);

    expect(results).toEqual([]);
    // logger.warn is called for each failed item plus potentially other warnings
    expect(logger.warn).toHaveBeenCalled();
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
