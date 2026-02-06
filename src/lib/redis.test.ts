/**
 * Redis Client Tests - Redis 客户端测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  getRedisClient,
  closeRedisConnection,
  isRedisConnected,
  getRedisStats,
  redisSet,
  redisGet,
  redisDel,
  redisSetEx,
  redisPublish,
  redisSubscribe,
} from './redis';

// Mock redis module
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockQuit = vi.fn();
const mockIsReady = vi.fn();
const mockIsOpen = vi.fn();
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDel = vi.fn();
const mockSetEx = vi.fn();
const mockPublish = vi.fn();
const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();
const mockMulti = vi.fn();

const mockClient = {
  connect: mockConnect,
  disconnect: mockDisconnect,
  quit: mockQuit,
  isReady: mockIsReady,
  isOpen: mockIsOpen,
  get: mockGet,
  set: mockSet,
  del: mockDel,
  setEx: mockSetEx,
  publish: mockPublish,
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe,
  multi: mockMulti,
  on: vi.fn(),
};

vi.mock('redis', () => ({
  createClient: vi.fn(() => mockClient),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Redis Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module state
    closeRedisConnection();
  });

  afterEach(() => {
    closeRedisConnection();
  });

  describe('getRedisClient', () => {
    it('should create and connect to Redis client', async () => {
      mockConnect.mockResolvedValue(undefined);
      mockIsOpen.mockReturnValue(true);

      const client = await getRedisClient();

      expect(client).toBeDefined();
      expect(mockConnect).toHaveBeenCalled();
    });

    it('should return existing client if already connected', async () => {
      mockConnect.mockResolvedValue(undefined);
      mockIsOpen.mockReturnValue(true);

      const client1 = await getRedisClient();
      const client2 = await getRedisClient();

      expect(client1).toBe(client2);
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      mockConnect.mockRejectedValue(error);

      await expect(getRedisClient()).rejects.toThrow('Connection failed');
    });
  });

  describe('closeRedisConnection', () => {
    it('should close connection gracefully', async () => {
      mockConnect.mockResolvedValue(undefined);
      mockIsOpen.mockReturnValue(true);
      mockQuit.mockResolvedValue(undefined);

      await getRedisClient();
      await closeRedisConnection();

      expect(mockQuit).toHaveBeenCalled();
    });

    it('should handle close when not connected', async () => {
      await closeRedisConnection();
      expect(mockQuit).not.toHaveBeenCalled();
    });
  });

  describe('isRedisConnected', () => {
    it('should return boolean value', () => {
      const result = isRedisConnected();
      expect(typeof result).toBe('boolean');
    });

    it('should return false when not connected', () => {
      expect(isRedisConnected()).toBe(false);
    });
  });

  describe('getRedisStats', () => {
    it('should return stats object with correct structure', () => {
      const stats = getRedisStats();

      expect(stats).toHaveProperty('connected');
      expect(stats).toHaveProperty('ready');
      expect(stats).toHaveProperty('open');
      expect(typeof stats.connected).toBe('boolean');
      expect(typeof stats.ready).toBe('boolean');
      expect(typeof stats.open).toBe('boolean');
    });

    it('should return false values when not connected', () => {
      const stats = getRedisStats();

      expect(stats.connected).toBe(false);
      expect(stats.ready).toBe(false);
      expect(stats.open).toBe(false);
    });
  });

  describe('redisSet', () => {
    it('should set value successfully', async () => {
      mockConnect.mockResolvedValue(undefined);
      mockIsReady.mockReturnValue(true);
      mockSet.mockResolvedValue('OK');

      await redisSet('test-key', 'test-value');

      expect(mockSet).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('should handle set errors', async () => {
      mockConnect.mockResolvedValue(undefined);
      mockIsReady.mockReturnValue(true);
      mockSet.mockRejectedValue(new Error('Set failed'));

      await expect(redisSet('test-key', 'test-value')).rejects.toThrow('Set failed');
    });
  });

  describe('redisGet', () => {
    it('should get value successfully', async () => {
      mockConnect.mockResolvedValue(undefined);
      mockIsReady.mockReturnValue(true);
      mockGet.mockResolvedValue('test-value');

      const value = await redisGet('test-key');

      expect(value).toBe('test-value');
      expect(mockGet).toHaveBeenCalledWith('test-key');
    });

    it('should return null for non-existent key', async () => {
      mockConnect.mockResolvedValue(undefined);
      mockIsReady.mockReturnValue(true);
      mockGet.mockResolvedValue(null);

      const value = await redisGet('non-existent');

      expect(value).toBeNull();
    });
  });

  describe('redisDel', () => {
    it('should delete key successfully', async () => {
      mockConnect.mockResolvedValue(undefined);
      mockIsReady.mockReturnValue(true);
      mockDel.mockResolvedValue(1);

      await redisDel('test-key');

      expect(mockDel).toHaveBeenCalledWith('test-key');
    });
  });

  describe('redisSetEx', () => {
    it('should set value with expiration', async () => {
      mockConnect.mockResolvedValue(undefined);
      mockIsReady.mockReturnValue(true);
      mockSetEx.mockResolvedValue('OK');

      await redisSetEx('test-key', 60, 'test-value');

      expect(mockSetEx).toHaveBeenCalledWith('test-key', 60, 'test-value');
    });
  });

  describe('redisPublish', () => {
    it('should publish message successfully', async () => {
      mockConnect.mockResolvedValue(undefined);
      mockIsReady.mockReturnValue(true);
      mockPublish.mockResolvedValue(1);

      const result = await redisPublish('test-channel', 'test-message');

      expect(result).toBe(1);
      expect(mockPublish).toHaveBeenCalledWith('test-channel', 'test-message');
    });
  });

  describe('redisSubscribe', () => {
    it('should subscribe to channel', async () => {
      mockConnect.mockResolvedValue(undefined);
      mockIsReady.mockReturnValue(true);
      mockSubscribe.mockResolvedValue(undefined);

      const callback = vi.fn();
      await redisSubscribe('test-channel', callback);

      expect(mockSubscribe).toHaveBeenCalledWith('test-channel', expect.any(Function));
    });
  });
});
