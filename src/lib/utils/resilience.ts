/**
 * Resilience Utilities
 *
 * P1 优化：熔断和智能重试机制
 * - 熔断器模式 (Circuit Breaker)
 * - 自适应重试策略
 * - 指数退避 + 抖动
 */

import { logger } from '@/lib/logger';

import { sleep } from './common';

// ============================================================================
// 熔断器 (Circuit Breaker)
// ============================================================================

export type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerOptions {
  failureThreshold: number; // 失败阈值，超过则熔断
  successThreshold: number; // 半开状态下成功阈值，达到则关闭
  timeoutMs: number; // 熔断持续时间
  monitorIntervalMs?: number; // 监控间隔
}

interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;
  private options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions) {
    this.options = {
      monitorIntervalMs: 5000,
      ...options,
    };
  }

  /**
   * 执行带熔断保护的操作
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() < this.nextAttemptTime) {
        throw new CircuitBreakerError('Circuit breaker is open');
      }
      // 进入半开状态
      this.state = 'half-open';
      this.successes = 0;
      logger.debug('Circuit breaker entering half-open state');
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * 成功回调
   */
  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.reset();
        logger.info('Circuit breaker closed');
      }
    } else {
      this.failures = Math.max(0, this.failures - 1);
    }
  }

  /**
   * 失败回调
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open' || this.failures >= this.options.failureThreshold) {
      this.trip();
    }
  }

  /**
   * 熔断
   */
  private trip(): void {
    this.state = 'open';
    this.nextAttemptTime = Date.now() + this.options.timeoutMs;
    logger.warn('Circuit breaker tripped', {
      failures: this.failures,
      timeoutMs: this.options.timeoutMs,
    });
  }

  /**
   * 重置
   */
  private reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
  }

  /**
   * 获取统计信息
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /**
   * 强制重置（手动恢复）
   */
  forceReset(): void {
    this.reset();
    logger.info('Circuit breaker manually reset');
  }
}

export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

// ============================================================================
// 智能重试 (Smart Retry)
// ============================================================================

export interface RetryOptions {
  maxRetries: number; // 最大重试次数
  baseDelayMs: number; // 基础延迟
  maxDelayMs: number; // 最大延迟
  backoffMultiplier: number; // 退避乘数
  jitter?: boolean; // 是否添加抖动
  retryableErrors?: string[]; // 可重试的错误类型
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: [],
  onRetry: () => {},
};

/**
 * 带智能重试的操作执行
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 检查是否应该重试
      if (attempt >= opts.maxRetries) {
        throw lastError;
      }

      if (opts.retryableErrors.length > 0) {
        const errorName = lastError.name || lastError.constructor.name;
        if (!opts.retryableErrors.includes(errorName)) {
          throw lastError;
        }
      }

      // 计算延迟
      const delay = calculateDelay(attempt, opts);

      // 回调通知
      opts.onRetry(attempt + 1, lastError, delay);

      // 等待后重试
      await sleep(delay);
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * 计算重试延迟（指数退避 + 抖动）
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  // 指数退避
  const exponentialDelay = options.baseDelayMs * Math.pow(options.backoffMultiplier, attempt);

  // 限制最大延迟
  const cappedDelay = Math.min(exponentialDelay, options.maxDelayMs);

  // 添加抖动（0-25%随机值）
  if (options.jitter) {
    const jitter = Math.random() * 0.25 * cappedDelay;
    return Math.floor(cappedDelay + jitter);
  }

  return cappedDelay;
}

// ============================================================================
// 断路器管理器
// ============================================================================

export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * 获取或创建熔断器
   */
  getBreaker(
    name: string,
    options: CircuitBreakerOptions = {
      failureThreshold: 5,
      successThreshold: 3,
      timeoutMs: 60000,
    },
  ): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(options));
    }
    return this.breakers.get(name)!;
  }

  /**
   * 获取所有熔断器统计
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }

  /**
   * 重置所有熔断器
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.forceReset();
    }
  }
}

// 导出单例
export const circuitBreakerManager = new CircuitBreakerManager();
