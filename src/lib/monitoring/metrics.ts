/**
 * Metrics Module - 性能指标收集
 *
 * 基于 OpenTelemetry 的性能指标收集
 */

import {
  metrics as otelMetrics,
  type Meter,
  type Histogram,
  type Counter,
} from '@opentelemetry/api';
import { logger } from '@/lib/logger';

// ============================================================================
// 全局 Meter
// ============================================================================

let meter: Meter | null = null;

export function getMeter(): Meter {
  if (!meter) {
    meter = otelMetrics.getMeter('oracle-monitor', '1.0.0');
  }
  return meter;
}

// ============================================================================
// 指标缓存
// ============================================================================

const histogramCache = new Map<string, Histogram>();
const counterCache = new Map<string, Counter>();

// ============================================================================
// 指标收集函数
// ============================================================================

export const metrics = {
  /**
   * 记录直方图指标（如延迟）
   */
  histogram(
    name: string,
    value: number,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    try {
      let histogram = histogramCache.get(name);
      if (!histogram) {
        histogram = getMeter().createHistogram(name, {
          description: `Histogram for ${name}`,
          unit: 'ms',
        });
        histogramCache.set(name, histogram);
      }
      histogram.record(value, attributes);
    } catch (error) {
      logger.error(`Failed to record histogram ${name}`, { error });
    }
  },

  /**
   * 增加计数器指标
   */
  increment(
    name: string,
    value: number = 1,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    try {
      let counter = counterCache.get(name);
      if (!counter) {
        counter = getMeter().createCounter(name, {
          description: `Counter for ${name}`,
        });
        counterCache.set(name, counter);
      }
      counter.add(value, attributes);
    } catch (error) {
      logger.error(`Failed to increment counter ${name}`, { error });
    }
  },

  /**
   * 记录价格获取指标
   */
  recordPriceFetch(protocol: string, symbol: string, duration: number, success: boolean): void {
    this.histogram('oracle.price_fetch.duration', duration, {
      protocol,
      symbol,
      success: String(success),
    });
    this.increment('oracle.price_fetch.total', 1, {
      protocol,
      symbol,
      success: String(success),
    });
  },

  /**
   * 记录区块链调用指标
   */
  recordBlockchainCall(chain: string, method: string, duration: number, success: boolean): void {
    this.histogram('blockchain.call.duration', duration, {
      chain,
      method,
      success: String(success),
    });
    this.increment('blockchain.call.total', 1, {
      chain,
      method,
      success: String(success),
    });
  },

  /**
   * 记录缓存操作指标
   */
  recordCacheOperation(operation: 'get' | 'set' | 'delete', hit: boolean): void {
    this.increment('cache.operation.total', 1, {
      operation,
      hit: String(hit),
    });
  },

  /**
   * 记录 WebSocket 连接指标
   */
  recordWebSocketConnection(event: 'connect' | 'disconnect' | 'error'): void {
    this.increment('websocket.connection', 1, { event });
  },

  /**
   * 记录消息队列指标
   */
  recordMessageQueue(operation: 'publish' | 'consume', queue: string, success: boolean): void {
    this.increment('message_queue.operation', 1, {
      operation,
      queue,
      success: String(success),
    });
  },
};

// ============================================================================
// 性能追踪装饰器
// ============================================================================

export function trackPerformance(
  metricName: string,
  attributes?: Record<string, string | number | boolean>,
) {
  return function <T extends (...args: unknown[]) => unknown>(
    _target: object,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as T;
    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const startTime = performance.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - startTime;
        metrics.histogram(metricName, duration, { ...attributes, success: 'true' });
        metrics.increment(`${metricName}.total`, 1, { ...attributes, success: 'true' });
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        metrics.histogram(metricName, duration, { ...attributes, success: 'false' });
        metrics.increment(`${metricName}.total`, 1, { ...attributes, success: 'false' });
        throw error;
      }
    };

    return descriptor;
  };
}

// ============================================================================
// 内存指标收集（用于开发环境）
// ============================================================================

export function startMemoryMetrics(intervalMs: number = 60000): () => void {
  const interval = setInterval(() => {
    const memUsage = process.memoryUsage();
    metrics.histogram('system.memory.heap_used', memUsage.heapUsed / 1024 / 1024);
    metrics.histogram('system.memory.heap_total', memUsage.heapTotal / 1024 / 1024);
    metrics.histogram('system.memory.rss', memUsage.rss / 1024 / 1024);
  }, intervalMs);

  return () => clearInterval(interval);
}
