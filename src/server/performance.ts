import type { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

const PERFORMANCE_THRESHOLDS = {
  slowRequestMs: 1000,
  verySlowRequestMs: 3000,
  maxCacheSize: 1000,
  maxMemoryCacheItems: 500,
};

interface PerformanceMetrics {
  requestId: string;
  method: string;
  pathname: string;
  durationMs: number;
  statusCode: number;
  cacheHit: boolean;
  memoryUsageMb: number;
  timestamp: string;
}

const requestMetrics: PerformanceMetrics[] = [];
const globalForMetrics = globalThis as unknown as {
  requestMetrics?: PerformanceMetrics[];
  requestIdCounter?: number;
};

const metrics = globalForMetrics.requestMetrics ?? requestMetrics;
if (process.env.NODE_ENV !== 'production') globalForMetrics.requestMetrics = metrics;

let requestIdCounter = globalForMetrics.requestIdCounter ?? 0;
if (process.env.NODE_ENV !== 'production') globalForMetrics.requestIdCounter = requestIdCounter;

export function generateRequestId(): string {
  const id = ++requestIdCounter;
  return `req_${Date.now()}_${id}`;
}

export function recordPerformanceMetric(metric: PerformanceMetrics): void {
  if (process.env.NODE_ENV !== 'production') {
    metrics.push(metric);

    while (metrics.length > PERFORMANCE_THRESHOLDS.maxCacheSize) {
      metrics.shift();
    }
  }

  if (metric.durationMs > PERFORMANCE_THRESHOLDS.verySlowRequestMs) {
    logger.warn('Very slow request detected', {
      requestId: metric.requestId,
      method: metric.method,
      pathname: metric.pathname,
      durationMs: metric.durationMs,
      statusCode: metric.statusCode,
    });
  } else if (metric.durationMs > PERFORMANCE_THRESHOLDS.slowRequestMs) {
    logger.warn('Slow request detected', {
      requestId: metric.requestId,
      method: metric.method,
      pathname: metric.pathname,
      durationMs: metric.durationMs,
      statusCode: metric.statusCode,
    });
  }
}

export function getPerformanceMetrics(limit: number = 100): PerformanceMetrics[] {
  return metrics.slice(-limit);
}

export function getAverageResponseTime(pathname?: string): number {
  const relevantMetrics = pathname ? metrics.filter((m) => m.pathname === pathname) : metrics;

  if (relevantMetrics.length === 0) return 0;

  const total = relevantMetrics.reduce((sum, m) => sum + m.durationMs, 0);
  return total / relevantMetrics.length;
}

export function getPercentileResponseTime(percentile: number, pathname?: string): number {
  const relevantMetrics = pathname ? metrics.filter((m) => m.pathname === pathname) : metrics;

  if (relevantMetrics.length === 0) return 0;

  const durations = relevantMetrics.map((m) => m.durationMs).sort((a, b) => a - b);
  const index = Math.floor((percentile / 100) * durations.length);
  return durations[index] || 0;
}

export function getSlowRequests(thresholdMs: number, limit: number = 50): PerformanceMetrics[] {
  return metrics
    .filter((m) => m.durationMs > thresholdMs)
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, limit);
}

export function getCacheHitRate(pathname?: string): number {
  const relevantMetrics = pathname ? metrics.filter((m) => m.pathname === pathname) : metrics;

  if (relevantMetrics.length === 0) return 0;

  const cacheHits = relevantMetrics.filter((m) => m.cacheHit).length;
  return (cacheHits / relevantMetrics.length) * 100;
}

export function clearMetrics(): void {
  metrics.length = 0;
}

export function performanceMonitor(
  handler: (request: NextRequest, requestId: string) => Promise<NextResponse>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = generateRequestId();
    const startTime = performance.now();
    let cacheHit = false;
    let statusCode = 200;

    try {
      const response = await handler(request, requestId);
      statusCode = response.status;

      const cacheControl = response.headers.get('cache-control');
      cacheHit = cacheControl?.includes('s-maxage') ?? false;

      return response;
    } catch (error) {
      statusCode = 500;
      throw error;
    } finally {
      const durationMs = performance.now() - startTime;
      const memoryUsageMb = process.memoryUsage().heapUsed / (1024 * 1024);

      recordPerformanceMetric({
        requestId,
        method: request.method,
        pathname: new URL(request.url).pathname,
        durationMs,
        statusCode,
        cacheHit,
        memoryUsageMb,
        timestamp: new Date().toISOString(),
      });
    }
  };
}

export const __TEST__ = {
  clearMetrics,
  getPerformanceMetrics,
  getAverageResponseTime,
  getPercentileResponseTime,
  getSlowRequests,
  getCacheHitRate,
};
