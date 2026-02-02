import { getUMAUserStats } from '@/server/oracle/umaState';
import { logger } from '@/lib/logger';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * @deprecated 此端点已弃用，请使用 /api/oracle/uma-users/{address}/stats
 * 获取 UMA 用户统计信息
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

    // 添加弃用警告头
    return NextResponse.json(stats, {
      headers: {
        Deprecation: 'true',
        Sunset: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90天后停用
        Link: `</api/oracle/uma-users/${address}/stats>; rel="successor-version"`,
      },
    });
  } catch (error) {
    logger.error('Failed to get UMA user stats', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
