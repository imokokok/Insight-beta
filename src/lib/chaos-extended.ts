/**
 * Extended Chaos Engineering - 扩展混沌工程
 *
 * 提供更全面的故障注入能力：
 * - Redis 集群故障
 * - 数据库分区
 * - 网络分区
 * - 时钟漂移
 * - 资源耗尽
 */

import { logger } from '@/lib/logger';
import { redisClusterManager } from '@/lib/redis-cluster';

// ============================================================================
// 扩展混沌测试配置
// ============================================================================

export interface ExtendedChaosTestConfig {
  name: string;
  description: string;
  type: ExtendedChaosType;
  enabled: boolean;
  frequency: number;
  duration: number;
  failureProbability: number;
  scope: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoRecovery: boolean;
  recoveryTime: number;
}

export type ExtendedChaosType =
  | 'redis-failure' // Redis 集群故障
  | 'database-partition' // 数据库分区
  | 'network-partition' // 网络分区
  | 'clock-drift' // 时钟漂移
  | 'cpu-throttling' // CPU 限制
  | 'memory-pressure' // 内存压力
  | 'disk-pressure' // 磁盘压力
  | 'connection-pool-exhaustion' // 连接池耗尽
  | 'rate-limiting' // 速率限制
  | 'circuit-breaker'; // 断路器测试

// ============================================================================
// 扩展混沌测试配置列表
// ============================================================================

export const extendedChaosTests: ExtendedChaosTestConfig[] = [
  {
    name: 'redis-cluster-node-failure',
    description: '模拟 Redis 集群节点故障',
    type: 'redis-failure',
    enabled: true,
    frequency: 120000, // 2分钟
    duration: 10000, // 10秒
    failureProbability: 0.2,
    scope: ['redis-cluster'],
    severity: 'high',
    autoRecovery: true,
    recoveryTime: 5000,
  },
  {
    name: 'database-read-replica-failure',
    description: '模拟数据库读副本故障',
    type: 'database-partition',
    enabled: true,
    frequency: 180000, // 3分钟
    duration: 15000, // 15秒
    failureProbability: 0.15,
    scope: ['database-read'],
    severity: 'medium',
    autoRecovery: true,
    recoveryTime: 10000,
  },
  {
    name: 'network-partition-between-services',
    description: '模拟服务间网络分区',
    type: 'network-partition',
    enabled: true,
    frequency: 300000, // 5分钟
    duration: 20000, // 20秒
    failureProbability: 0.1,
    scope: ['oracle-service', 'api-service'],
    severity: 'critical',
    autoRecovery: true,
    recoveryTime: 15000,
  },
  {
    name: 'clock-drift-simulation',
    description: '模拟时钟漂移',
    type: 'clock-drift',
    enabled: false, // 默认禁用，需要特殊处理
    frequency: 600000, // 10分钟
    duration: 30000, // 30秒
    failureProbability: 0.05,
    scope: ['all-nodes'],
    severity: 'medium',
    autoRecovery: true,
    recoveryTime: 5000,
  },
  {
    name: 'cpu-throttling',
    description: '模拟 CPU 限制',
    type: 'cpu-throttling',
    enabled: true,
    frequency: 240000, // 4分钟
    duration: 30000, // 30秒
    failureProbability: 0.2,
    scope: ['worker-threads'],
    severity: 'medium',
    autoRecovery: true,
    recoveryTime: 5000,
  },
  {
    name: 'memory-pressure-test',
    description: '模拟内存压力',
    type: 'memory-pressure',
    enabled: true,
    frequency: 300000, // 5分钟
    duration: 60000, // 60秒
    failureProbability: 0.15,
    scope: ['cache-layer', 'worker-threads'],
    severity: 'high',
    autoRecovery: true,
    recoveryTime: 10000,
  },
  {
    name: 'connection-pool-exhaustion',
    description: '模拟连接池耗尽',
    type: 'connection-pool-exhaustion',
    enabled: true,
    frequency: 180000, // 3分钟
    duration: 20000, // 20秒
    failureProbability: 0.25,
    scope: ['database-pool', 'redis-pool'],
    severity: 'high',
    autoRecovery: true,
    recoveryTime: 8000,
  },
  {
    name: 'rate-limiting-stress',
    description: '模拟速率限制压力',
    type: 'rate-limiting',
    enabled: true,
    frequency: 120000, // 2分钟
    duration: 30000, // 30秒
    failureProbability: 0.3,
    scope: ['api-endpoints', 'external-apis'],
    severity: 'low',
    autoRecovery: true,
    recoveryTime: 30000,
  },
  {
    name: 'circuit-breaker-trip',
    description: '模拟断路器触发',
    type: 'circuit-breaker',
    enabled: true,
    frequency: 240000, // 4分钟
    duration: 45000, // 45秒
    failureProbability: 0.2,
    scope: ['external-services'],
    severity: 'medium',
    autoRecovery: true,
    recoveryTime: 30000,
  },
];

// ============================================================================
// 扩展混沌注入器
// ============================================================================

export class ExtendedChaosInjector {
  private activeTests: Map<string, NodeJS.Timeout> = new Map();
  private testResults: Map<
    string,
    {
      name: string;
      startTime: number;
      endTime?: number;
      status: 'running' | 'completed' | 'failed';
      error?: string;
    }
  > = new Map();
  private globalEnabled = false;
  private dryRun = false;

  constructor() {
    this.globalEnabled = process.env.CHAOS_EXTENDED_ENABLED === 'true';
    this.dryRun = process.env.CHAOS_DRY_RUN === 'true';
  }

  /**
   * 启动扩展混沌测试
   */
  start(): void {
    if (!this.globalEnabled) {
      logger.info('Extended chaos testing disabled. Set CHAOS_EXTENDED_ENABLED=true to enable');
      return;
    }

    logger.info('Starting extended chaos testing', {
      testsCount: extendedChaosTests.filter((t) => t.enabled).length,
      dryRun: this.dryRun,
    });

    for (const test of extendedChaosTests) {
      if (test.enabled) {
        this.scheduleTest(test);
      }
    }
  }

  /**
   * 停止所有混沌测试
   */
  stop(): void {
    logger.info('Stopping extended chaos testing');

    for (const [name, timer] of this.activeTests) {
      clearInterval(timer);
      logger.debug('Stopped chaos test', { name });
    }

    this.activeTests.clear();
  }

  /**
   * 调度测试
   */
  private scheduleTest(test: ExtendedChaosTestConfig): void {
    const timer = setInterval(async () => {
      if (Math.random() < test.failureProbability) {
        await this.executeTest(test);
      }
    }, test.frequency);

    this.activeTests.set(test.name, timer);
    logger.info('Scheduled chaos test', {
      name: test.name,
      frequency: test.frequency,
      severity: test.severity,
    });
  }

  /**
   * 执行测试
   */
  private async executeTest(test: ExtendedChaosTestConfig): Promise<void> {
    if (this.dryRun) {
      logger.info('[DRY RUN] Would execute chaos test', {
        name: test.name,
        type: test.type,
        scope: test.scope,
      });
      return;
    }

    const testId = `${test.name}-${Date.now()}`;
    this.testResults.set(testId, {
      name: test.name,
      startTime: Date.now(),
      status: 'running',
    });

    logger.info('Executing chaos test', {
      name: test.name,
      type: test.type,
      severity: test.severity,
      scope: test.scope,
    });

    try {
      switch (test.type) {
        case 'redis-failure':
          await this.injectRedisFailure(test);
          break;
        case 'database-partition':
          await this.injectDatabasePartition(test);
          break;
        case 'network-partition':
          await this.injectNetworkPartition(test);
          break;
        case 'clock-drift':
          await this.injectClockDrift(test);
          break;
        case 'cpu-throttling':
          await this.injectCpuThrottling(test);
          break;
        case 'memory-pressure':
          await this.injectMemoryPressure(test);
          break;
        case 'connection-pool-exhaustion':
          await this.injectConnectionPoolExhaustion(test);
          break;
        case 'rate-limiting':
          await this.injectRateLimiting(test);
          break;
        case 'circuit-breaker':
          await this.injectCircuitBreakerTrip(test);
          break;
      }

      // 等待测试持续时间
      await new Promise((resolve) => setTimeout(resolve, test.duration));

      // 自动恢复
      if (test.autoRecovery) {
        await this.recoverTest(test);
      }

      this.testResults.set(testId, {
        name: test.name,
        startTime: this.testResults.get(testId)!.startTime,
        endTime: Date.now(),
        status: 'completed',
      });

      logger.info('Completed chaos test', { name: test.name });
    } catch (error) {
      this.testResults.set(testId, {
        name: test.name,
        startTime: this.testResults.get(testId)!.startTime,
        endTime: Date.now(),
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });

      logger.error('Chaos test failed', {
        name: test.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Redis 故障注入
   */
  private async injectRedisFailure(test: ExtendedChaosTestConfig): Promise<void> {
    logger.warn('Injecting Redis cluster failure', {
      scope: test.scope,
      duration: test.duration,
    });

    // 模拟 Redis 连接断开
    if (redisClusterManager.isConnected()) {
      await redisClusterManager.disconnect();
      logger.info('Simulated Redis disconnection');
    }
  }

  /**
   * 数据库分区注入
   */
  private async injectDatabasePartition(test: ExtendedChaosTestConfig): Promise<void> {
    logger.warn('Injecting database partition', {
      scope: test.scope,
      duration: test.duration,
    });

    // 这里可以模拟数据库连接延迟或失败
    // 实际实现需要与数据库层集成
  }

  /**
   * 网络分区注入
   */
  private async injectNetworkPartition(test: ExtendedChaosTestConfig): Promise<void> {
    logger.warn('Injecting network partition', {
      scope: test.scope,
      duration: test.duration,
    });

    // 模拟网络延迟
    const delay = Math.floor(Math.random() * 5000) + 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * 时钟漂移注入
   */
  private async injectClockDrift(test: ExtendedChaosTestConfig): Promise<void> {
    logger.warn('Injecting clock drift', {
      scope: test.scope,
      duration: test.duration,
    });

    // 注意：实际时钟漂移需要系统级权限
    // 这里只是模拟时间相关操作的异常
    const drift = Math.floor(Math.random() * 60000) - 30000; // -30s to +30s
    logger.info(`Simulated clock drift: ${drift}ms`);
  }

  /**
   * CPU 限制注入
   */
  private async injectCpuThrottling(test: ExtendedChaosTestConfig): Promise<void> {
    logger.warn('Injecting CPU throttling', {
      scope: test.scope,
      duration: test.duration,
    });

    const startTime = Date.now();
    // 模拟 CPU 密集型操作
    while (Date.now() - startTime < 100) {
      // 执行一些计算密集型操作
      for (let i = 0; i < 1000000; i++) {
        Math.sqrt(i);
      }
      // 短暂休息避免完全阻塞
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  /**
   * 内存压力注入
   */
  private async injectMemoryPressure(test: ExtendedChaosTestConfig): Promise<void> {
    logger.warn('Injecting memory pressure', {
      scope: test.scope,
      duration: test.duration,
    });

    // 分配临时内存
    const buffers: Buffer[] = [];
    const targetSize = 100 * 1024 * 1024; // 100MB

    try {
      for (let i = 0; i < 10; i++) {
        buffers.push(Buffer.alloc(targetSize / 10));
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } finally {
      // 清理内存
      buffers.length = 0;
      if (global.gc) {
        global.gc();
      }
    }
  }

  /**
   * 连接池耗尽注入
   */
  private async injectConnectionPoolExhaustion(test: ExtendedChaosTestConfig): Promise<void> {
    logger.warn('Injecting connection pool exhaustion', {
      scope: test.scope,
      duration: test.duration,
    });

    // 模拟大量并发连接请求
    const connections: Promise<unknown>[] = [];
    for (let i = 0; i < 100; i++) {
      connections.push(
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection pool exhausted')), 50);
        }).catch(() => {}),
      );
    }

    await Promise.allSettled(connections);
  }

  /**
   * 速率限制注入
   */
  private async injectRateLimiting(test: ExtendedChaosTestConfig): Promise<void> {
    logger.warn('Injecting rate limiting', {
      scope: test.scope,
      duration: test.duration,
    });

    // 模拟速率限制响应
    const requests = Array.from(
      { length: 100 },
      (_, i) =>
        new Promise((resolve, reject) => {
          setTimeout(() => {
            if (i % 3 === 0) {
              reject(new Error('Rate limit exceeded'));
            } else {
              resolve(undefined);
            }
          }, Math.random() * 100);
        }),
    );

    await Promise.allSettled(requests);
  }

  /**
   * 断路器触发注入
   */
  private async injectCircuitBreakerTrip(test: ExtendedChaosTestConfig): Promise<void> {
    logger.warn('Injecting circuit breaker trip', {
      scope: test.scope,
      duration: test.duration,
    });

    // 模拟连续失败触发断路器
    const failures = 10;
    for (let i = 0; i < failures; i++) {
      logger.debug(`Simulating failure ${i + 1}/${failures}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * 恢复测试
   */
  private async recoverTest(test: ExtendedChaosTestConfig): Promise<void> {
    logger.info('Recovering from chaos test', {
      name: test.name,
      recoveryTime: test.recoveryTime,
    });

    switch (test.type) {
      case 'redis-failure':
        // 重新连接 Redis
        await redisClusterManager.getClient();
        break;
      case 'memory-pressure':
        // 强制垃圾回收
        if (global.gc) {
          global.gc();
        }
        break;
    }

    await new Promise((resolve) => setTimeout(resolve, test.recoveryTime));
  }

  /**
   * 获取测试结果
   */
  getResults(): Array<{
    name: string;
    startTime: number;
    endTime?: number;
    status: 'running' | 'completed' | 'failed';
    error?: string;
  }> {
    return Array.from(this.testResults.values());
  }

  /**
   * 获取活跃测试列表
   */
  getActiveTests(): string[] {
    return Array.from(this.activeTests.keys());
  }

  /**
   * 检查是否启用
   */
  isEnabled(): boolean {
    return this.globalEnabled;
  }
}

// 导出单例
export const extendedChaosInjector = new ExtendedChaosInjector();

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 启动扩展混沌测试
 */
export function startExtendedChaos(): void {
  extendedChaosInjector.start();
}

/**
 * 停止扩展混沌测试
 */
export function stopExtendedChaos(): void {
  extendedChaosInjector.stop();
}

/**
 * 获取混沌测试结果
 */
export function getChaosResults(): Array<{
  name: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'failed';
  error?: string;
}> {
  return extendedChaosInjector.getResults();
}

/**
 * 检查扩展混沌是否启用
 */
export function isExtendedChaosEnabled(): boolean {
  return extendedChaosInjector.isEnabled();
}
