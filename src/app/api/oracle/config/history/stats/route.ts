import { NextResponse } from 'next/server';

import { z } from 'zod';

import { getConfigHistoryStats } from '@/server/oracleConfigHistory';

const querySchema = z.object({
  instanceId: z.string().optional(),
});

/**
 * @deprecated 此端点已弃用，请使用 /api/oracle/config-history/stats
 * 获取配置历史统计信息
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse(Object.fromEntries(searchParams));

    const stats = await getConfigHistoryStats(params.instanceId);

    // 添加弃用警告头
    return NextResponse.json(stats, {
      headers: {
        Deprecation: 'true',
        Sunset: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        Link: '</api/oracle/config-history/stats>; rel="successor-version"',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.format() },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
