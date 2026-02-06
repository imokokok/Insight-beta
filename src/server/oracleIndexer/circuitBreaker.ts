/**
 * 熔断器实现
 *
 * 防止服务故障时的级联反应，提高系统稳定性
 */

import { logger } from '@/lib/logger';

import { CIRCUIT_BREAKER_CONFIG } from './constants';

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerMetrics {
  failures: number;
  successes: number;
  lastFailureTime: number;
  state: CircuitState;
  halfOpenAttempts: number;
}

/**
 * 熔断器类
 *
 * 当失败次数超过阈值时，熔断器打开，后续请求直接失败
 * 经过冷却时间后，熔断器进入半开状态，允许少量请求通过
 * 如果半开状态下请求成功，熔断器关闭；否则重新打开
 */
export class CircuitBreaker {
  private metrics: Map<string, CircuitBreakerMetrics> = new Map();
  private readonly failureThreshold: number;
  private readonly coolingPeriodMs: number;
  private readonly halfOpenRequests: number;

  constructor(config?: {
    failureThreshold?: number;
    coolingPeriodMs?: number;
    halfOpenRequests?: number;
  }) {
    this.failureThreshold = config?.failureThreshold ?? CIRCUIT_BREAKER_CONFIG.FAILURE_THRESHOLD;
    this.coolingPeriodMs = config?.coolingPeriodMs ?? CIRCUIT_BREAKER_CONFIG.COOLING_PERIOD_MS;
    this.halfOpenRequests = config?.halfOpenRequests ?? CIRCUIT_BREAKER_CONFIG.HALF_OPEN_REQUESTS;
  }

  /**
   * 执行带熔断保护的函数
   * @param key - 熔断器标识（如 RPC URL）
   * @param fn - 要执行的函数
   * @returns 函数执行结果
   * @throws 当熔断器打开时抛出错误
   */
  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const state = this.getState(key);

    if (state === 'open') {
      const metrics = this.metrics.get(key);
      if (metrics) {
        const timeSinceLastFailure = Date.now() - metrics.lastFailureTime;
        if (timeSinceLastFailure < this.coolingPeriodMs) {
          throw new Error(
            `Circuit breaker is OPEN for ${key}. Try again in ${Math.ceil((this.coolingPeriodMs - timeSinceLastFailure) / 1000)}s`,
          );
        }
        // 冷却时间已过，进入半开状态
        this.transitionToHalfOpen(key);
      }
    }

    try {
      const result = await fn();
      this.onSuccess(key);
      return result;
    } catch (error) {
      this.onFailure(key);
      throw error;
    }
  }

  /**
   * 获取熔断器状态
   * @param key - 熔断器标识
   * @returns 当前状态
   */
  getState(key: string): CircuitState {
    const metrics = this.metrics.get(key);
    return metrics?.state ?? 'closed';
  }

  /**
   * 获取熔断器统计信息
   * @param key - 熔断器标识
   * @returns 统计信息
   */
  getMetrics(key: string): CircuitBreakerMetrics | undefined {
    return this.metrics.get(key);
  }

  /**
   * 手动重置熔断器
   * @param key - 熔断器标识
   */
  reset(key: string): void {
    this.metrics.delete(key);
    logger.info('Circuit breaker reset', { key });
  }

  /**
   * 重置所有熔断器
   */
  resetAll(): void {
    this.metrics.clear();
    logger.info('All circuit breakers reset');
  }

  private getOrCreateMetrics(key: string): CircuitBreakerMetrics {
    let metrics = this.metrics.get(key);
    if (!metrics) {
      metrics = {
        failures: 0,
        successes: 0,
        lastFailureTime: 0,
        state: 'closed',
        halfOpenAttempts: 0,
      };
      this.metrics.set(key, metrics);
    }
    return metrics;
  }

  private onSuccess(key: string): void {
    const metrics = this.getOrCreateMetrics(key);
    metrics.successes++;

    if (metrics.state === 'half-open') {
      metrics.halfOpenAttempts++;
      if (metrics.halfOpenAttempts >= this.halfOpenRequests) {
        // 半开状态下成功次数达到阈值，关闭熔断器
        this.closeCircuit(key);
      }
    } else if (metrics.state === 'closed') {
      // 重置失败计数
      metrics.failures = 0;
    }
  }

  private onFailure(key: string): void {
    const metrics = this.getOrCreateMetrics(key);
    metrics.failures++;
    metrics.lastFailureTime = Date.now();

    if (metrics.state === 'half-open') {
      // 半开状态下失败，重新打开熔断器
      this.openCircuit(key);
    } else if (metrics.state === 'closed' && metrics.failures >= this.failureThreshold) {
      // 失败次数超过阈值，打开熔断器
      this.openCircuit(key);
    }
  }

  private openCircuit(key: string): void {
    const metrics = this.getOrCreateMetrics(key);
    metrics.state = 'open';
    metrics.halfOpenAttempts = 0;
    logger.warn('Circuit breaker opened', {
      key,
      failures: metrics.failures,
      coolingPeriodMs: this.coolingPeriodMs,
    });
  }

  private closeCircuit(key: string): void {
    const metrics = this.getOrCreateMetrics(key);
    metrics.state = 'closed';
    metrics.failures = 0;
    metrics.halfOpenAttempts = 0;
    logger.info('Circuit breaker closed', { key });
  }

  private transitionToHalfOpen(key: string): void {
    const metrics = this.getOrCreateMetrics(key);
    metrics.state = 'half-open';
    metrics.halfOpenAttempts = 0;
    logger.info('Circuit breaker half-opened', { key });
  }
}

/** 全局熔断器实例 */
export const rpcCircuitBreaker = new CircuitBreaker();
