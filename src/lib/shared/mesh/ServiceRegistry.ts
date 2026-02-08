/**
 * Service Registry - 服务注册中心
 *
 * 提供服务发现、健康检查和负载均衡功能：
 * - 服务注册/注销
 * - 服务发现
 * - 健康检查
 * - 负载均衡策略
 */

import { logger } from '@/lib/logger';

// ============================================================================
// 类型定义
// ============================================================================

export interface ServiceInstance {
  /** 服务唯一ID */
  id: string;
  /** 服务名称 */
  name: string;
  /** 服务版本 */
  version: string;
  /** 服务地址 */
  host: string;
  /** 服务端口号 */
  port: number;
  /** 服务元数据 */
  metadata: ServiceMetadata;
  /** 健康状态 */
  health: HealthStatus;
  /** 注册时间 */
  registeredAt: Date;
  /** 最后心跳时间 */
  lastHeartbeat: Date;
  /** 权重（用于负载均衡） */
  weight: number;
}

export interface ServiceMetadata {
  /** 服务类型 */
  type: 'api' | 'worker' | 'sync' | 'cache' | 'queue';
  /** 支持的协议 */
  protocols: string[];
  /** 支持的链 */
  chains?: string[];
  /** 区域 */
  region?: string;
  /** 环境 */
  environment?: string;
  /** 自定义标签 */
  tags?: string[];
}

export type HealthStatus = 'healthy' | 'unhealthy' | 'unknown' | 'degraded';

export interface ServiceQuery {
  /** 服务名称 */
  name?: string;
  /** 服务版本 */
  version?: string;
  /** 服务类型 */
  type?: ServiceMetadata['type'];
  /** 健康状态 */
  health?: HealthStatus;
  /** 区域 */
  region?: string;
  /** 标签 */
  tags?: string[];
  /** 只返回健康的服务 */
  onlyHealthy?: boolean;
}

export type LoadBalanceStrategy =
  | 'round-robin'
  | 'random'
  | 'weighted'
  | 'least-connections'
  | 'ip-hash';

export interface LoadBalancerConfig {
  strategy: LoadBalanceStrategy;
  /** 健康检查间隔（毫秒） */
  healthCheckInterval: number;
  /** 服务超时时间（毫秒） */
  serviceTimeout: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 是否启用熔断 */
  enableCircuitBreaker: boolean;
  /** 熔断阈值 */
  circuitBreakerThreshold: number;
}

// ============================================================================
// 服务注册中心
// ============================================================================

export class ServiceRegistry {
  private services: Map<string, ServiceInstance> = new Map();
  private serviceIndex: Map<string, Set<string>> = new Map(); // name -> instance ids
  private healthCheckTimers: Map<string, NodeJS.Timeout> = new Map();
  private roundRobinCounters: Map<string, number> = new Map();
  private connectionCounts: Map<string, number> = new Map();

  private config: LoadBalancerConfig = {
    strategy: 'round-robin',
    healthCheckInterval: 30000,
    serviceTimeout: 5000,
    maxRetries: 3,
    enableCircuitBreaker: true,
    circuitBreakerThreshold: 5,
  };

  constructor(config?: Partial<LoadBalancerConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * 注册服务
   */
  register(
    instance: Omit<ServiceInstance, 'registeredAt' | 'lastHeartbeat' | 'health'>,
  ): ServiceInstance {
    const fullInstance: ServiceInstance = {
      ...instance,
      health: 'unknown',
      registeredAt: new Date(),
      lastHeartbeat: new Date(),
    };

    this.services.set(instance.id, fullInstance);

    // 更新索引
    if (!this.serviceIndex.has(instance.name)) {
      this.serviceIndex.set(instance.name, new Set());
    }
    this.serviceIndex.get(instance.name)!.add(instance.id);

    // 初始化连接计数
    this.connectionCounts.set(instance.id, 0);

    logger.info('Service registered', {
      id: instance.id,
      name: instance.name,
      host: instance.host,
      port: instance.port,
    });

    // 启动健康检查
    this.startHealthCheck(instance.id);

    return fullInstance;
  }

  /**
   * 注销服务
   */
  unregister(instanceId: string): boolean {
    const instance = this.services.get(instanceId);
    if (!instance) {
      return false;
    }

    // 停止健康检查
    this.stopHealthCheck(instanceId);

    // 从索引中移除
    const index = this.serviceIndex.get(instance.name);
    if (index) {
      index.delete(instanceId);
      if (index.size === 0) {
        this.serviceIndex.delete(instance.name);
      }
    }

    // 移除服务
    this.services.delete(instanceId);
    this.connectionCounts.delete(instanceId);

    logger.info('Service unregistered', {
      id: instanceId,
      name: instance.name,
    });

    return true;
  }

  /**
   * 更新服务心跳
   */
  heartbeat(instanceId: string): boolean {
    const instance = this.services.get(instanceId);
    if (!instance) {
      return false;
    }

    instance.lastHeartbeat = new Date();

    // 如果之前是不健康状态，尝试恢复
    if (instance.health === 'unhealthy') {
      instance.health = 'unknown';
    }

    return true;
  }

  /**
   * 更新服务健康状态
   */
  updateHealth(instanceId: string, health: HealthStatus): void {
    const instance = this.services.get(instanceId);
    if (instance) {
      const oldHealth = instance.health;
      instance.health = health;

      if (oldHealth !== health) {
        logger.info('Service health changed', {
          id: instanceId,
          name: instance.name,
          from: oldHealth,
          to: health,
        });
      }
    }
  }

  /**
   * 发现服务
   */
  discover(query: ServiceQuery): ServiceInstance[] {
    let results = Array.from(this.services.values());

    // 应用过滤条件
    if (query.name) {
      const ids = this.serviceIndex.get(query.name);
      if (ids) {
        results = Array.from(ids)
          .map((id) => this.services.get(id)!)
          .filter(Boolean);
      } else {
        return [];
      }
    }

    if (query.version) {
      results = results.filter((s) => s.version === query.version);
    }

    if (query.type) {
      results = results.filter((s) => s.metadata.type === query.type);
    }

    if (query.health) {
      results = results.filter((s) => s.health === query.health);
    }

    if (query.region) {
      results = results.filter((s) => s.metadata.region === query.region);
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter((s) => query.tags!.some((tag) => s.metadata.tags?.includes(tag)));
    }

    if (query.onlyHealthy !== false) {
      results = results.filter((s) => s.health === 'healthy');
    }

    return results;
  }

  /**
   * 获取单个服务实例（负载均衡）
   */
  getInstance(serviceName: string): ServiceInstance | null {
    const instances = this.discover({ name: serviceName, onlyHealthy: true });

    if (instances.length === 0) {
      logger.warn('No healthy instances found', { serviceName });
      return null;
    }

    return this.selectInstance(instances);
  }

  /**
   * 选择实例（负载均衡策略）
   */
  private selectInstance(instances: ServiceInstance[]): ServiceInstance {
    switch (this.config.strategy) {
      case 'round-robin':
        return this.roundRobin(instances);
      case 'random':
        return this.random(instances);
      case 'weighted':
        return this.weighted(instances);
      case 'least-connections':
        return this.leastConnections(instances);
      case 'ip-hash':
        return this.ipHash(instances);
      default:
        return this.roundRobin(instances);
    }
  }

  /**
   * 轮询策略
   */
  private roundRobin(instances: ServiceInstance[]): ServiceInstance {
    const counter = this.roundRobinCounters.get(instances[0].name) || 0;
    const instance = instances[counter % instances.length];
    this.roundRobinCounters.set(instances[0].name, counter + 1);
    return instance;
  }

  /**
   * 随机策略
   */
  private random(instances: ServiceInstance[]): ServiceInstance {
    const index = Math.floor(Math.random() * instances.length);
    return instances[index];
  }

  /**
   * 加权策略
   */
  private weighted(instances: ServiceInstance[]): ServiceInstance {
    const totalWeight = instances.reduce((sum, i) => sum + i.weight, 0);
    let random = Math.random() * totalWeight;

    for (const instance of instances) {
      random -= instance.weight;
      if (random <= 0) {
        return instance;
      }
    }

    return instances[instances.length - 1];
  }

  /**
   * 最少连接策略
   */
  private leastConnections(instances: ServiceInstance[]): ServiceInstance {
    return instances.reduce((min, instance) => {
      const minCount = this.connectionCounts.get(min.id) || 0;
      const instanceCount = this.connectionCounts.get(instance.id) || 0;
      return instanceCount < minCount ? instance : min;
    });
  }

  /**
   * IP 哈希策略
   */
  private ipHash(instances: ServiceInstance[]): ServiceInstance {
    // 简化的哈希实现
    const hash = Date.now() % instances.length;
    return instances[hash];
  }

  /**
   * 增加连接计数
   */
  incrementConnections(instanceId: string): void {
    const count = this.connectionCounts.get(instanceId) || 0;
    this.connectionCounts.set(instanceId, count + 1);
  }

  /**
   * 减少连接计数
   */
  decrementConnections(instanceId: string): void {
    const count = this.connectionCounts.get(instanceId) || 0;
    if (count > 0) {
      this.connectionCounts.set(instanceId, count - 1);
    }
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(instanceId: string): void {
    const timer = setInterval(async () => {
      await this.checkHealth(instanceId);
    }, this.config.healthCheckInterval);

    this.healthCheckTimers.set(instanceId, timer);
  }

  /**
   * 停止健康检查
   */
  private stopHealthCheck(instanceId: string): void {
    const timer = this.healthCheckTimers.get(instanceId);
    if (timer) {
      clearInterval(timer);
      this.healthCheckTimers.delete(instanceId);
    }
  }

  /**
   * 执行健康检查
   */
  private async checkHealth(instanceId: string): Promise<void> {
    const instance = this.services.get(instanceId);
    if (!instance) return;

    // 检查心跳超时
    const now = new Date();
    const heartbeatTimeout = this.config.healthCheckInterval * 2;
    const lastHeartbeat = instance.lastHeartbeat.getTime();

    if (now.getTime() - lastHeartbeat > heartbeatTimeout) {
      this.updateHealth(instanceId, 'unhealthy');
      logger.warn('Service heartbeat timeout', {
        id: instanceId,
        name: instance.name,
        lastHeartbeat: instance.lastHeartbeat,
      });
    }
  }

  /**
   * 获取所有服务
   */
  getAllServices(): ServiceInstance[] {
    return Array.from(this.services.values());
  }

  /**
   * 获取服务统计
   */
  getStats(): {
    totalServices: number;
    healthyServices: number;
    unhealthyServices: number;
    servicesByType: Record<string, number>;
  } {
    const allServices = this.getAllServices();
    const healthyServices = allServices.filter((s) => s.health === 'healthy');
    const unhealthyServices = allServices.filter((s) => s.health === 'unhealthy');

    const servicesByType: Record<string, number> = {};
    for (const service of allServices) {
      const type = service.metadata.type;
      servicesByType[type] = (servicesByType[type] || 0) + 1;
    }

    return {
      totalServices: allServices.length,
      healthyServices: healthyServices.length,
      unhealthyServices: unhealthyServices.length,
      servicesByType,
    };
  }

  /**
   * 清理所有服务
   */
  clear(): void {
    for (const [id] of this.services) {
      this.unregister(id);
    }
    this.services.clear();
    this.serviceIndex.clear();
    this.roundRobinCounters.clear();
    this.connectionCounts.clear();
  }
}

// ============================================================================
// 单例导出
// ============================================================================

export const serviceRegistry = new ServiceRegistry();

// ============================================================================
// 便捷函数
// ============================================================================

export function registerService(
  instance: Omit<ServiceInstance, 'registeredAt' | 'lastHeartbeat' | 'health'>,
): ServiceInstance {
  return serviceRegistry.register(instance);
}

export function unregisterService(instanceId: string): boolean {
  return serviceRegistry.unregister(instanceId);
}

export function discoverServices(query: ServiceQuery): ServiceInstance[] {
  return serviceRegistry.discover(query);
}

export function getServiceInstance(serviceName: string): ServiceInstance | null {
  return serviceRegistry.getInstance(serviceName);
}

export function serviceHeartbeat(instanceId: string): boolean {
  return serviceRegistry.heartbeat(instanceId);
}

export function getServiceStats(): ReturnType<ServiceRegistry['getStats']> {
  return serviceRegistry.getStats();
}
