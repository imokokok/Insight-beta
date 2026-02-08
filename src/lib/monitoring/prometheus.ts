/**
 * Prometheus Metrics Exporter - Prometheus 指标导出器
 *
 * 提供 Prometheus 格式的指标导出：
 * - HTTP 端点 /metrics
 * - 自定义业务指标
 * - 系统性能指标
 * - 应用健康指标
 */

import { logger } from '@/lib/logger';

// ============================================================================
// 类型定义
// ============================================================================

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

export interface MetricValue {
  value: number;
  labels: Record<string, string>;
  timestamp?: number;
}

export interface MetricDefinition {
  name: string;
  type: MetricType;
  help: string;
  labelNames: string[];
  values: Map<string, MetricValue>;
  // histogram 特有
  buckets?: number[];
  // summary 特有
  percentiles?: number[];
}

export interface PrometheusConfig {
  /** 指标前缀 */
  prefix: string;
  /** 默认标签 */
  defaultLabels: Record<string, string>;
  /** 是否包含进程指标 */
  includeProcessMetrics: boolean;
  /** 是否包含 Node.js 指标 */
  includeNodeMetrics: boolean;
}

// ============================================================================
// Prometheus 注册表
// ============================================================================

class PrometheusRegistry {
  private metrics: Map<string, MetricDefinition> = new Map();
  private config: PrometheusConfig;

  constructor(config: Partial<PrometheusConfig> = {}) {
    this.config = {
      prefix: config.prefix ?? 'oracle_',
      defaultLabels: config.defaultLabels ?? {},
      includeProcessMetrics: config.includeProcessMetrics ?? true,
      includeNodeMetrics: config.includeNodeMetrics ?? true,
    };

    // 注册默认指标
    this.registerDefaultMetrics();
  }

  /**
   * 注册指标
   */
  register(definition: Omit<MetricDefinition, 'values'>): void {
    const fullName = `${this.config.prefix}${definition.name}`;

    if (this.metrics.has(fullName)) {
      logger.warn('Metric already registered', { name: fullName });
      return;
    }

    this.metrics.set(fullName, {
      ...definition,
      name: fullName,
      values: new Map(),
    });

    logger.debug('Metric registered', { name: fullName, type: definition.type });
  }

  /**
   * 获取或创建指标
   */
  private getMetric(name: string): MetricDefinition | undefined {
    return this.metrics.get(name);
  }

  /**
   * 设置指标值（gauge）
   */
  set(name: string, value: number, labels: Record<string, string> = {}): void {
    const metric = this.getMetric(`${this.config.prefix}${name}`);
    if (!metric || metric.type !== 'gauge') {
      logger.error('Gauge metric not found', { name });
      return;
    }

    const labelKey = this.serializeLabels({ ...this.config.defaultLabels, ...labels });
    metric.values.set(labelKey, {
      value,
      labels: { ...this.config.defaultLabels, ...labels },
      timestamp: Date.now(),
    });
  }

  /**
   * 增加计数器（counter）
   */
  inc(name: string, value: number = 1, labels: Record<string, string> = {}): void {
    const metric = this.getMetric(`${this.config.prefix}${name}`);
    if (!metric || metric.type !== 'counter') {
      logger.error('Counter metric not found', { name });
      return;
    }

    const labelKey = this.serializeLabels({ ...this.config.defaultLabels, ...labels });
    const existing = metric.values.get(labelKey);

    metric.values.set(labelKey, {
      value: (existing?.value ?? 0) + value,
      labels: { ...this.config.defaultLabels, ...labels },
      timestamp: Date.now(),
    });
  }

  /**
   * 观察直方图（histogram）
   */
  observe(name: string, value: number, labels: Record<string, string> = {}): void {
    const metric = this.getMetric(`${this.config.prefix}${name}`);
    if (!metric || metric.type !== 'histogram') {
      logger.error('Histogram metric not found', { name });
      return;
    }

    const labelKey = this.serializeLabels({ ...this.config.defaultLabels, ...labels });
    const existing = metric.values.get(labelKey);

    if (existing) {
      // 更新现有值（这里简化处理，实际应该维护 bucket 计数）
      existing.value = value;
      existing.timestamp = Date.now();
    } else {
      metric.values.set(labelKey, {
        value,
        labels: { ...this.config.defaultLabels, ...labels },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 序列化标签
   */
  private serializeLabels(labels: Record<string, string>): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }

  /**
   * 导出 Prometheus 格式
   */
  export(): string {
    const lines: string[] = [];

    // 添加默认标签注释
    if (Object.keys(this.config.defaultLabels).length > 0) {
      lines.push(`# Default labels: ${this.serializeLabels(this.config.defaultLabels)}`);
      lines.push('');
    }

    for (const [name, metric] of this.metrics) {
      // HELP 行
      lines.push(`# HELP ${name} ${metric.help}`);
      // TYPE 行
      lines.push(`# TYPE ${name} ${metric.type}`);

      // 指标值
      for (const [labelKey, value] of metric.values) {
        if (labelKey) {
          lines.push(`${name}{${labelKey}} ${value.value}`);
        } else {
          lines.push(`${name} ${value.value}`);
        }
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 注册默认指标
   */
  private registerDefaultMetrics(): void {
    if (this.config.includeProcessMetrics) {
      // 进程指标
      this.register({
        name: 'process_cpu_user_seconds_total',
        type: 'counter',
        help: 'Total user CPU time spent in seconds',
        labelNames: [],
      });

      this.register({
        name: 'process_cpu_system_seconds_total',
        type: 'counter',
        help: 'Total system CPU time spent in seconds',
        labelNames: [],
      });

      this.register({
        name: 'process_resident_memory_bytes',
        type: 'gauge',
        help: 'Resident memory size in bytes',
        labelNames: [],
      });

      this.register({
        name: 'process_heap_bytes',
        type: 'gauge',
        help: 'Process heap size in bytes',
        labelNames: [],
      });
    }

    if (this.config.includeNodeMetrics) {
      // Node.js 事件循环
      this.register({
        name: 'nodejs_eventloop_lag_seconds',
        type: 'gauge',
        help: 'Lag of event loop in seconds',
        labelNames: [],
      });

      this.register({
        name: 'nodejs_active_handles',
        type: 'gauge',
        help: 'Number of active handles',
        labelNames: [],
      });

      this.register({
        name: 'nodejs_active_requests',
        type: 'gauge',
        help: 'Number of active requests',
        labelNames: [],
      });
    }

    // 业务指标
    this.register({
      name: 'price_fetch_duration_seconds',
      type: 'histogram',
      help: 'Price fetch duration in seconds',
      labelNames: ['protocol', 'symbol', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    });

    this.register({
      name: 'price_fetch_total',
      type: 'counter',
      help: 'Total number of price fetches',
      labelNames: ['protocol', 'symbol', 'status'],
    });

    this.register({
      name: 'websocket_connections',
      type: 'gauge',
      help: 'Current number of WebSocket connections',
      labelNames: ['status'],
    });

    this.register({
      name: 'blockchain_call_duration_seconds',
      type: 'histogram',
      help: 'Blockchain call duration in seconds',
      labelNames: ['chain', 'method', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    });

    this.register({
      name: 'cache_hit_ratio',
      type: 'gauge',
      help: 'Cache hit ratio',
      labelNames: ['cache_type'],
    });

    this.register({
      name: 'service_health',
      type: 'gauge',
      help: 'Service health status (1 = healthy, 0 = unhealthy)',
      labelNames: ['service', 'instance'],
    });
  }

  /**
   * 更新系统指标
   */
  updateSystemMetrics(): void {
    if (!this.config.includeProcessMetrics) return;

    const memUsage = process.memoryUsage();
    this.set('process_resident_memory_bytes', memUsage.rss);
    this.set('process_heap_bytes', memUsage.heapUsed);
  }

  /**
   * 获取所有指标名称
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * 清理所有指标
   */
  clear(): void {
    this.metrics.clear();
    this.registerDefaultMetrics();
  }
}

// ============================================================================
// 单例导出
// ============================================================================

export { PrometheusRegistry };
export const prometheusRegistry = new PrometheusRegistry();

// ============================================================================
// 便捷函数
// ============================================================================

export function registerMetric(definition: Omit<MetricDefinition, 'values'>): void {
  prometheusRegistry.register(definition);
}

export function setGauge(name: string, value: number, labels?: Record<string, string>): void {
  prometheusRegistry.set(name, value, labels);
}

export function incCounter(name: string, value?: number, labels?: Record<string, string>): void {
  prometheusRegistry.inc(name, value, labels);
}

export function observeHistogram(
  name: string,
  value: number,
  labels?: Record<string, string>,
): void {
  prometheusRegistry.observe(name, value, labels);
}

export function exportMetrics(): string {
  return prometheusRegistry.export();
}

export function updateSystemMetrics(): void {
  prometheusRegistry.updateSystemMetrics();
}

// ============================================================================
// 性能追踪装饰器（Prometheus 版本）
// ============================================================================

export function trackPrometheusMetric(metricName: string, labels?: Record<string, string>) {
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
        const duration = (performance.now() - startTime) / 1000; // 转换为秒

        observeHistogram(`${metricName}_duration_seconds`, duration, {
          ...labels,
          status: 'success',
        });
        incCounter(`${metricName}_total`, 1, {
          ...labels,
          status: 'success',
        });

        return result;
      } catch (error) {
        const duration = (performance.now() - startTime) / 1000;

        observeHistogram(`${metricName}_duration_seconds`, duration, {
          ...labels,
          status: 'error',
        });
        incCounter(`${metricName}_total`, 1, {
          ...labels,
          status: 'error',
        });

        throw error;
      }
    };

    return descriptor;
  };
}

// ============================================================================
// HTTP 处理器（用于 Next.js API 路由）
// ============================================================================

export async function prometheusHandler(): Promise<Response> {
  // 更新系统指标
  updateSystemMetrics();

  const metrics = exportMetrics();

  return new Response(metrics, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
