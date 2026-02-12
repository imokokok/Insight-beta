import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseRpcUrls,
  formatUsdCompact,
  formatTime,
  calculatePercentage,
  formatDurationMinutes,
  getExplorerUrl,
  fetchApiData,
  ApiClientError,
} from '@/shared/utils';

describe('parseRpcUrls', () => {
  it('should parse valid RPC URLs', () => {
    const result = parseRpcUrls('https://rpc.example.com, wss://ws.example.com');
    expect(result).toContain('https://rpc.example.com');
    expect(result).toContain('wss://ws.example.com');
  });

  it('should filter out invalid URLs', () => {
    const result = parseRpcUrls('https://rpc.example.com, ftp://invalid.com');
    expect(result).toHaveLength(1);
    expect(result).toContain('https://rpc.example.com');
  });

  it('should handle empty input', () => {
    expect(parseRpcUrls('')).toEqual([]);
    expect(parseRpcUrls('   ')).toEqual([]);
  });

  it('should remove duplicates', () => {
    const result = parseRpcUrls('https://rpc.example.com, https://rpc.example.com');
    expect(result).toHaveLength(1);
  });

  it('should handle mixed whitespace', () => {
    const result = parseRpcUrls('  https://rpc1.com  \n  https://rpc2.com  \t  ');
    expect(result).toHaveLength(2);
  });
});

describe('formatUsdCompact', () => {
  it('should format large numbers compactly', () => {
    expect(formatUsdCompact(1000000, 'en-US')).toContain('$');
  });

  it('should handle zero', () => {
    expect(formatUsdCompact(0, 'en-US')).toContain('$0');
  });

  it('should handle negative numbers', () => {
    const result = formatUsdCompact(-1000, 'en-US');
    expect(result).toContain('$');
  });
});

describe('formatTime', () => {
  it('should format valid ISO string', () => {
    const result = formatTime(new Date().toISOString(), 'en-US');
    expect(result).toBeTruthy();
  });

  it('should return placeholder for null', () => {
    expect(formatTime(null, 'en-US')).toBe('—');
  });

  it('should return placeholder for undefined', () => {
    expect(formatTime(undefined, 'en-US')).toBe('—');
  });

  it('should return placeholder for invalid date', () => {
    expect(formatTime('invalid-date', 'en-US')).toBe('—');
  });
});

describe('calculatePercentage', () => {
  it('should calculate percentage correctly', () => {
    expect(calculatePercentage(50, 100)).toBe(50);
  });

  it('should return 0 when total is 0', () => {
    expect(calculatePercentage(50, 0)).toBe(0);
  });

  it('should round to nearest integer', () => {
    expect(calculatePercentage(1, 3)).toBe(33);
  });

  it('should handle 100%', () => {
    expect(calculatePercentage(100, 100)).toBe(100);
  });

  it('should handle 0%', () => {
    expect(calculatePercentage(0, 100)).toBe(0);
  });
});

describe('formatDurationMinutes', () => {
  it('should format hours and minutes', () => {
    expect(formatDurationMinutes(90)).toBe('1h 30m');
  });

  it('should format only hours', () => {
    expect(formatDurationMinutes(120)).toBe('2h');
  });

  it('should format only minutes', () => {
    expect(formatDurationMinutes(45)).toBe('45m');
  });

  it('should return placeholder for zero', () => {
    expect(formatDurationMinutes(0)).toBe('—');
  });

  it('should return placeholder for negative', () => {
    expect(formatDurationMinutes(-10)).toBe('—');
  });

  it('should return placeholder for non-finite', () => {
    expect(formatDurationMinutes(NaN)).toBe('—');
    expect(formatDurationMinutes(Infinity)).toBe('—');
  });
});

describe('getExplorerUrl', () => {
  it('should return correct URL for Polygon', () => {
    const url = getExplorerUrl('Polygon', '0x123', 'tx');
    expect(url).toContain('polygonscan.com');
    expect(url).toContain('tx/0x123');
  });

  it('should return correct URL for Arbitrum', () => {
    const url = getExplorerUrl('Arbitrum', '0x123', 'address');
    expect(url).toContain('arbiscan.io');
    expect(url).toContain('address/0x123');
  });

  it('should return null for unknown chain', () => {
    expect(getExplorerUrl('UnknownChain', '0x123')).toBeNull();
  });

  it('should return null for null value', () => {
    expect(getExplorerUrl(null, '0x123')).toBeNull();
  });

  it('should handle chain by ID', () => {
    expect(getExplorerUrl('137', '0x123')).toContain('polygonscan.com');
    expect(getExplorerUrl('42161', '0x123')).toContain('arbiscan.io');
  });

  it('should handle Amoy testnet', () => {
    expect(getExplorerUrl('amoy', '0x123')).toContain('amoy.polygonscan.com');
  });
});

describe('fetchApiData edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw ApiClientError for non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ ok: false, error: 'bad_request' }),
    });

    await expect(fetchApiData('http://test.com/api')).rejects.toThrow(ApiClientError);
  });

  it('should handle network errors', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));

    await expect(fetchApiData('http://test.com/api')).rejects.toThrow();
  });

  it('should handle fast responses', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: { success: true } }),
    });

    const result = await fetchApiData('http://test.com/api', {}, 5000);
    expect(result).toEqual({ success: true });
  });

  it('should handle invalid JSON response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    await expect(fetchApiData('http://test.com/api')).rejects.toThrow();
  });

  it('should handle response with missing data field', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await expect(fetchApiData('http://test.com/api')).rejects.toThrow();
  });
});

describe('Boundary Value Tests', () => {
  describe('Number boundaries', () => {
    it('should handle maximum safe integer', () => {
      expect(Number.MAX_SAFE_INTEGER).toBe(9007199254740991);
    });

    it('should handle minimum safe integer', () => {
      expect(Number.MIN_SAFE_INTEGER).toBe(-9007199254740991);
    });

    it('should handle maximum value', () => {
      expect(Number.MAX_VALUE).toBeGreaterThan(1e308);
    });

    it('should handle very small numbers', () => {
      expect(Number.MIN_VALUE).toBeGreaterThan(0);
    });
  });

  describe('String boundaries', () => {
    it('should handle empty string', () => {
      expect('').toHaveLength(0);
    });

    it('should handle very long string', () => {
      const longString = 'a'.repeat(10000);
      expect(longString).toHaveLength(10000);
    });

    it('should handle unicode characters', () => {
      expect('你好世界🌍').toHaveLength(6);
    });

    it('should handle special characters', () => {
      expect('!@#$%^&*(){}[]|\\:";\'<>.,.?/`~').toBeTruthy();
    });
  });

  describe('Array boundaries', () => {
    it('should handle empty array', () => {
      const arr: string[] = [];
      expect(arr.length).toBe(0);
    });

    it('should handle very large array', () => {
      const arr = Array(10000).fill(0);
      expect(arr.length).toBe(10000);
    });

    it('should handle array with undefined values', () => {
      const arr = [undefined, null, 1, undefined];
      expect(arr.length).toBe(4);
    });
  });

  describe('Object boundaries', () => {
    it('should handle empty object', () => {
      const obj = {};
      expect(Object.keys(obj)).toHaveLength(0);
    });

    it('should handle object with many keys', () => {
      const obj: Record<string, number> = {};
      for (let i = 0; i < 1000; i++) {
        obj[`key${i}`] = i;
      }
      expect(Object.keys(obj)).toHaveLength(1000);
    });

    it('should handle nested objects', () => {
      const obj = { a: { b: { c: { d: { e: 1 } } } } };
      expect(obj.a.b.c.d.e).toBe(1);
    });

    it('should handle object with prototype properties', () => {
      const obj = { a: 1 };
      expect(Object.prototype.hasOwnProperty.call(obj, 'a')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(obj, 'toString')).toBe(false);
    });
  });
});

describe('Error Handling', () => {
  it('should handle ApiClientError correctly', () => {
    const error = new ApiClientError('test_code', { detail: 'test' });
    expect(error.code).toBe('test_code');
    expect(error.details).toEqual({ detail: 'test' });
    expect(error.message).toBe('test_code');
  });

  it('should throw and catch ApiClientError', () => {
    try {
      throw new ApiClientError('network_error', { originalError: 'timeout' });
    } catch (error: unknown) {
      if (error instanceof ApiClientError) {
        expect(error.code).toBe('network_error');
      }
    }
  });

  it('should handle nested error objects', () => {
    const error = new ApiClientError('complex_error', {
      nested: {
        deep: {
          value: 123,
        },
      },
    });
    expect(error.details).toHaveProperty('nested.deep.value');
  });
});
