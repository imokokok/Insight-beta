/**
 * Service Registry
 * 服务注册表 - 管理所有微服务实例
 */

import { createLogger } from '@oracle-monitor/shared';

import type { ServiceInstance, ServiceHealth, ServiceMetrics } from './types';

export interface ServiceRegistryOptions {
  redisUrl: string;
  healthCheckIntervalMs: number;
}

export class ServiceRegistry {
  private readonly logger: ReturnType<typeof createLogger>;
  private readonly services: Map<string, ServiceInstance> = new Map();
  private readonly healthCheckInterval: number;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(options: ServiceRegistryOptions) {
    this.logger = createLogger({ serviceName: 'orchestrator-registry' });
    this.healthCheckInterval = options.healthCheckIntervalMs;
  }

  /**
   * Initialize the registry
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing service registry');
    this.startHealthChecks();
  }

  /**
   * Stop the registry
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping service registry');
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
  }

  /**
   * Register a new service instance
   */
  registerService(instance: ServiceInstance): void {
    const existing = this.services.get(instance.id);
    if (existing) {
      this.logger.warn('Service already registered, updating', { instanceId: instance.id });
    } else {
      this.logger.info('Registering new service', {
        instanceId: instance.id,
        protocol: instance.protocol,
        chain: instance.chain,
      });
    }

    this.services.set(instance.id, {
      ...instance,
      lastSeen: Date.now(),
    });
  }

  /**
   * Unregister a service instance
   */
  unregisterService(instanceId: string): boolean {
    const existed = this.services.delete(instanceId);
    if (existed) {
      this.logger.info('Unregistered service', { instanceId });
    }
    return existed;
  }

  /**
   * Update service health status
   */
  updateServiceHealth(instanceId: string, health: ServiceHealth): void {
    const service = this.services.get(instanceId);
    if (service) {
      service.health = health;
      service.lastSeen = Date.now();

      // Update status based on health
      if (health.status === 'unhealthy') {
        service.status = 'error';
      } else if (health.status === 'healthy') {
        service.status = 'running';
      }
    }
  }

  /**
   * Update service metrics
   */
  updateServiceMetrics(instanceId: string, metrics: ServiceMetrics): void {
    const service = this.services.get(instanceId);
    if (service) {
      service.metrics = metrics;
      service.lastSeen = Date.now();
    }
  }

  /**
   * Get a service by ID
   */
  getService(instanceId: string): ServiceInstance | undefined {
    return this.services.get(instanceId);
  }

  /**
   * Get all registered services
   */
  getAllServices(): ServiceInstance[] {
    return Array.from(this.services.values());
  }

  /**
   * Get services by protocol
   */
  getServicesByProtocol(protocol: string): ServiceInstance[] {
    return this.getAllServices().filter((s) => s.protocol === protocol);
  }

  /**
   * Get services by chain
   */
  getServicesByChain(chain: string): ServiceInstance[] {
    return this.getAllServices().filter((s) => s.chain === chain);
  }

  /**
   * Get healthy services only
   */
  getHealthyServices(): ServiceInstance[] {
    return this.getAllServices().filter((s) => s.health.status === 'healthy');
  }

  /**
   * Check if a service is healthy
   */
  isServiceHealthy(instanceId: string): boolean {
    const service = this.services.get(instanceId);
    return service?.health.status === 'healthy';
  }

  /**
   * Get service count by status
   */
  getServiceCounts(): { running: number; stopped: number; error: number; unknown: number } {
    const counts = { running: 0, stopped: 0, error: 0, unknown: 0 };

    for (const service of this.services.values()) {
      counts[service.status]++;
    }

    return counts;
  }

  /**
   * Get unique protocols
   */
  getProtocols(): string[] {
    const protocols = new Set<string>();
    for (const service of this.services.values()) {
      protocols.add(service.protocol);
    }
    return Array.from(protocols);
  }

  /**
   * Get unique chains
   */
  getChains(): string[] {
    const chains = new Set<string>();
    for (const service of this.services.values()) {
      chains.add(service.chain);
    }
    return Array.from(chains);
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.healthCheckInterval);
  }

  /**
   * Perform health checks on all services
   */
  private async performHealthChecks(): Promise<void> {
    const now = Date.now();
    const staleThreshold = this.healthCheckInterval * 3;

    for (const [instanceId, service] of this.services) {
      // Check if service hasn't reported in a while
      if (now - service.lastSeen > staleThreshold) {
        this.logger.warn('Service appears stale', {
          instanceId,
          lastSeen: service.lastSeen,
          staleMs: now - service.lastSeen,
        });

        service.status = 'unknown';
        service.health.status = 'unhealthy';
        service.health.consecutiveFailures++;
      }

      // Try to fetch health from service endpoint
      try {
        const health = await this.fetchServiceHealth(service.endpoint);
        this.updateServiceHealth(instanceId, health);
      } catch (error) {
        this.logger.error('Failed to fetch service health', {
          instanceId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Fetch health from a service endpoint
   */
  private async fetchServiceHealth(endpoint: string): Promise<ServiceHealth> {
    const response = await fetch(`${endpoint}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      status: 'healthy' | 'degraded' | 'unhealthy';
      lastSync: number;
      consecutiveFailures?: number;
      errorRate?: number;
    };
    return {
      status: data.status,
      lastSync: data.lastSync,
      consecutiveFailures: data.consecutiveFailures || 0,
      errorRate: data.errorRate || 0,
    };
  }
}
