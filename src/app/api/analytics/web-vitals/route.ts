import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Web Vitals 指标上报接口
 *
 * 接收客户端性能指标数据，用于监控和分析应用性能
 */

// 存储最近的 Web Vitals 数据（内存存储，生产环境建议使用数据库）
const webVitalsStore: WebVitalsRecord[] = [];
const MAX_STORE_SIZE = 1000;

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

    // 添加记录到存储
    webVitalsStore.push({
      ...data,
      timestamp: new Date().toISOString(),
    });

    // 限制存储大小
    if (webVitalsStore.length > MAX_STORE_SIZE) {
      webVitalsStore.shift();
    }

    // 记录性能警告
    if (data.lcp && data.lcp > 2500) {
      logger.warn('Poor LCP detected', { value: data.lcp, url: data.url });
    }
    if (data.cls && data.cls > 0.1) {
      logger.warn('Poor CLS detected', { value: data.cls, url: data.url });
    }
    if (data.fid && data.fid > 100) {
      logger.warn('Poor FID detected', { value: data.fid, url: data.url });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to process Web Vitals', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/analytics/web-vitals
 * 获取 Web Vitals 统计数据（仅管理员访问）
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限（简化版，实际应使用更严格的认证）
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 计算统计数据
    const stats = calculateStats();

    return NextResponse.json({
      data: webVitalsStore.slice(-100), // 返回最近 100 条
      stats,
      total: webVitalsStore.length,
    });
  } catch (error) {
    logger.error('Failed to get Web Vitals stats', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 计算 Web Vitals 统计数据
 */
function calculateStats() {
  if (webVitalsStore.length === 0) {
    return null;
  }

  const calculateMetric = (key: keyof WebVitalsRecord) => {
    const values = webVitalsStore
      .map((r) => r[key] as number | undefined)
      .filter((v): v is number => v !== undefined && v > 0);

    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      avg: Math.round((sum / values.length) * 100) / 100,
      min: Math.round(sorted[0]! * 100) / 100,
      max: Math.round(sorted[sorted.length - 1]! * 100) / 100,
      p50: Math.round(sorted[Math.floor(sorted.length * 0.5)]! * 100) / 100,
      p75: Math.round(sorted[Math.floor(sorted.length * 0.75)]! * 100) / 100,
      p90: Math.round(sorted[Math.floor(sorted.length * 0.9)]! * 100) / 100,
      p95: Math.round(sorted[Math.floor(sorted.length * 0.95)]! * 100) / 100,
    };
  };

  return {
    lcp: calculateMetric('lcp'),
    fid: calculateMetric('fid'),
    cls: calculateMetric('cls'),
    fcp: calculateMetric('fcp'),
    ttfb: calculateMetric('ttfb'),
    inp: calculateMetric('inp'),
    totalRecords: webVitalsStore.length,
    lastUpdated: new Date().toISOString(),
  };
}
