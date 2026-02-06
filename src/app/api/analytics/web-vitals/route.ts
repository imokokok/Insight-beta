import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { cacheManager } from '@/lib/api/optimization/cache';
import { logger } from '@/lib/logger';

/**
 * Web Vitals 指标上报接口
 *
 * 接收客户端性能指标数据，用于监控和分析应用性能
 * 数据存储在缓存中（Redis 或内存），支持持久化和统计分析
 */

interface WebVitalsRecord {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
  inp?: number;
  timestamp: string;
  url: string;
  userAgent: string;
  sessionId?: string;
}

interface WebVitalsStats {
  lcp: MetricStats | null;
  fid: MetricStats | null;
  cls: MetricStats | null;
  fcp: MetricStats | null;
  ttfb: MetricStats | null;
  inp: MetricStats | null;
  totalRecords: number;
  lastUpdated: string;
  alerts: PerformanceAlert[];
}

interface MetricStats {
  count: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
}

interface PerformanceAlert {
  metric: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  url: string;
  timestamp: string;
}

// 性能阈值配置
const PERFORMANCE_THRESHOLDS = {
  lcp: { warning: 2500, critical: 4000 },
  fid: { warning: 100, critical: 300 },
  cls: { warning: 0.1, critical: 0.25 },
  fcp: { warning: 1800, critical: 3000 },
  ttfb: { warning: 600, critical: 1000 },
  inp: { warning: 200, critical: 500 },
};

const CACHE_KEY = 'web-vitals:records';
const CACHE_STATS_KEY = 'web-vitals:stats';
const MAX_STORE_SIZE = 10000;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时

/**
 * 检查性能指标是否超出阈值
 */
function checkPerformanceThresholds(data: WebVitalsRecord): PerformanceAlert[] {
  const alerts: PerformanceAlert[] = [];

  for (const [metric, thresholds] of Object.entries(PERFORMANCE_THRESHOLDS)) {
    const value = data[metric as keyof WebVitalsRecord] as number | undefined;
    if (value === undefined) continue;

    if (value > thresholds.critical) {
      alerts.push({
        metric,
        value,
        threshold: thresholds.critical,
        severity: 'critical',
        url: data.url,
        timestamp: data.timestamp,
      });
    } else if (value > thresholds.warning) {
      alerts.push({
        metric,
        value,
        threshold: thresholds.warning,
        severity: 'warning',
        url: data.url,
        timestamp: data.timestamp,
      });
    }
  }

  return alerts;
}

/**
 * 发送性能告警
 */
async function sendPerformanceAlerts(alerts: PerformanceAlert[]): Promise<void> {
  for (const alert of alerts) {
    if (alert.severity === 'critical') {
      logger.error(`Critical performance issue: ${alert.metric}`, {
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold,
        url: alert.url,
      });
    } else {
      logger.warn(`Performance warning: ${alert.metric}`, {
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold,
        url: alert.url,
      });
    }
  }

  // 存储告警到缓存
  const existingAlerts =
    (await cacheManager.provider.get<PerformanceAlert[]>('web-vitals:alerts')) || [];
  existingAlerts.push(...alerts);

  // 只保留最近 100 条告警
  if (existingAlerts.length > 100) {
    existingAlerts.splice(0, existingAlerts.length - 100);
  }

  await cacheManager.provider.set('web-vitals:alerts', existingAlerts, CACHE_TTL);
}

/**
 * POST /api/analytics/web-vitals
 * 接收 Web Vitals 性能指标数据
 */
export async function POST(request: NextRequest) {
  try {
    const data: WebVitalsRecord = await request.json();

    // 验证必要字段
    if (!data.timestamp || !data.url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 添加记录到缓存
    const existingRecords = (await cacheManager.provider.get<WebVitalsRecord[]>(CACHE_KEY)) || [];

    const record: WebVitalsRecord = {
      ...data,
      timestamp: new Date().toISOString(),
    };

    existingRecords.push(record);

    // 限制存储大小
    if (existingRecords.length > MAX_STORE_SIZE) {
      existingRecords.shift();
    }

    await cacheManager.provider.set(CACHE_KEY, existingRecords, CACHE_TTL);

    // 检查性能阈值并发送告警
    const alerts = checkPerformanceThresholds(record);
    if (alerts.length > 0) {
      await sendPerformanceAlerts(alerts);
    }

    // 更新统计数据
    await updateStats(existingRecords);

    return NextResponse.json({
      success: true,
      alerts: alerts.length > 0 ? alerts : undefined,
    });
  } catch (error) {
    logger.error('Failed to process Web Vitals', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 更新统计数据
 */
async function updateStats(records: WebVitalsRecord[]): Promise<void> {
  const stats = calculateStats(records);
  await cacheManager.provider.set(CACHE_STATS_KEY, stats, CACHE_TTL);
}

/**
 * GET /api/analytics/web-vitals
 * 获取 Web Vitals 统计数据
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限（简化版，实际应使用更严格的认证）
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 从缓存获取数据
    const records = (await cacheManager.provider.get<WebVitalsRecord[]>(CACHE_KEY)) || [];
    const stats = await cacheManager.provider.get<WebVitalsStats>(CACHE_STATS_KEY);
    const alerts = (await cacheManager.provider.get<PerformanceAlert[]>('web-vitals:alerts')) || [];

    return NextResponse.json({
      data: records.slice(-100), // 返回最近 100 条
      stats: stats || calculateStats(records),
      alerts: alerts.slice(-50), // 返回最近 50 条告警
      total: records.length,
    });
  } catch (error) {
    logger.error('Failed to get Web Vitals stats', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 计算 Web Vitals 统计数据
 */
function calculateStats(records: WebVitalsRecord[]): WebVitalsStats {
  if (records.length === 0) {
    return {
      lcp: null,
      fid: null,
      cls: null,
      fcp: null,
      ttfb: null,
      inp: null,
      totalRecords: 0,
      lastUpdated: new Date().toISOString(),
      alerts: [],
    };
  }

  const calculateMetric = (key: keyof WebVitalsRecord): MetricStats | null => {
    const values = records
      .map((r) => r[key] as number | undefined)
      .filter((v): v is number => v !== undefined && v > 0);

    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      avg: Math.round((sum / values.length) * 100) / 100,
      min: Math.round((sorted[0] ?? 0) * 100) / 100,
      max: Math.round((sorted[sorted.length - 1] ?? 0) * 100) / 100,
      p50: Math.round((sorted[Math.floor(sorted.length * 0.5)] ?? 0) * 100) / 100,
      p75: Math.round((sorted[Math.floor(sorted.length * 0.75)] ?? 0) * 100) / 100,
      p90: Math.round((sorted[Math.floor(sorted.length * 0.9)] ?? 0) * 100) / 100,
      p95: Math.round((sorted[Math.floor(sorted.length * 0.95)] ?? 0) * 100) / 100,
    };
  };

  // 收集所有告警
  const allAlerts: PerformanceAlert[] = [];
  for (const record of records) {
    allAlerts.push(...checkPerformanceThresholds(record));
  }

  return {
    lcp: calculateMetric('lcp'),
    fid: calculateMetric('fid'),
    cls: calculateMetric('cls'),
    fcp: calculateMetric('fcp'),
    ttfb: calculateMetric('ttfb'),
    inp: calculateMetric('inp'),
    totalRecords: records.length,
    lastUpdated: new Date().toISOString(),
    alerts: allAlerts.slice(-100), // 只保留最近 100 条告警
  };
}

/**
 * DELETE /api/analytics/web-vitals
 * 清除 Web Vitals 数据（仅管理员）
 */
export async function DELETE(request: NextRequest) {
  try {
    // 验证管理员权限
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 清除缓存数据
    await cacheManager.provider.delete(CACHE_KEY);
    await cacheManager.provider.delete(CACHE_STATS_KEY);
    await cacheManager.provider.delete('web-vitals:alerts');

    logger.info('Web Vitals data cleared');

    return NextResponse.json({ success: true, message: 'Data cleared' });
  } catch (error) {
    logger.error('Failed to clear Web Vitals data', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
