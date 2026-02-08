/**
 * ErrorHandler 单元测试
 */

import { describe, it, expect, vi } from 'vitest';
import { ErrorHandler, normalizeError, getErrorMessage } from './ErrorHandler';
import { PriceFetchError, HealthCheckError } from '@/lib/blockchain/core/types';
import type { Logger } from '@/lib/shared/logger/LoggerFactory';

describe('ErrorHandler', () => {
  describe('normalizeError', () => {
    it('should return Error instance as is', () => {
      const error = new Error('Test error');
      expect(normalizeError(error)).toBe(error);
    });

    it('should convert string to Error', () => {
      const result = normalizeError('String error');
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('String error');
    });

    it('should convert object to Error', () => {
      const result = normalizeError({ key: 'value' });
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('[object Object]');
    });

    it('should convert null to Error', () => {
      const result = normalizeError(null);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('null');
    });
  });

  describe('getErrorMessage', () => {
    it('should return error message', () => {
      expect(getErrorMessage(new Error('Test'))).toBe('Test');
    });

    it('should return string for non-error', () => {
      expect(getErrorMessage('String')).toBe('String');
    });
  });

  describe('createPriceFetchError', () => {
    it('should create PriceFetchError from Error', () => {
      const originalError = new Error('Network failed');
      const error = ErrorHandler.createPriceFetchError(
        originalError,
        'chainlink',
        'ethereum',
        'ETH/USD',
      );

      expect(error).toBeInstanceOf(PriceFetchError);
      expect(error.message).toContain('Network failed');
      expect(error.protocol).toBe('chainlink');
      expect(error.chain).toBe('ethereum');
      expect(error.symbol).toBe('ETH/USD');
    });

    it('should create PriceFetchError from string', () => {
      const error = ErrorHandler.createPriceFetchError('Timeout', 'pyth', 'solana', 'BTC/USD');

      expect(error).toBeInstanceOf(PriceFetchError);
      expect(error.message).toContain('Timeout');
    });
  });

  describe('createHealthCheckError', () => {
    it('should create HealthCheckError', () => {
      const error = ErrorHandler.createHealthCheckError(new Error('RPC down'), 'band', 'bsc');

      expect(error).toBeInstanceOf(HealthCheckError);
      expect(error.message).toContain('RPC down');
      expect(error.protocol).toBe('band');
      expect(error.chain).toBe('bsc');
    });
  });

  describe('logError', () => {
    it('should log error with message', () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      ErrorHandler.logError(mockLogger, 'Operation failed', new Error('Details'), {
        extra: 'data',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Operation failed',
        expect.objectContaining({
          error: 'Details',
          stack: expect.any(String),
          extra: 'data',
        }),
      );
    });
  });

  describe('logWarn', () => {
    it('should log warning with error', () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      ErrorHandler.logWarn(mockLogger, 'Retrying', new Error('Timeout'));

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Retrying',
        expect.objectContaining({
          error: 'Timeout',
        }),
      );
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await ErrorHandler.withRetry(operation, {
        maxRetries: 3,
        baseDelay: 10,
        maxDelay: 100,
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const onRetry = vi.fn();

      const result = await ErrorHandler.withRetry(operation, {
        maxRetries: 3,
        baseDelay: 10,
        maxDelay: 100,
        onRetry,
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      expect(onRetry).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));

      await expect(
        ErrorHandler.withRetry(operation, {
          maxRetries: 2,
          baseDelay: 10,
          maxDelay: 100,
        }),
      ).rejects.toThrow('Always fails');

      expect(operation).toHaveBeenCalledTimes(2);
    });
  });
});
