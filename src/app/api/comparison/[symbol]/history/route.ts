/**
 * Comparison History API
 *
 * P2 优化：RESTful API 路由
 * GET /api/comparison/:symbol/history
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

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

    // 动态导入 PriceAggregationEngine 以避免构建时执行
    const { PriceAggregationEngine } = await import('@/server/oracle/priceAggregation');
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
