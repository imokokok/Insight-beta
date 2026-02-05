/**
 * Performance Monitor Service
 *
 * Real-time performance metrics collection and monitoring
 * for Oracle Monitor platform
 */

import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface PerformanceMetrics {
  timestamp: number;
  responseTime: ResponseTimeMetrics;
  throughput: ThroughputMetrics;
  errors: ErrorMetrics;
  resources: ResourceMetrics;
  database: DatabaseMetrics;
  cache: CacheMetrics;
  network: NetworkMetrics;
}

export interface ResponseTimeMetrics {
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  min: number;
  count: number;
}

export interface ThroughputMetrics {
  requestsPerSecond: number;
  requestsPerMinute: number;
  bytesPerSecond: number;
  activeConnections: number;
}

export interface ErrorMetrics {
  total: number;
  rate: number;
  byType: Record<string, number>;
  byEndpoint: Record<string, number>;
}

export interface ResourceMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
}

export interface DatabaseMetrics {
  connections: {
    active: number;
    idle: number;
    max: number;
  };
  queryTime: {
    avg: number;
    p95: number;
    p99: number;
  };
  slowQueries: number;
  transactionsPerSecond: number;
}

export interface CacheMetrics {
  hitRate: number;
  misses: number;
  hits: number;
  evictions: number;
  size: number;
  keys: number;
}

export interface NetworkMetrics {
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  errors: number;
  dropped: number;
}

export interface AlertThreshold {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  duration: number;
  severity: 'warning' | 'critical';
}

export interface MetricHistory {
  timestamps: number[];
  values: number[];
}

// ============================================================================
// Performance Monitor Service
// ============================================================================

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private readonly maxHistorySize = 10080; // 7 days of 1-minute intervals
  private alertThresholds: AlertThreshold[] = [];
  private alertCallbacks: ((alert: {
    metric: string;
    value: number;
    threshold: number;
    severity: string;
  }) => void)[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  // Metric collectors
  private responseTimes: number[] = [];
  private errorCounts: Map<string, number> = new Map();
  private endpointErrors: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  start(collectionIntervalMs: number = 60000): void {
    if (this.isRunning) {
      logger.warn('Performance monitor already running');
      return;
    }

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, collectionIntervalMs);

    logger.info('Performance monitor started', { interval: collectionIntervalMs });
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;

    logger.info('Performance monitor stopped');
  }

  // ============================================================================
  // Metric Collection
  // ============================================================================

  private async collectMetrics(): Promise<void> {
    try {
      const metrics: PerformanceMetrics = {
        timestamp: Date.now(),
        responseTime: this.calculateResponseTimeMetrics(),
        throughput: await this.collectThroughputMetrics(),
        errors: this.calculateErrorMetrics(),
        resources: await this.collectResourceMetrics(),
        database: await this.collectDatabaseMetrics(),
        cache: this.collectCacheMetrics(),
        network: this.collectNetworkMetrics(),
      };

      this.metrics.push(metrics);

      // Trim history
      if (this.metrics.length > this.maxHistorySize) {
        this.metrics = this.metrics.slice(-this.maxHistorySize);
      }

      // Check thresholds
      this.checkThresholds(metrics);

      // Clear temporary data
      this.responseTimes = [];
      this.errorCounts.clear();
      this.endpointErrors.clear();

      logger.debug('Metrics collected', { timestamp: metrics.timestamp });
    } catch (error) {
      logger.error('Failed to collect metrics', { error });
    }
  }

  // ============================================================================
  // Response Time Tracking
  // ============================================================================

  recordResponseTime(durationMs: number): void {
    this.responseTimes.push(durationMs);
  }

  private calculateResponseTimeMetrics(): ResponseTimeMetrics {
    if (this.responseTimes.length === 0) {
      return {
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        max: 0,
        min: 0,
        count: 0,
      };
    }

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const count = sorted.length;

    return {
      avg: sum / count,
      p50: this.percentile(sorted, 0.5),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
      max: sorted[sorted.length - 1] ?? 0,
      min: sorted[0] ?? 0,
      count,
    };
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)] ?? 0;
  }

  // ============================================================================
  // Error Tracking
  // ============================================================================

  recordError(errorType: string, endpoint?: string): void {
    const current = this.errorCounts.get(errorType) ?? 0;
    this.errorCounts.set(errorType, current + 1);

    if (endpoint) {
      const endpointCurrent = this.endpointErrors.get(endpoint) ?? 0;
      this.endpointErrors.set(endpoint, endpointCurrent + 1);
    }
  }

  private calculateErrorMetrics(): ErrorMetrics {
    const total = Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0);
    const totalRequests = this.responseTimes.length + total;
    const rate = totalRequests > 0 ? (total / totalRequests) * 100 : 0;

    return {
      total,
      rate,
      byType: Object.fromEntries(this.errorCounts),
      byEndpoint: Object.fromEntries(this.endpointErrors),
    };
  }

  // ============================================================================
  // Throughput Metrics
  // ============================================================================

  private async collectThroughputMetrics(): Promise<ThroughputMetrics> {
    // In production, these would be collected from actual system metrics
    return {
      requestsPerSecond: this.responseTimes.length / 60, // Assuming 1-minute window
      requestsPerMinute: this.responseTimes.length,
      bytesPerSecond: 0, // Would be tracked separately
      activeConnections: 0, // Would be tracked separately
    };
  }

  // ============================================================================
  // Resource Metrics
  // ============================================================================

  private async collectResourceMetrics(): Promise<ResourceMetrics> {
    // In production, these would use system APIs
    const memoryUsage = process.memoryUsage();

    return {
      cpu: {
        usage: 0, // Would use os.loadavg() or similar
        loadAverage: [],
      },
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      },
      disk: {
        used: 0,
        total: 0,
        percentage: 0,
      },
    };
  }

  // ============================================================================
  // Database Metrics
  // ============================================================================

  private async collectDatabaseMetrics(): Promise<DatabaseMetrics> {
    // In production, these would be collected from database connection pool
    return {
      connections: {
        active: 0,
        idle: 0,
        max: 0,
      },
      queryTime: {
        avg: 0,
        p95: 0,
        p99: 0,
      },
      slowQueries: 0,
      transactionsPerSecond: 0,
    };
  }

  // ============================================================================
  // Cache Metrics
  // ============================================================================

  private collectCacheMetrics(): CacheMetrics {
    // In production, these would be collected from cache layer
    return {
      hitRate: 0,
      misses: 0,
      hits: 0,
      evictions: 0,
      size: 0,
      keys: 0,
    };
  }

  // ============================================================================
  // Network Metrics
  // ============================================================================

  private collectNetworkMetrics(): NetworkMetrics {
    // In production, these would be collected from network interfaces
    return {
      bytesIn: 0,
      bytesOut: 0,
      packetsIn: 0,
      packetsOut: 0,
      errors: 0,
      dropped: 0,
    };
  }

  // ============================================================================
  // Alert Thresholds
  // ============================================================================

  setAlertThresholds(thresholds: AlertThreshold[]): void {
    this.alertThresholds = thresholds;
    logger.info('Alert thresholds updated', { count: thresholds.length });
  }

  addAlertCallback(
    callback: (alert: {
      metric: string;
      value: number;
      threshold: number;
      severity: string;
    }) => void,
  ): void {
    this.alertCallbacks.push(callback);
  }

  private checkThresholds(metrics: PerformanceMetrics): void {
    for (const threshold of this.alertThresholds) {
      const value = this.getMetricValue(metrics, threshold.metric);
      if (value === undefined) continue;

      const triggered = this.evaluateThreshold(value, threshold);
      if (triggered) {
        this.triggerAlert(threshold, value);
      }
    }
  }

  private getMetricValue(metrics: PerformanceMetrics, path: string): number | undefined {
    const parts = path.split('.');
    let value: unknown = metrics;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return typeof value === 'number' ? value : undefined;
  }

  private evaluateThreshold(value: number, threshold: AlertThreshold): boolean {
    switch (threshold.operator) {
      case 'gt':
        return value > threshold.value;
      case 'lt':
        return value < threshold.value;
      case 'eq':
        return value === threshold.value;
      case 'gte':
        return value >= threshold.value;
      case 'lte':
        return value <= threshold.value;
      default:
        return false;
    }
  }

  private triggerAlert(threshold: AlertThreshold, value: number): void {
    const alert = {
      metric: threshold.metric,
      value,
      threshold: threshold.value,
      severity: threshold.severity,
    };

    for (const callback of this.alertCallbacks) {
      try {
        callback(alert);
      } catch (error) {
        logger.error('Alert callback failed', { error });
      }
    }

    logger.warn('Performance threshold exceeded', alert);
  }

  // ============================================================================
  // Data Retrieval
  // ============================================================================

  getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics[this.metrics.length - 1] ?? null;
  }

  getMetricsHistory(durationMs: number): PerformanceMetrics[] {
    const cutoff = Date.now() - durationMs;
    return this.metrics.filter((m) => m.timestamp >= cutoff);
  }

  getMetricTrend(metricPath: string, durationMs: number): MetricHistory {
    const history = this.getMetricsHistory(durationMs);
    const timestamps: number[] = [];
    const values: number[] = [];

    for (const metric of history) {
      const value = this.getMetricValue(metric, metricPath);
      if (value !== undefined) {
        timestamps.push(metric.timestamp);
        values.push(value);
      }
    }

    return { timestamps, values };
  }

  getStatistics(durationMs: number): {
    avgResponseTime: number;
    maxResponseTime: number;
    errorRate: number;
    totalRequests: number;
    availability: number;
  } {
    const history = this.getMetricsHistory(durationMs);

    if (history.length === 0) {
      return {
        avgResponseTime: 0,
        maxResponseTime: 0,
        errorRate: 0,
        totalRequests: 0,
        availability: 100,
      };
    }

    const totalRequests = history.reduce((sum, m) => sum + m.responseTime.count, 0);
    const totalErrors = history.reduce((sum, m) => sum + m.errors.total, 0);
    const avgResponseTime =
      history.reduce((sum, m) => sum + m.responseTime.avg, 0) / history.length;
    const maxResponseTime = Math.max(...history.map((m) => m.responseTime.max));
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    const availability = errorRate < 1 ? 99.99 : errorRate < 5 ? 99.9 : 99;

    return {
      avgResponseTime,
      maxResponseTime,
      errorRate,
      totalRequests,
      availability,
    };
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, { status: 'pass' | 'fail' | 'warn'; message: string }>;
  } {
    const latest = this.getLatestMetrics();
    const checks: Record<string, { status: 'pass' | 'fail' | 'warn'; message: string }> = {};

    if (!latest) {
      return {
        status: 'unhealthy',
        checks: { overall: { status: 'fail', message: 'No metrics available' } },
      };
    }

    // Response time check
    if (latest.responseTime.p95 > 5000) {
      checks.responseTime = { status: 'fail', message: 'P95 response time exceeds 5s' };
    } else if (latest.responseTime.p95 > 1000) {
      checks.responseTime = { status: 'warn', message: 'P95 response time exceeds 1s' };
    } else {
      checks.responseTime = { status: 'pass', message: 'Response time OK' };
    }

    // Error rate check
    if (latest.errors.rate > 5) {
      checks.errorRate = {
        status: 'fail',
        message: `Error rate ${latest.errors.rate.toFixed(2)}% exceeds 5%`,
      };
    } else if (latest.errors.rate > 1) {
      checks.errorRate = {
        status: 'warn',
        message: `Error rate ${latest.errors.rate.toFixed(2)}% exceeds 1%`,
      };
    } else {
      checks.errorRate = { status: 'pass', message: 'Error rate OK' };
    }

    // Memory check
    if (latest.resources.memory.percentage > 90) {
      checks.memory = { status: 'fail', message: 'Memory usage exceeds 90%' };
    } else if (latest.resources.memory.percentage > 70) {
      checks.memory = { status: 'warn', message: 'Memory usage exceeds 70%' };
    } else {
      checks.memory = { status: 'pass', message: 'Memory usage OK' };
    }

    // Determine overall status
    const hasFail = Object.values(checks).some((c) => c.status === 'fail');
    const hasWarn = Object.values(checks).some((c) => c.status === 'warn');
    const status = hasFail ? 'unhealthy' : hasWarn ? 'degraded' : 'healthy';

    return { status, checks };
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();
