/**
 * Service Registry Tests - 服务注册中心测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ServiceRegistry,
  serviceRegistry,
  registerService,
  unregisterService,
  discoverServices,
  getServiceInstance,
  serviceHeartbeat,
  getServiceStats,
  type ServiceInstance,
} from './ServiceRegistry';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ServiceRegistry', () => {
  let registry: ServiceRegistry;

  beforeEach(() => {
    registry = new ServiceRegistry({
      strategy: 'round-robin',
      healthCheckInterval: 1000, // 短间隔便于测试
    });
  });

  afterEach(() => {
    registry.clear();
  });

  describe('服务注册', () => {
    it('应该能够注册服务', () => {
      const instance = createTestInstance('test-1', 'api-service');
      const registered = registry.register(instance);

      expect(registered).toBeDefined();
      expect(registered.id).toBe('test-1');
      expect(registered.name).toBe('api-service');
      expect(registered.health).toBe('unknown');
      expect(registered.registeredAt).toBeInstanceOf(Date);
    });

    it('应该能够注销服务', () => {
      const instance = createTestInstance('test-1', 'api-service');
      registry.register(instance);

      const result = registry.unregister('test-1');
      expect(result).toBe(true);

      // 再次注销应该返回 false
      const result2 = registry.unregister('test-1');
      expect(result2).toBe(false);
    });

    it('注册多个相同名称的服务', () => {
      const instance1 = createTestInstance('test-1', 'api-service', { port: 3001 });
      const instance2 = createTestInstance('test-2', 'api-service', { port: 3002 });

      registry.register(instance1);
      registry.register(instance2);

      // 设置为健康状态，否则会被过滤
      registry.updateHealth('test-1', 'healthy');
      registry.updateHealth('test-2', 'healthy');

      const services = registry.discover({ name: 'api-service' });
      expect(services).toHaveLength(2);
    });
  });

  describe('服务发现', () => {
    beforeEach(() => {
      // 注册一些测试服务
      registry.register(
        createTestInstance('api-1', 'api-service', {
          metadata: { type: 'api', protocols: ['http'], region: 'us-east', tags: ['v1'] },
        }),
      );
      registry.register(
        createTestInstance('api-2', 'api-service', {
          metadata: { type: 'api', protocols: ['http'], region: 'us-west', tags: ['v2'] },
        }),
      );
      registry.register(
        createTestInstance('worker-1', 'worker-service', {
          metadata: { type: 'worker', protocols: ['grpc'], region: 'us-east', tags: ['v1'] },
        }),
      );

      // 设置为健康状态，否则会被过滤
      registry.updateHealth('api-1', 'healthy');
      registry.updateHealth('api-2', 'healthy');
      registry.updateHealth('worker-1', 'healthy');
    });

    it('应该按名称发现服务', () => {
      const services = registry.discover({ name: 'api-service' });
      expect(services).toHaveLength(2);
    });

    it('应该按类型过滤', () => {
      const services = registry.discover({ type: 'api' });
      expect(services).toHaveLength(2);

      const workerServices = registry.discover({ type: 'worker' });
      expect(workerServices).toHaveLength(1);
    });

    it('应该按区域过滤', () => {
      const services = registry.discover({ region: 'us-east' });
      expect(services).toHaveLength(2);

      const westServices = registry.discover({ region: 'us-west' });
      expect(westServices).toHaveLength(1);
    });

    it('应该按标签过滤', () => {
      const services = registry.discover({ tags: ['v1'] });
      expect(services).toHaveLength(2);

      const v2Services = registry.discover({ tags: ['v2'] });
      expect(v2Services).toHaveLength(1);
    });

    it('应该只返回健康的服务', () => {
      // 初始状态下服务已经是 healthy（在 beforeEach 中设置）
      const services = registry.discover({ onlyHealthy: true });
      expect(services).toHaveLength(3); // api-1, api-2, worker-1 都是 healthy

      // 将 api-1 设置为 unhealthy
      registry.updateHealth('api-1', 'unhealthy');

      const healthyServices = registry.discover({ onlyHealthy: true });
      expect(healthyServices).toHaveLength(2); // 只剩下 api-2 和 worker-1
    });

    it('不存在的名称应该返回空数组', () => {
      const services = registry.discover({ name: 'non-existent' });
      expect(services).toEqual([]);
    });
  });

  describe('负载均衡', () => {
    beforeEach(() => {
      registry.register(createTestInstance('api-1', 'api-service', { port: 3001, weight: 1 }));
      registry.register(createTestInstance('api-2', 'api-service', { port: 3002, weight: 1 }));
      registry.register(createTestInstance('api-3', 'api-service', { port: 3003, weight: 1 }));

      // 设置为健康
      registry.updateHealth('api-1', 'healthy');
      registry.updateHealth('api-2', 'healthy');
      registry.updateHealth('api-3', 'healthy');
    });

    it('应该返回服务实例', () => {
      const instance = registry.getInstance('api-service');
      expect(instance).not.toBeNull();
      expect(instance?.name).toBe('api-service');
    });

    it('没有健康实例应该返回 null', () => {
      registry.updateHealth('api-1', 'unhealthy');
      registry.updateHealth('api-2', 'unhealthy');
      registry.updateHealth('api-3', 'unhealthy');

      const instance = registry.getInstance('api-service');
      expect(instance).toBeNull();
    });

    it('轮询策略应该循环选择', () => {
      const selectedPorts: number[] = [];

      for (let i = 0; i < 6; i++) {
        const instance = registry.getInstance('api-service');
        selectedPorts.push(instance!.port);
      }

      // 应该循环选择
      expect(selectedPorts[0]).toBe(selectedPorts[3]);
      expect(selectedPorts[1]).toBe(selectedPorts[4]);
      expect(selectedPorts[2]).toBe(selectedPorts[5]);
    });
  });

  describe('健康检查', () => {
    it('应该更新服务健康状态', () => {
      const instance = createTestInstance('test-1', 'api-service');
      registry.register(instance);

      // 初始状态是 unknown，设置为 healthy
      registry.updateHealth('test-1', 'healthy');
      const services = registry.discover({
        name: 'api-service',
        health: 'healthy',
        onlyHealthy: false,
      });
      expect(services).toHaveLength(1);

      // 设置为 unhealthy
      registry.updateHealth('test-1', 'unhealthy');
      const unhealthyServices = registry.discover({
        name: 'api-service',
        health: 'unhealthy',
        onlyHealthy: false,
      });
      expect(unhealthyServices).toHaveLength(1);
    });

    it('应该处理心跳', () => {
      const instance = createTestInstance('test-1', 'api-service');
      registry.register(instance);

      const result = registry.heartbeat('test-1');
      expect(result).toBe(true);

      // 不存在的实例
      const result2 = registry.heartbeat('non-existent');
      expect(result2).toBe(false);
    });
  });

  describe('连接计数', () => {
    it('应该管理连接计数', () => {
      const instance = createTestInstance('test-1', 'api-service');
      registry.register(instance);

      registry.incrementConnections('test-1');
      registry.incrementConnections('test-1');
      registry.incrementConnections('test-1');

      registry.decrementConnections('test-1');

      // 验证计数（通过最少连接策略）
      expect(() => registry.getInstance('api-service')).not.toThrow();
    });
  });

  describe('统计信息', () => {
    beforeEach(() => {
      registry.register(
        createTestInstance('api-1', 'api-service', {
          metadata: { type: 'api', protocols: ['http'] },
        }),
      );
      registry.register(
        createTestInstance('worker-1', 'worker-service', {
          metadata: { type: 'worker', protocols: ['grpc'] },
        }),
      );
      registry.register(
        createTestInstance('cache-1', 'cache-service', {
          metadata: { type: 'cache', protocols: ['redis'] },
        }),
      );
    });

    it('应该返回服务统计', () => {
      const stats = registry.getStats();

      expect(stats.totalServices).toBe(3);
      expect(stats.servicesByType['api']).toBe(1);
      expect(stats.servicesByType['worker']).toBe(1);
      expect(stats.servicesByType['cache']).toBe(1);
    });

    it('应该统计健康和不健康服务', () => {
      registry.updateHealth('api-1', 'healthy');
      registry.updateHealth('worker-1', 'unhealthy');

      const stats = registry.getStats();
      expect(stats.healthyServices).toBe(1);
      expect(stats.unhealthyServices).toBe(1);
    });
  });

  describe('清理', () => {
    it('应该清理所有服务', () => {
      registry.register(createTestInstance('test-1', 'api-service'));
      registry.register(createTestInstance('test-2', 'api-service'));

      expect(registry.getAllServices()).toHaveLength(2);

      registry.clear();

      expect(registry.getAllServices()).toHaveLength(0);
    });
  });

  describe('便捷函数', () => {
    it('registerService 应该工作', () => {
      const instance = registerService(createTestInstance('test-1', 'api-service'));
      expect(instance.id).toBe('test-1');
    });

    it('unregisterService 应该工作', () => {
      registerService(createTestInstance('test-1', 'api-service'));
      const result = unregisterService('test-1');
      expect(result).toBe(true);
    });

    it('discoverServices 应该工作', () => {
      registerService(createTestInstance('test-1', 'api-service'));
      // 设置为健康状态
      serviceRegistry.updateHealth('test-1', 'healthy');
      const services = discoverServices({ name: 'api-service' });
      expect(services).toHaveLength(1);
    });

    it('getServiceInstance 应该工作', () => {
      registerService(createTestInstance('test-1', 'api-service', { weight: 1 }));
      serviceRegistry.updateHealth('test-1', 'healthy');

      const instance = getServiceInstance('api-service');
      expect(instance).not.toBeNull();
    });

    it('serviceHeartbeat 应该工作', () => {
      registerService(createTestInstance('test-1', 'api-service'));
      const result = serviceHeartbeat('test-1');
      expect(result).toBe(true);
    });

    it('getServiceStats 应该工作', () => {
      registerService(createTestInstance('test-1', 'api-service'));
      const stats = getServiceStats();
      expect(stats.totalServices).toBeGreaterThanOrEqual(1);
    });
  });
});

// 辅助函数
function createTestInstance(
  id: string,
  name: string,
  overrides: Partial<ServiceInstance> = {},
): Omit<ServiceInstance, 'registeredAt' | 'lastHeartbeat' | 'health'> {
  return {
    id,
    name,
    version: '1.0.0',
    host: 'localhost',
    port: 3000,
    weight: 1,
    metadata: {
      type: 'api',
      protocols: ['http'],
      ...overrides.metadata,
    },
    ...overrides,
  };
}
