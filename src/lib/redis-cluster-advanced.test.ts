/**
 * Redis Cluster Advanced Tests - Redis 集群高级功能测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock redis-cluster
const mockSet = vi.fn();
const mockGet = vi.fn();
const mockDel = vi.fn();
const mockEval = vi.fn();
const mockIncr = vi.fn();
const mockExpire = vi.fn();
const mockTtl = vi.fn();
const mockZRemRangeByScore = vi.fn();
const mockZCard = vi.fn();
const mockZAdd = vi.fn();
const mockMulti = vi.fn();
const mockExec = vi.fn();

vi.mock('./redis-cluster', () => ({
  redisClusterManager: {
    isConnected: vi.fn().mockReturnValue(true),
    isCluster: vi.fn().mockReturnValue(false),
  },
  getRedisClusterClient: vi.fn().mockResolvedValue({
    set: mockSet,
    get: mockGet,
    del: mockDel,
    eval: mockEval,
    incr: mockIncr,
    expire: mockExpire,
    ttl: mockTtl,
    zRemRangeByScore: mockZRemRangeByScore,
    zCard: mockZCard,
    zAdd: mockZAdd,
    multi: mockMulti,
  }),
  RedisClusterCache: class MockRedisClusterCache {
    set = vi.fn().mockResolvedValue(true);
  },
}));

// 动态导入被测模块
const {
  RedisDistributedLock,
  RedisRateLimiter,
  RedisPipeline,
  RedisCacheWarmer,
  RedisMonitor,
  createDistributedLock,
  createRateLimiter,
  createPipeline,
  createCacheWarmer,
  createRedisMonitor,
  redisLock,
  redisRateLimiter,
  redisMonitor,
} = await import('./redis-cluster-advanced');

describe('RedisDistributedLock', () => {
  let lock: RedisDistributedLock;

  beforeEach(() => {
    vi.clearAllMocks();
    lock = new RedisDistributedLock('test');
  });

  describe('获取锁', () => {
    it('应该能够获取锁', async () => {
      mockSet.mockResolvedValue('OK');

      const lockValue = await lock.acquire('test-resource');

      expect(lockValue).not.toBeNull();
      expect(mockSet).toHaveBeenCalledWith('test:lock:test-resource', expect.any(String), {
        NX: true,
        EX: 30,
      });
    });

    it('获取锁失败应该返回 null', async () => {
      mockSet.mockResolvedValue(null);

      const lockValue = await lock.acquire('test-resource', { retryCount: 1 });

      expect(lockValue).toBeNull();
    });

    it('应该支持重试', async () => {
      mockSet.mockResolvedValueOnce(null).mockResolvedValueOnce('OK');

      const lockValue = await lock.acquire('test-resource', { retryCount: 2, retryDelay: 10 });

      expect(lockValue).not.toBeNull();
      expect(mockSet).toHaveBeenCalledTimes(2);
    });
  });

  describe('释放锁', () => {
    it('应该能够释放锁', async () => {
      mockEval.mockResolvedValue(1);

      const result = await lock.release('test-resource', 'lock-value');

      expect(result).toBe(true);
      expect(mockEval).toHaveBeenCalled();
    });

    it('释放不属于自己的锁应该失败', async () => {
      mockEval.mockResolvedValue(0);

      const result = await lock.release('test-resource', 'wrong-value');

      expect(result).toBe(false);
    });
  });

  describe('使用锁执行操作', () => {
    it('应该成功执行操作', async () => {
      mockSet.mockResolvedValue('OK');
      mockEval.mockResolvedValue(1);

      const operation = vi.fn().mockResolvedValue('result');
      const result = await lock.withLock('test-resource', operation);

      expect(result).toBe('result');
      expect(operation).toHaveBeenCalled();
    });

    it('获取锁失败应该抛出错误', async () => {
      mockSet.mockResolvedValue(null);

      const operation = vi.fn();

      await expect(lock.withLock('test-resource', operation, { retryCount: 1 })).rejects.toThrow(
        'Failed to acquire lock',
      );
    });
  });
});

describe('RedisRateLimiter', () => {
  let limiter: RedisRateLimiter;

  beforeEach(() => {
    vi.clearAllMocks();
    limiter = new RedisRateLimiter('test');
    mockMulti.mockReturnValue({
      set: vi.fn().mockReturnThis(),
      incr: vi.fn().mockReturnThis(),
      ttl: vi.fn().mockReturnThis(),
      exec: mockExec,
    });
  });

  describe('固定窗口限流', () => {
    it('应该允许请求', async () => {
      mockExec.mockResolvedValue([null, 1, 60]);

      const result = await limiter.allow('user-1', { window: 60, maxRequests: 10 });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('应该拒绝超过限制的请求', async () => {
      mockExec.mockResolvedValue([null, 11, 60]);

      const result = await limiter.allow('user-1', { window: 60, maxRequests: 10 });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('出错时应该允许请求', async () => {
      mockExec.mockRejectedValue(new Error('Redis error'));

      const result = await limiter.allow('user-1', { window: 60, maxRequests: 10 });

      expect(result.allowed).toBe(true);
    });
  });

  describe('滑动窗口限流', () => {
    it('应该允许请求', async () => {
      mockZCard.mockResolvedValue(5);
      mockZAdd.mockResolvedValue(1);

      const result = await limiter.slidingWindowAllow('user-1', { window: 60, maxRequests: 10 });

      expect(result).toBe(true);
    });

    it('应该拒绝超过限制的请求', async () => {
      mockZCard.mockResolvedValue(10);

      const result = await limiter.slidingWindowAllow('user-1', { window: 60, maxRequests: 10 });

      expect(result).toBe(false);
    });
  });
});

describe('RedisPipeline', () => {
  let pipeline: RedisPipeline;

  beforeEach(() => {
    vi.clearAllMocks();
    pipeline = new RedisPipeline();
    mockMulti.mockReturnValue({
      get: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      exec: mockExec,
    });
  });

  it('应该添加命令', () => {
    pipeline.add('get', 'key1').add('set', 'key2', 'value');

    expect(pipeline.length()).toBe(2);
  });

  it('应该执行管道', async () => {
    mockExec.mockResolvedValue(['value1', 'OK']);

    pipeline.add('get', 'key1').add('set', 'key2', 'value');
    const results = await pipeline.exec();

    expect(results).toHaveLength(2);
    expect(results[0]).toBe('value1');
    expect(results[1]).toBe('OK');
  });

  it('应该清空管道', () => {
    pipeline.add('get', 'key1');
    pipeline.clear();

    expect(pipeline.length()).toBe(0);
  });
});

describe('RedisCacheWarmer', () => {
  let warmer: RedisCacheWarmer;

  beforeEach(() => {
    vi.clearAllMocks();
    warmer = new RedisCacheWarmer('test');
  });

  it('应该预热缓存', async () => {
    const items = [
      { key: 'key1', value: 'value1' },
      { key: 'key2', value: 'value2' },
    ];

    const result = await warmer.warmup(items);

    expect(result.success).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('应该预热价格数据', async () => {
    const prices = [
      { symbol: 'ETH/USD', price: 3500, timestamp: Date.now() },
      { symbol: 'BTC/USD', price: 65000, timestamp: Date.now() },
    ];

    await expect(warmer.warmupPrices(prices)).resolves.not.toThrow();
  });
});

describe('RedisMonitor', () => {
  let monitor: RedisMonitor;

  beforeEach(() => {
    vi.clearAllMocks();
    monitor = new RedisMonitor();
  });

  it('应该记录命令', () => {
    monitor.recordCommand(100, true);
    monitor.recordCommand(200, false);

    const metrics = monitor.getMetrics();

    expect(metrics.totalCommands).toBe(2);
    expect(metrics.errorCount).toBe(1);
    expect(metrics.avgResponseTime).toBe(150);
  });

  it('应该重置指标', () => {
    monitor.recordCommand(100, true);
    monitor.resetMetrics();

    const metrics = monitor.getMetrics();

    expect(metrics.totalCommands).toBe(0);
    expect(metrics.avgResponseTime).toBe(0);
  });
});

describe('便捷函数', () => {
  it('createDistributedLock 应该工作', () => {
    const lock = createDistributedLock('test');
    expect(lock).toBeInstanceOf(RedisDistributedLock);
  });

  it('createRateLimiter 应该工作', () => {
    const limiter = createRateLimiter('test');
    expect(limiter).toBeInstanceOf(RedisRateLimiter);
  });

  it('createPipeline 应该工作', () => {
    const pipeline = createPipeline();
    expect(pipeline).toBeInstanceOf(RedisPipeline);
  });

  it('createCacheWarmer 应该工作', () => {
    const warmer = createCacheWarmer('test');
    expect(warmer).toBeInstanceOf(RedisCacheWarmer);
  });

  it('createRedisMonitor 应该工作', () => {
    const monitor = createRedisMonitor();
    expect(monitor).toBeInstanceOf(RedisMonitor);
  });
});

describe('单例实例', () => {
  it('redisLock 应该存在', () => {
    expect(redisLock).toBeInstanceOf(RedisDistributedLock);
  });

  it('redisRateLimiter 应该存在', () => {
    expect(redisRateLimiter).toBeInstanceOf(RedisRateLimiter);
  });

  it('redisMonitor 应该存在', () => {
    expect(redisMonitor).toBeInstanceOf(RedisMonitor);
  });
});
