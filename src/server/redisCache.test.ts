import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RedisCache, isRedisAvailable, getRedisStatus } from './redisCache';

// Mock environment variables
vi.mock('@/lib/config/env', () => ({
  env: {
    INSIGHT_REDIS_URL: 'redis://localhost:6379',
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock redis client
const mockRedisClient = {
  get: vi.fn(),
  setEx: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  mGet: vi.fn(),
  multi: vi.fn(),
  incrBy: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
  scanIterator: vi.fn(),
  connect: vi.fn(),
  quit: vi.fn(),
  on: vi.fn(),
};

mockRedisClient.multi.mockReturnValue({
  setEx: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue([]),
});

vi.mock('redis', () => ({
  createClient: vi.fn(() => mockRedisClient),
}));

describe('RedisCache', () => {
  let cache: RedisCache<string>;

  beforeEach(() => {
    vi.clearAllMocks();
    cache = new RedisCache<string>({
      prefix: 'test',
      defaultTtl: 60,
      version: 1,
    });
  });

  describe('isRedisAvailable', () => {
    it('should return true when Redis URL is configured', () => {
      expect(isRedisAvailable()).toBe(true);
    });
  });

  describe('get', () => {
    it('should return cached value', async () => {
      const cachedData = JSON.stringify({
        value: 'test-value',
        _meta: {
          version: 1,
          expiresAt: Date.now() + 60000,
        },
      });
      mockRedisClient.get.mockResolvedValue(cachedData);

      const result = await cache.get('test-key');

      expect(result).toBe('test-value');
      expect(mockRedisClient.get).toHaveBeenCalledWith('oracle-monitor:test:v1:test-key');
    });

    it('should return null for non-existent key', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cache.get('non-existent');

      expect(result).toBeNull();
    });

    it('should return null for expired entry', async () => {
      const expiredData = JSON.stringify({
        value: 'expired',
        _meta: {
          version: 1,
          expiresAt: Date.now() - 1000,
        },
      });
      mockRedisClient.get.mockResolvedValue(expiredData);
      mockRedisClient.del.mockResolvedValue(1);

      const result = await cache.get('expired-key');

      expect(result).toBeNull();
    });

    it('should return null for different version', async () => {
      const oldVersionData = JSON.stringify({
        value: 'old',
        _meta: {
          version: 2,
          expiresAt: Date.now() + 60000,
        },
      });
      mockRedisClient.get.mockResolvedValue(oldVersionData);
      mockRedisClient.del.mockResolvedValue(1);

      const result = await cache.get('old-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value with default TTL', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');

      const result = await cache.set('key', 'value');

      expect(result).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'oracle-monitor:test:v1:key',
        60,
        expect.stringContaining('value'),
      );
    });

    it('should set value with custom TTL', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');

      const result = await cache.set('key', 'value', 120);

      expect(result).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'oracle-monitor:test:v1:key',
        120,
        expect.any(String),
      );
    });
  });

  describe('delete', () => {
    it('should delete key', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      const result = await cache.delete('key');

      expect(result).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledWith('oracle-monitor:test:v1:key');
    });
  });

  describe('has', () => {
    it('should return true for existing key', async () => {
      mockRedisClient.exists.mockResolvedValue(1);

      const result = await cache.has('key');

      expect(result).toBe(true);
    });

    it('should return false for non-existing key', async () => {
      mockRedisClient.exists.mockResolvedValue(0);

      const result = await cache.has('key');

      expect(result).toBe(false);
    });
  });

  describe('mget', () => {
    it('should get multiple values', async () => {
      const data1 = JSON.stringify({
        value: 'value1',
        _meta: { version: 1, expiresAt: Date.now() + 60000 },
      });
      const data2 = JSON.stringify({
        value: 'value2',
        _meta: { version: 1, expiresAt: Date.now() + 60000 },
      });
      mockRedisClient.mGet.mockResolvedValue([data1, data2]);

      const result = await cache.mget(['key1', 'key2']);

      expect(result).toEqual(['value1', 'value2']);
    });

    it('should handle null values', async () => {
      mockRedisClient.mGet.mockResolvedValue([null, null]);

      const result = await cache.mget(['key1', 'key2']);

      expect(result).toEqual([null, null]);
    });
  });

  describe('mset', () => {
    it('should set multiple values', async () => {
      const result = await cache.mset([
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2', ttl: 120 },
      ]);

      expect(result).toBe(true);
    });
  });

  describe('mdel', () => {
    it('should delete multiple keys', async () => {
      mockRedisClient.del.mockResolvedValue(2);

      const result = await cache.mdel(['key1', 'key2']);

      expect(result).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledWith([
        'oracle-monitor:test:v1:key1',
        'oracle-monitor:test:v1:key2',
      ]);
    });
  });

  describe('increment', () => {
    it('should increment counter', async () => {
      mockRedisClient.incrBy.mockResolvedValue(5);

      const result = await cache.increment('counter', 5);

      expect(result).toBe(5);
      expect(mockRedisClient.incrBy).toHaveBeenCalledWith('oracle-monitor:test:v1:counter', 5);
    });
  });

  describe('expire', () => {
    it('should set expiration', async () => {
      mockRedisClient.expire.mockResolvedValue(true);

      const result = await cache.expire('key', 300);

      expect(result).toBe(true);
    });
  });

  describe('ttl', () => {
    it('should return TTL', async () => {
      mockRedisClient.ttl.mockResolvedValue(300);

      const result = await cache.ttl('key');

      expect(result).toBe(300);
    });
  });

  describe('stats', () => {
    it('should return cache stats', async () => {
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield 'key1';
          yield 'key2';
        },
      };
      mockRedisClient.scanIterator.mockReturnValue(mockIterator);

      const result = await cache.stats();

      expect(result.keys).toBe(2);
      expect(result.connected).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all keys with prefix', async () => {
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield 'key1';
          yield 'key2';
        },
      };
      mockRedisClient.scanIterator.mockReturnValue(mockIterator);
      mockRedisClient.del.mockResolvedValue(2);

      const result = await cache.clear();

      expect(result).toBe(true);
    });
  });
});

describe('getRedisStatus', () => {
  it('should return Redis status', async () => {
    const status = await getRedisStatus();

    expect(status.available).toBe(true);
    expect(status.connected).toBe(true);
    expect(status.url).toContain('redis://');
  });
});
