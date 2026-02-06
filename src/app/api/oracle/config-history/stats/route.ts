import { NextResponse } from 'next/server';

import { z } from 'zod';

import { getConfigHistoryStats } from '@/server/oracleConfigHistory';

const querySchema = z.object({
  instanceId: z.string().optional(),
});

/**
 * 获取配置历史统计信息
 * @param request - 请求对象
 * @returns 配置历史统计信息
 *
 * @example
 * GET /api/oracle/config-history/stats?instanceId=xxx
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse(Object.fromEntries(searchParams));

    const stats = await getConfigHistoryStats(params.instanceId);

    return NextResponse.json(stats);
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
