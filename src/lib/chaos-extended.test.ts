/**
 * Extended Chaos Tests - 扩展混沌测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ExtendedChaosInjector,
  extendedChaosTests,
  startExtendedChaos,
  stopExtendedChaos,
  isExtendedChaosEnabled,
  getChaosResults,
  type ExtendedChaosType,
} from './chaos-extended';

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
vi.mock('@/lib/redis-cluster', () => ({
  redisClusterManager: {
    isConnected: vi.fn().mockReturnValue(true),
    disconnect: vi.fn().mockResolvedValue(undefined),
    getClient: vi.fn().mockResolvedValue({}),
  },
}));

describe('Extended Chaos Tests', () => {
  let injector: ExtendedChaosInjector;

  beforeEach(() => {
    vi.clearAllMocks();
    // 创建一个新的注入器实例用于测试
    injector = new ExtendedChaosInjector();
  });

  afterEach(() => {
    injector.stop();
  });

  describe('配置验证', () => {
    it('应该包含所有扩展混沌测试类型', () => {
      const expectedTypes: ExtendedChaosType[] = [
        'redis-failure',
        'database-partition',
        'network-partition',
        'clock-drift',
        'cpu-throttling',
        'memory-pressure',
        'connection-pool-exhaustion',
        'rate-limiting',
        'circuit-breaker',
      ];

      const actualTypes = extendedChaosTests.map((t) => t.type);

      for (const type of expectedTypes) {
        expect(actualTypes).toContain(type);
      }
    });

    it('每个测试应该有有效的配置', () => {
      for (const test of extendedChaosTests) {
        expect(test.name).toBeDefined();
        expect(test.description).toBeDefined();
        expect(test.type).toBeDefined();
        expect(test.frequency).toBeGreaterThan(0);
        expect(test.duration).toBeGreaterThan(0);
        expect(test.failureProbability).toBeGreaterThanOrEqual(0);
        expect(test.failureProbability).toBeLessThanOrEqual(1);
        expect(test.severity).toMatch(/^(low|medium|high|critical)$/);
        expect(test.scope).toBeInstanceOf(Array);
        expect(test.scope.length).toBeGreaterThan(0);
      }
    });

    it('应该正确分类严重程度', () => {
      const criticalTests = extendedChaosTests.filter((t) => t.severity === 'critical');
      const highTests = extendedChaosTests.filter((t) => t.severity === 'high');
      const mediumTests = extendedChaosTests.filter((t) => t.severity === 'medium');
      const lowTests = extendedChaosTests.filter((t) => t.severity === 'low');

      // 验证分布合理
      expect(criticalTests.length).toBeGreaterThanOrEqual(0);
      expect(highTests.length).toBeGreaterThanOrEqual(1);
      expect(mediumTests.length).toBeGreaterThanOrEqual(1);
      expect(lowTests.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('注入器生命周期', () => {
    it('应该正确报告启用状态', () => {
      // 默认情况下（没有设置环境变量）应该返回 false
      expect(typeof injector.isEnabled()).toBe('boolean');
    });

    it('应该能够启动和停止', () => {
      // 启动（如果启用）
      injector.start();

      // 停止应该清除所有定时器
      expect(() => injector.stop()).not.toThrow();
    });

    it('停止后应该清除所有活跃测试', () => {
      injector.start();
      injector.stop();

      const activeTests = injector.getActiveTests();
      expect(activeTests).toHaveLength(0);
    });
  });

  describe('测试结果', () => {
    it('应该能够获取测试结果', () => {
      const results = injector.getResults();
      expect(results).toBeInstanceOf(Array);
    });

    it('新创建的注入器应该有空的测试结果', () => {
      const results = injector.getResults();
      expect(results).toHaveLength(0);
    });
  });

  describe('便捷函数', () => {
    it('isExtendedChaosEnabled 应该返回布尔值', () => {
      expect(typeof isExtendedChaosEnabled()).toBe('boolean');
    });

    it('getChaosResults 应该返回数组', () => {
      const results = getChaosResults();
      expect(results).toBeInstanceOf(Array);
    });

    it('startExtendedChaos 不应该抛出错误', () => {
      expect(() => startExtendedChaos()).not.toThrow();
    });

    it('stopExtendedChaos 不应该抛出错误', () => {
      expect(() => stopExtendedChaos()).not.toThrow();
    });
  });

  describe('特定故障类型', () => {
    it('应该有 Redis 故障测试', () => {
      const redisTest = extendedChaosTests.find((t) => t.type === 'redis-failure');
      expect(redisTest).toBeDefined();
      expect(redisTest?.scope).toContain('redis-cluster');
    });

    it('应该有数据库分区测试', () => {
      const dbTest = extendedChaosTests.find((t) => t.type === 'database-partition');
      expect(dbTest).toBeDefined();
    });

    it('应该有网络分区测试', () => {
      const networkTest = extendedChaosTests.find((t) => t.type === 'network-partition');
      expect(networkTest).toBeDefined();
    });

    it('应该有 CPU 限制测试', () => {
      const cpuTest = extendedChaosTests.find((t) => t.type === 'cpu-throttling');
      expect(cpuTest).toBeDefined();
    });

    it('应该有内存压力测试', () => {
      const memoryTest = extendedChaosTests.find((t) => t.type === 'memory-pressure');
      expect(memoryTest).toBeDefined();
    });

    it('应该有连接池耗尽测试', () => {
      const poolTest = extendedChaosTests.find((t) => t.type === 'connection-pool-exhaustion');
      expect(poolTest).toBeDefined();
    });

    it('应该有速率限制测试', () => {
      const rateTest = extendedChaosTests.find((t) => t.type === 'rate-limiting');
      expect(rateTest).toBeDefined();
    });

    it('应该有断路器测试', () => {
      const circuitTest = extendedChaosTests.find((t) => t.type === 'circuit-breaker');
      expect(circuitTest).toBeDefined();
    });
  });

  describe('自动恢复配置', () => {
    it('所有启用的测试应该配置自动恢复', () => {
      const enabledTests = extendedChaosTests.filter((t) => t.enabled);

      for (const test of enabledTests) {
        expect(test.autoRecovery).toBe(true);
        expect(test.recoveryTime).toBeGreaterThan(0);
      }
    });
  });

  describe('频率和持续时间', () => {
    it('频率应该大于持续时间', () => {
      for (const test of extendedChaosTests) {
        // 频率应该至少是持续时间的 2 倍，避免测试重叠
        expect(test.frequency).toBeGreaterThan(test.duration);
      }
    });

    it('持续时间应该合理', () => {
      for (const test of extendedChaosTests) {
        // 持续时间应该在 5 秒到 2 分钟之间
        expect(test.duration).toBeGreaterThanOrEqual(5000);
        expect(test.duration).toBeLessThanOrEqual(120000);
      }
    });
  });
});
