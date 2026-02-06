import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { getUMAUserStats } from '@/server/oracle/umaState';

/**
 * 获取 UMA 用户统计信息
 * @param request - Next.js 请求对象
 * @param params - 路由参数，包含用户地址
 * @returns 用户统计信息
 *
 * @example
 * GET /api/oracle/uma-users/0x123.../stats?instanceId=xxx
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await params;
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId') || undefined;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    const stats = await getUMAUserStats(address, instanceId);

    return NextResponse.json(stats);
  } catch (error) {
    logger.error('Failed to get UMA user stats', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
