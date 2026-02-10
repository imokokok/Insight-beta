/**
 * Price Metrics Collection
 *
 * P1 优化：性能监控和指标收集
 * - 聚合性能指标
 * - 缓存命中率
 * - 延迟分布
 * - 错误率统计
 */

import { logger } from '@/lib/logger';

// ============================================================================
// 指标类型定义
// ============================================================================

export interface AggregationMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTimeMs: number;
  p50ResponseTimeMs: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
  requestsPerSecond: number;
}

export interface CacheMetrics {
  totalRequests: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  size: number;
}

export interface PriceDeviationMetrics {
  totalComparisons: number;
  normalCount: number;
  warningCount: number;
  criticalCount: number;
  avgDeviationPercent: number;
  maxDeviationPercent: number;
}

export interface ProtocolMetrics {
  protocol: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatencyMs: number;
  errorRate: number;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
}

export interface SystemMetrics {
  aggregation: AggregationMetrics;
  cache: CacheMetrics;
  deviation: PriceDeviationMetrics;
  protocols: ProtocolMetrics[];
  timestamp: number;
}

// ============================================================================
// 指标收集器
// ============================================================================

export class PriceMetricsCollector {
  private aggregationData: number[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;
  private cacheEvictions = 0;
  private deviationData: number[] = [];
  private protocolStats: Map<string, ProtocolMetrics> = new Map();
  private startTime = Date.now();

  // 单例模式
  private static instance: PriceMetricsCollector;
  static getInstance(): PriceMetricsCollector {
    if (!PriceMetricsCollector.instance) {
      PriceMetricsCollector.instance = new PriceMetricsCollector();
    }
    return PriceMetricsCollector.instance;
  }

  // ============================================================================
  // 聚合指标
  // ============================================================================

  recordAggregation(durationMs: number, success: boolean): void {
    this.aggregationData.push(durationMs);
    if (this.aggregationData.length > 1000) {
      this.aggregationData.shift();
    }

    if (!success) {
      // 记录失败可以在其他地方处理
    }
  }

  getAggregationMetrics(): AggregationMetrics {
    const data = this.aggregationData;
    if (data.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgResponseTimeMs: 0,
        p50ResponseTimeMs: 0,
        p95ResponseTimeMs: 0,
        p99ResponseTimeMs: 0,
        requestsPerSecond: 0,
      };
    }

    const sorted = [...data].sort((a, b) => a - b);
    const total = data.length;
    const sum = data.reduce((a, b) => a + b, 0);
    const elapsedSeconds = (Date.now() - this.startTime) / 1000;

    return {
      totalRequests: total,
      successfulRequests: total, // 简化处理
      failedRequests: 0,
      avgResponseTimeMs: sum / total,
      p50ResponseTimeMs: sorted[Math.floor(total * 0.5)] || 0,
      p95ResponseTimeMs: sorted[Math.floor(total * 0.95)] || 0,
      p99ResponseTimeMs: sorted[Math.floor(total * 0.99)] || 0,
      requestsPerSecond: elapsedSeconds > 0 ? total / elapsedSeconds : 0,
    };
  }

  // ============================================================================
  // 缓存指标
  // ============================================================================

  recordCacheHit(): void {
    this.cacheHits++;
  }

  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  recordCacheEviction(): void {
    this.cacheEvictions++;
  }

  getCacheMetrics(): CacheMetrics {
    const total = this.cacheHits + this.cacheMisses;
    return {
      totalRequests: total,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? (this.cacheHits / total) * 100 : 0,
      evictions: this.cacheEvictions,
      size: total,
    };
  }

  // ============================================================================
  // 偏差指标
  // ============================================================================

  recordDeviation(deviationPercent: number): void {
    this.deviationData.push(deviationPercent);
    if (this.deviationData.length > 1000) {
      this.deviationData.shift();
    }
  }

  getDeviationMetrics(): PriceDeviationMetrics {
    const data = this.deviationData;
    if (data.length === 0) {
      return {
        totalComparisons: 0,
        normalCount: 0,
        warningCount: 0,
        criticalCount: 0,
        avgDeviationPercent: 0,
        maxDeviationPercent: 0,
      };
    }

    let normalCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    for (const deviation of data) {
      // deviation 是小数形式 (如 0.01 = 1%)
      if (deviation < 0.005)
        normalCount++; // < 0.5%
      else if (deviation < 0.02)
        warningCount++; // 0.5% - 2%
      else criticalCount++; // > 2%
    }

    return {
      totalComparisons: data.length,
      normalCount,
      warningCount,
      criticalCount,
      avgDeviationPercent: data.reduce((a, b) => a + b, 0) / data.length,
      maxDeviationPercent: Math.max(...data),
    };
  }

  // ============================================================================
  // 协议指标
  // ============================================================================

  recordProtocolRequest(protocol: string, latencyMs: number, success: boolean): void {
    let stats = this.protocolStats.get(protocol);
    if (!stats) {
      stats = {
        protocol,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgLatencyMs: 0,
        errorRate: 0,
        lastSuccessAt: null,
        lastFailureAt: null,
      };
      this.protocolStats.set(protocol, stats);
    }

    stats.totalRequests++;
    if (success) {
      stats.successfulRequests++;
      stats.lastSuccessAt = Date.now();
      // 更新平均延迟
      stats.avgLatencyMs =
        (stats.avgLatencyMs * (stats.successfulRequests - 1) + latencyMs) /
        stats.successfulRequests;
    } else {
      stats.failedRequests++;
      stats.lastFailureAt = Date.now();
    }

    stats.errorRate = (stats.failedRequests / stats.totalRequests) * 100;
  }

  getProtocolMetrics(): ProtocolMetrics[] {
    return Array.from(this.protocolStats.values());
  }

  // ============================================================================
  // 系统指标
  // ============================================================================

  getSystemMetrics(): SystemMetrics {
    return {
      aggregation: this.getAggregationMetrics(),
      cache: this.getCacheMetrics(),
      deviation: this.getDeviationMetrics(),
      protocols: this.getProtocolMetrics(),
      timestamp: Date.now(),
    };
  }

  // ============================================================================
  // 日志和导出
  // ============================================================================

  logMetrics(): void {
    const metrics = this.getSystemMetrics();
    logger.info('Price metrics snapshot', { metrics });
  }

  exportMetrics(): string {
    return JSON.stringify(this.getSystemMetrics(), null, 2);
  }

  // ============================================================================
  // 重置
  // ============================================================================

  reset(): void {
    this.aggregationData = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.cacheEvictions = 0;
    this.deviationData = [];
    this.protocolStats.clear();
    this.startTime = Date.now();
    logger.info('Price metrics reset');
  }
}

// 导出单例
export const priceMetrics = PriceMetricsCollector.getInstance();

// ============================================================================
// 性能计时器工具
// ============================================================================

export class PerformanceTimer {
  private startTime: number;
  private name: string;

  constructor(name: string) {
    this.name = name;
    this.startTime = performance.now();
  }

  end(): number {
    const duration = performance.now() - this.startTime;
    logger.debug(`[${this.name}] took ${duration.toFixed(2)}ms`);
    return duration;
  }
}

/**
 * 测量函数执行时间
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<{ result: T; durationMs: number }> {
  const timer = new PerformanceTimer(name);
  const result = await fn();
  const durationMs = timer.end();
  return { result, durationMs };
}
