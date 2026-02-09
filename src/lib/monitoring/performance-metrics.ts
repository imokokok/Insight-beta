/**
 * Performance Metrics
 * P3 优化：添加性能监控指标
 */

import { logger } from '@/lib/logger';

// 性能指标类型
interface MetricValue {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

// 指标存储
class MetricsStore {
  private counters = new Map<string, number>();
  private gauges = new Map<string, MetricValue>();
  private histograms = new Map<string, number[]>();
  private timers = new Map<string, number[]>();

  // 计数器：单调递增的值
  increment(name: string, value: number = 1, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  // 仪表盘：可增可减的值
  gauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    this.gauges.set(key, { value, timestamp: Date.now(), labels });
  }

  // 直方图：分布统计
  histogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    // 只保留最近 1000 个值
    if (values.length > 1000) {
      values.shift();
    }
    this.histograms.set(key, values);
  }

  // 计时器：记录耗时
  timer(name: string, durationMs: number, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    const values = this.timers.get(key) || [];
    values.push(durationMs);
    // 只保留最近 1000 个值
    if (values.length > 1000) {
      values.shift();
    }
    this.timers.set(key, values);
  }

  // 获取指标键
  private getKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name;
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  // 获取计数器值
  getCounter(name: string, labels?: Record<string, string>): number {
    return this.counters.get(this.getKey(name, labels)) || 0;
  }

  // 获取仪表盘值
  getGauge(name: string, labels?: Record<string, string>): number | null {
    const value = this.gauges.get(this.getKey(name, labels));
    return value?.value ?? null;
  }

  // 获取直方图统计
  getHistogramStats(
    name: string,
    labels?: Record<string, string>,
  ): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const values = this.histograms.get(this.getKey(name, labels));
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const min = sorted[0] ?? 0;
    const max = sorted[count - 1] ?? 0;
    const avg = sorted.reduce((a, b) => a + b, 0) / count;
    const p50 = sorted[Math.floor(count * 0.5)] ?? 0;
    const p95 = sorted[Math.floor(count * 0.95)] ?? 0;
    const p99 = sorted[Math.floor(count * 0.99)] ?? 0;

    return { count, min, max, avg, p50, p95, p99 };
  }

  // 获取计时器统计
  getTimerStats(
    name: string,
    labels?: Record<string, string>,
  ): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const values = this.timers.get(this.getKey(name, labels));
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const min = sorted[0] ?? 0;
    const max = sorted[count - 1] ?? 0;
    const avg = sorted.reduce((a, b) => a + b, 0) / count;
    const p50 = sorted[Math.floor(count * 0.5)] ?? 0;
    const p95 = sorted[Math.floor(count * 0.95)] ?? 0;
    const p99 = sorted[Math.floor(count * 0.99)] ?? 0;

    return { count, min, max, avg, p50, p95, p99 };
  }

  // 获取所有指标
  getAllMetrics(): {
    counters: Record<string, number>;
    gauges: Record<string, MetricValue>;
    histograms: Record<string, ReturnType<MetricsStore['getHistogramStats']>>;
    timers: Record<string, ReturnType<MetricsStore['getTimerStats']>>;
  } {
    const histograms: Record<string, ReturnType<MetricsStore['getHistogramStats']>> = {};
    const timers: Record<string, ReturnType<MetricsStore['getTimerStats']>> = {};

    for (const key of this.histograms.keys()) {
      histograms[key] = this.getHistogramStats(key);
    }

    for (const key of this.timers.keys()) {
      timers[key] = this.getTimerStats(key);
    }

    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms,
      timers,
    };
  }

  // 重置所有指标
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.timers.clear();
  }
}

// 全局指标存储
const metricsStore = new MetricsStore();

// 性能监控类
export class PerformanceMonitor {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  // 记录缓存命中
  recordCacheHit(cacheType: string): void {
    metricsStore.increment('cache_hit_total', 1, { cache_type: cacheType, monitor: this.name });
  }

  // 记录缓存未命中
  recordCacheMiss(cacheType: string): void {
    metricsStore.increment('cache_miss_total', 1, { cache_type: cacheType, monitor: this.name });
  }

  // 记录聚合耗时
  recordAggregationDuration(durationMs: number, symbolCount: number): void {
    metricsStore.timer('aggregation_duration_ms', durationMs, { monitor: this.name });
    metricsStore.gauge('aggregation_symbol_count', symbolCount, { monitor: this.name });
  }

  // 记录 RPC 调用
  recordRpcCall(durationMs: number, method: string, success: boolean): void {
    metricsStore.timer('rpc_call_duration_ms', durationMs, {
      method,
      success: success.toString(),
      monitor: this.name,
    });
    metricsStore.increment('rpc_call_total', 1, {
      method,
      success: success.toString(),
      monitor: this.name,
    });
  }

  // 记录数据库查询
  recordDbQuery(durationMs: number, queryType: string): void {
    metricsStore.timer('db_query_duration_ms', durationMs, {
      query_type: queryType,
      monitor: this.name,
    });
    metricsStore.increment('db_query_total', 1, {
      query_type: queryType,
      monitor: this.name,
    });
  }

  // 记录 WebSocket 消息
  recordWebSocketMessage(messageType: string): void {
    metricsStore.increment('websocket_message_total', 1, {
      message_type: messageType,
      monitor: this.name,
    });
  }

  // 记录价格更新
  recordPriceUpdate(symbol: string, source: string): void {
    metricsStore.increment('price_update_total', 1, {
      symbol,
      source,
      monitor: this.name,
    });
  }

  // 记录批量处理
  recordBatchProcessing(batchSize: number, durationMs: number): void {
    metricsStore.histogram('batch_size', batchSize, { monitor: this.name });
    metricsStore.timer('batch_processing_duration_ms', durationMs, { monitor: this.name });
  }
}

// 计时器装饰器
export function timed(metricName: string, labels?: Record<string, string>) {
  return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const start = performance.now();
      try {
        return await originalMethod.apply(this, args);
      } finally {
        const duration = performance.now() - start;
        metricsStore.timer(metricName, duration, labels);
      }
    };

    return descriptor;
  };
}

// 导出便捷函数
export const metrics = {
  // 计数器
  increment: (name: string, value?: number, labels?: Record<string, string>) =>
    metricsStore.increment(name, value, labels),

  // 仪表盘
  gauge: (name: string, value: number, labels?: Record<string, string>) =>
    metricsStore.gauge(name, value, labels),

  // 直方图
  histogram: (name: string, value: number, labels?: Record<string, string>) =>
    metricsStore.histogram(name, value, labels),

  // 计时器
  timer: (name: string, value: number, labels?: Record<string, string>) =>
    metricsStore.timer(name, value, labels),

  // 获取指标
  getAll: () => metricsStore.getAllMetrics(),

  // 重置
  reset: () => metricsStore.reset(),
};

// 导出监控实例创建函数
export function createPerformanceMonitor(name: string): PerformanceMonitor {
  return new PerformanceMonitor(name);
}

// 定期输出指标到日志
if (typeof window === 'undefined') {
  // 只在服务端执行
  setInterval(() => {
    const allMetrics = metricsStore.getAllMetrics();
    logger.debug('Performance metrics', { metrics: allMetrics });
  }, 60000); // 每分钟输出一次
}
