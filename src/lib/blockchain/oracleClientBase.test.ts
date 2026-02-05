/**
 * OracleClientBase 测试
 */

import { describe, it, expect, vi } from 'vitest';
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
});

describe('createLogger', () => {
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
});

describe('withRetry', () => {
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
});
