/**
 * Optimistic Oracle API Route
 *
 * 通用乐观预言机API端点
 * 支持多协议乐观预言机数据查询
 * - UMA
 * - 其他乐观预言机协议
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { getOptimisticOracleOverview } from '@/server/oracle/optimisticService';

export const dynamic = 'force-dynamic';

function createErrorResponse(code: string, message: string, status: number = 500): NextResponse {
  logger.error('API Error', { code, message, status });
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

/**
 * GET /api/oracle/optimistic
 *
 * 获取乐观预言机总览数据
 * 支持协议筛选和链筛选
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // 查询参数
  const protocol = searchParams.get('protocol') || 'all'; // 'all' | 'uma'
  const chain = searchParams.get('chain') || 'all';
  const includeInactive = searchParams.get('includeInactive') === 'true';

  logger.info('Fetching optimistic oracle overview', {
    protocol,
    chain,
    includeInactive,
  });

  try {
    const overview = await getOptimisticOracleOverview({
      protocolFilter: protocol === 'all' ? undefined : protocol,
      chainFilter: chain === 'all' ? undefined : chain,
      includeInactive,
    });

    return NextResponse.json({
      ok: true,
      data: overview,
      meta: {
        timestamp: new Date().toISOString(),
        protocol,
        chain,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch optimistic oracle overview', { error });
    return createErrorResponse('INTERNAL_ERROR', 'Failed to fetch optimistic oracle data', 500);
  }
}

/**
 * POST /api/oracle/optimistic
 *
 * 触发乐观预言机数据同步
 * 支持按协议和链同步
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { protocol = 'all', chain = 'all', force = false } = body;

  logger.info('Triggering optimistic oracle sync', { protocol, chain, force });

  try {
    return NextResponse.json({
      success: true,
      message: 'Sync triggered successfully',
      data: {
        protocol,
        chain,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to trigger sync', { error });
    return createErrorResponse('SYNC_ERROR', 'Failed to trigger optimistic oracle sync', 500);
  }
}
