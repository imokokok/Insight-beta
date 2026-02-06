/**
 * Performance Monitor - 性能监控器
 *
 * 提供 API 延迟、缓存命中率、预言机响应时间等指标的收集和上报
 */

import { logger } from '@/lib/logger';

// ============================================================================
// 类型定义
// ============================================================================

export interface MetricValue {
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface HistogramMetric {
  count: number;
  sum: number;
  min: number;
  max: number;
  buckets: Map<number, number>;
}

export interface PerformanceMetrics {
  // API 指标
  apiLatency: Map<string, HistogramMetric>;
  apiRequests: Map<string, { count: number; errors: number }>;

  // 缓存指标
  cacheHits: Map<string, number>;
  cacheMisses: Map<string, number>;

  // 预言机指标
  oracleLatency: Map<string, HistogramMetric>;
  oracleRequests: Map<string, { count: number; errors: number }>;

  // WebSocket 指标
  wsConnections: number;
  wsMessages: { sent: number; received: number };

  // 系统指标
  memoryUsage: NodeJS.MemoryUsage | null;
  uptime: number;
}

export interface MetricReport {
  timestamp: string;
  metrics: PerformanceMetrics;
  summary: {
    totalApiRequests: number;
    totalApiErrors: number;
    avgApiLatency: number;
    cacheHitRate: number;
    totalOracleRequests: number;
    totalOracleErrors: number;
    avgOracleLatency: number;
  };
}

// ============================================================================
// 性能监控器
// ============================================================================

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private startTime: number;
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly defaultBuckets = [10, 50, 100, 200, 500, 1000, 2000, 5000, 10000];

  constructor() {
    this.startTime = Date.now();
    this.metrics = {
      apiLatency: new Map(),
      apiRequests: new Map(),
      cacheHits: new Map(),
      cacheMisses: new Map(),
      oracleLatency: new Map(),
      oracleRequests: new Map(),
      wsConnections: 0,
      wsMessages: { sent: 0, received: 0 },
      memoryUsage: null,
      uptime: 0,
    };

    this.startSystemMetricsCollection();
  }

  // ============================================================================
  // API 指标
  // ============================================================================

  /**
   * 记录 API 请求延迟
   */
  recordApiLatency(route: string, durationMs: number, tags?: Record<string, string>): void {
    this.recordHistogram(this.metrics.apiLatency, route, durationMs, tags);
  }

  /**
   * 记录 API 请求
   */
  recordApiRequest(route: string, success: boolean): void {
    const current = this.metrics.apiRequests.get(route) ?? { count: 0, errors: 0 };
    current.count++;
    if (!success) {
      current.errors++;
    }
    this.metrics.apiRequests.set(route, current);
  }

  // ============================================================================
  // 缓存指标
  // ============================================================================

  /**
   * 记录缓存命中
   */
  recordCacheHit(cacheName: string): void {
    const current = this.metrics.cacheHits.get(cacheName) ?? 0;
    this.metrics.cacheHits.set(cacheName, current + 1);
  }

  /**
   * 记录缓存未命中
   */
  recordCacheMiss(cacheName: string): void {
    const current = this.metrics.cacheMisses.get(cacheName) ?? 0;
    this.metrics.cacheMisses.set(cacheName, current + 1);
  }

  /**
   * 获取缓存命中率
   */
  getCacheHitRate(cacheName: string): number {
    const hits = this.metrics.cacheHits.get(cacheName) ?? 0;
    const misses = this.metrics.cacheMisses.get(cacheName) ?? 0;
    const total = hits + misses;
    return total > 0 ? hits / total : 0;
  }

  // ============================================================================
  // 预言机指标
  // ============================================================================

  /**
   * 记录预言机请求延迟
   */
  recordOracleLatency(protocol: string, durationMs: number, tags?: Record<string, string>): void {
    this.recordHistogram(this.metrics.oracleLatency, protocol, durationMs, tags);
  }

  /**
   * 记录预言机请求
   */
  recordOracleRequest(protocol: string, success: boolean): void {
    const current = this.metrics.oracleRequests.get(protocol) ?? { count: 0, errors: 0 };
    current.count++;
    if (!success) {
      current.errors++;
    }
    this.metrics.oracleRequests.set(protocol, current);
  }

  // ============================================================================
  // WebSocket 指标
  // ============================================================================

  /**
   * 更新 WebSocket 连接数
   */
  updateWsConnections(count: number): void {
    this.metrics.wsConnections = count;
  }

  /**
   * 记录 WebSocket 消息
   */
  recordWsMessage(type: 'sent' | 'received'): void {
    if (type === 'sent') {
      this.metrics.wsMessages.sent++;
    } else {
      this.metrics.wsMessages.received++;
    }
  }

  // ============================================================================
  // 系统指标
  // ============================================================================

  private startSystemMetricsCollection(): void {
    // 每 30 秒收集一次系统指标
    setInterval(() => {
      this.metrics.memoryUsage = process.memoryUsage();
      this.metrics.uptime = Date.now() - this.startTime;
    }, 30000);
  }

  // ============================================================================
  // 直方图辅助方法
  // ============================================================================

  private recordHistogram(
    map: Map<string, HistogramMetric>,
    key: string,
    value: number,
    tags?: Record<string, string>,
  ): void {
    const tagKey = tags ? `${key}:${JSON.stringify(tags)}` : key;
    let metric = map.get(tagKey);

    if (!metric) {
      metric = {
        count: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity,
        buckets: new Map(),
      };
      map.set(tagKey, metric);
    }

    metric.count++;
    metric.sum += value;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);

    // 记录到桶
    for (const bucket of this.defaultBuckets) {
      if (value <= bucket) {
        const current = metric.buckets.get(bucket) ?? 0;
        metric.buckets.set(bucket, current + 1);
      }
    }
  }

  private calculateHistogramAverage(metric: HistogramMetric): number {
    return metric.count > 0 ? metric.sum / metric.count : 0;
  }

  private calculateHistogramPercentile(metric: HistogramMetric, percentile: number): number {
    if (metric.count === 0) return 0;

    const target = Math.ceil((percentile / 100) * metric.count);
    let count = 0;

    for (const bucket of this.defaultBuckets) {
      count += metric.buckets.get(bucket) ?? 0;
      if (count >= target) {
        return bucket;
      }
    }

    return metric.max;
  }

  // ============================================================================
  // 报告生成
  // ============================================================================

  /**
   * 生成性能报告
   */
  generateReport(): MetricReport {
    // 计算 API 汇总
    let totalApiRequests = 0;
    let totalApiErrors = 0;
    let totalApiLatency = 0;
    let apiLatencyCount = 0;

    for (const [, stats] of this.metrics.apiRequests) {
      totalApiRequests += stats.count;
      totalApiErrors += stats.errors;
    }

    for (const metric of Array.from(this.metrics.apiLatency.values())) {
      totalApiLatency += metric.sum;
      apiLatencyCount += metric.count;
    }

    // 计算缓存命中率
    let totalCacheHits = 0;
    let totalCacheMisses = 0;
    for (const hits of Array.from(this.metrics.cacheHits.values())) {
      totalCacheHits += hits;
    }
    for (const misses of Array.from(this.metrics.cacheMisses.values())) {
      totalCacheMisses += misses;
    }
    const cacheHitRate =
      totalCacheHits + totalCacheMisses > 0
        ? totalCacheHits / (totalCacheHits + totalCacheMisses)
        : 0;

    // 计算预言机汇总
    let totalOracleRequests = 0;
    let totalOracleErrors = 0;
    let totalOracleLatency = 0;
    let oracleLatencyCount = 0;

    for (const [, stats] of this.metrics.oracleRequests) {
      totalOracleRequests += stats.count;
      totalOracleErrors += stats.errors;
    }

    for (const metric of Array.from(this.metrics.oracleLatency.values())) {
      totalOracleLatency += metric.sum;
      oracleLatencyCount += metric.count;
    }

    return {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      summary: {
        totalApiRequests,
        totalApiErrors,
        avgApiLatency: apiLatencyCount > 0 ? totalApiLatency / apiLatencyCount : 0,
        cacheHitRate,
        totalOracleRequests,
        totalOracleErrors,
        avgOracleLatency: oracleLatencyCount > 0 ? totalOracleLatency / oracleLatencyCount : 0,
      },
    };
  }

  /**
   * 获取 API 延迟统计
   */
  getApiLatencyStats(route?: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    if (route) {
      const metric = this.metrics.apiLatency.get(route);
      if (!metric) return null;
      return {
        count: metric.count,
        avg: this.calculateHistogramAverage(metric),
        min: metric.min === Infinity ? 0 : metric.min,
        max: metric.max === -Infinity ? 0 : metric.max,
        p50: this.calculateHistogramPercentile(metric, 50),
        p95: this.calculateHistogramPercentile(metric, 95),
        p99: this.calculateHistogramPercentile(metric, 99),
      };
    }

    // 汇总所有路由
    let totalCount = 0;
    let totalSum = 0;
    let min = Infinity;
    let max = -Infinity;

    for (const metric of Array.from(this.metrics.apiLatency.values())) {
      totalCount += metric.count;
      totalSum += metric.sum;
      min = Math.min(min, metric.min);
      max = Math.max(max, metric.max);
    }

    if (totalCount === 0) return null;

    return {
      count: totalCount,
      avg: totalSum / totalCount,
      min: min === Infinity ? 0 : min,
      max: max === -Infinity ? 0 : max,
      p50: 0, // 需要重新计算
      p95: 0,
      p99: 0,
    };
  }

  // ============================================================================
  // 自动上报
  // ============================================================================

  /**
   * 启动自动上报
   */
  startAutoFlush(intervalMs: number = 60000, callback?: (report: MetricReport) => void): void {
    this.stopAutoFlush();

    this.flushInterval = setInterval(() => {
      const report = this.generateReport();

      // 日志输出
      logger.info('Performance metrics', {
        summary: report.summary,
        memoryUsage: report.metrics.memoryUsage,
      });

      // 回调处理
      callback?.(report);
    }, intervalMs);
  }

  /**
   * 停止自动上报
   */
  stopAutoFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  // ============================================================================
  // 重置
  // ============================================================================

  /**
   * 重置所有指标
   */
  reset(): void {
    this.metrics.apiLatency.clear();
    this.metrics.apiRequests.clear();
    this.metrics.cacheHits.clear();
    this.metrics.cacheMisses.clear();
    this.metrics.oracleLatency.clear();
    this.metrics.oracleRequests.clear();
    this.metrics.wsConnections = 0;
    this.metrics.wsMessages = { sent: 0, received: 0 };
    this.startTime = Date.now();
  }
}

// ============================================================================
// 单例导出
// ============================================================================

export const performanceMonitor = new PerformanceMonitor();
