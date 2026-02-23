/**
 * Comparison History API
 *
 * P2 优化：RESTful API 路由
 * GET /api/comparison/:symbol/history
 */

import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';
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
      return error(
        {
          code: 'INVALID_SYMBOL_FORMAT',
          message: 'Invalid symbol format. Expected format: XXX/YYY',
        },
        400,
      );
    }

    // 验证并限制参数范围
    if (!Number.isFinite(hours) || hours < 1 || hours > 168) {
      return error(
        { code: 'INVALID_HOURS', message: 'Invalid hours parameter. Must be between 1 and 168' },
        400,
      );
    }
    if (!Number.isFinite(page) || page < 1) {
      return error({ code: 'INVALID_PAGE', message: 'Invalid page parameter' }, 400);
    }
    if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
      return error(
        { code: 'INVALID_LIMIT', message: 'Invalid limit parameter. Must be between 1 and 100' },
        400,
      );
    }

    // 动态导入 PriceAggregationEngine 以避免构建时执行
    const { PriceAggregationEngine } = await import('@/features/oracle/services/priceAggregation');
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

    return ok(paginatedData, {
      timestamp: new Date().toISOString(),
      requestTimeMs: Math.round(requestTime),
      page,
      limit,
      total: comparisons.length,
      hasMore: end < comparisons.length,
    });
  } catch (err) {
    const requestTime = performance.now() - requestStartTime;
    logger.error('History API request failed', {
      error: err,
      performance: { totalRequestTimeMs: Math.round(requestTime) },
    });

    return error(
      {
        code: 'HISTORY_FETCH_FAILED',
        message: 'Failed to fetch history data',
        details: { timestamp: new Date().toISOString() },
      },
      500,
    );
  }
}
