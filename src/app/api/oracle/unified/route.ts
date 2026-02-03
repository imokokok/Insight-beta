/**
 * Unified Oracle API Route
 *
 * 通用预言机聚合API
 * 提供跨协议的价格数据聚合和比较
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { withErrorHandling, createErrorResponse } from '@/lib/api/errorHandler';
import { getUnifiedPriceData, compareProtocols } from '@/server/oracle/unifiedService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/oracle/unified
 *
 * 获取聚合价格数据
 * 支持多协议价格对比和异常检测
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);

  const pair = searchParams.get('pair'); // e.g., 'ETH/USD'
  const protocols = searchParams.get('protocols')?.split(',') || ['all'];
  const includeStats = searchParams.get('includeStats') === 'true';

  if (!pair) {
    return createErrorResponse('VALIDATION_ERROR', 'Price pair is required (e.g., ETH/USD)', 400);
  }

  logger.info('Fetching unified oracle data', { pair, protocols });

  try {
    const data = await getUnifiedPriceData({
      pair,
      protocols: protocols.includes('all') ? undefined : protocols,
      includeStats,
    });

    return NextResponse.json({
      success: true,
      data,
      meta: {
        pair,
        protocols,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch unified oracle data', { error });
    return createErrorResponse('INTERNAL_ERROR', 'Failed to fetch unified oracle data', 500);
  }
});

/**
 * POST /api/oracle/unified
 *
 * 执行跨协议价格比较
 * 检测价格偏差和异常
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const {
    pair,
    protocols,
    threshold = 1.0, // 1% deviation threshold
    includeHistory = false,
  } = body;

  if (!pair) {
    return createErrorResponse('VALIDATION_ERROR', 'Price pair is required', 400);
  }

  logger.info('Comparing oracle protocols', { pair, protocols, threshold });

  try {
    const comparison = await compareProtocols({
      pair,
      protocols,
      deviationThreshold: threshold,
      includeHistory,
    });

    return NextResponse.json({
      success: true,
      data: comparison,
      meta: {
        pair,
        threshold,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to compare protocols', { error });
    return createErrorResponse('COMPARISON_ERROR', 'Failed to compare oracle protocols', 500);
  }
});
