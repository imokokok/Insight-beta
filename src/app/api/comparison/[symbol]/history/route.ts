/**
 * Comparison History API
 *
 * P2 优化：RESTful API 路由
 * GET /api/comparison/:symbol/history
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/shared/logger';

interface RouteParams {
  params: Promise<{
    symbol: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const requestStartTime = performance.now();

  try {
    const { symbol } = await params;
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // 验证 symbol 格式 (例如: ETH/USD)
    // 先检查长度防止 ReDoS 攻击，再使用正则验证
    if (symbol.length > 20 || !/^[A-Z]{2,10}\/[A-Z]{3}$/.test(symbol)) {
      return NextResponse.json(
        { error: 'Invalid symbol format. Expected format: XXX/YYY' },
        { status: 400 },
      );
    }

    // 验证并限制参数范围
    if (!Number.isFinite(hours) || hours < 1 || hours > 168) {
      return NextResponse.json(
        { error: 'Invalid hours parameter. Must be between 1 and 168' },
        { status: 400 },
      );
    }
    if (!Number.isFinite(page) || page < 1) {
      return NextResponse.json({ error: 'Invalid page parameter' }, { status: 400 });
    }
    if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid limit parameter. Must be between 1 and 100' },
        { status: 400 },
      );
    }

    // 动态导入 PriceAggregationEngine 以避免构建时执行
    const { PriceAggregationEngine } = await import('@/services/oracle/priceAggregation');
    const priceEngine = new PriceAggregationEngine();

    // 获取历史对比数据
    const comparisons = await priceEngine.getHistoricalComparisons(symbol, hours);

    // 分页
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedData = comparisons.slice(start, end);

    const requestTime = performance.now() - requestStartTime;
    logger.info('History API request completed', {
      performance: { totalRequestTimeMs: Math.round(requestTime) },
      requestParams: { symbol, hours, page, limit },
      responseStats: { total: comparisons.length, returned: paginatedData.length },
    });

    return NextResponse.json({
      ok: true,
      data: paginatedData,
      meta: {
        timestamp: new Date().toISOString(),
        requestTimeMs: Math.round(requestTime),
        page,
        limit,
        total: comparisons.length,
        hasMore: end < comparisons.length,
      },
    });
  } catch (error) {
    const requestTime = performance.now() - requestStartTime;
    logger.error('History API request failed', {
      error,
      performance: { totalRequestTimeMs: Math.round(requestTime) },
    });

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to fetch history data',
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 },
    );
  }
}
