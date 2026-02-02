import { listUMAAssertions } from '@/server/oracle/umaState';
import { logger } from '@/lib/logger';
import type { UMAAssertion } from '@/lib/types/oracleTypes';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * @deprecated 此端点已弃用，请使用 /api/oracle/uma-users/{address}/assertions
 * 获取 UMA 用户的断言列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await params;
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId') || undefined;
    const status = searchParams.get('status') as UMAAssertion['status'] | undefined;
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    const result = await listUMAAssertions({
      instanceId,
      status,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    const userAssertions = result.assertions.filter(
      (a) => a.proposer.toLowerCase() === address.toLowerCase(),
    );

    // 添加弃用警告头
    return NextResponse.json(
      {
        assertions: userAssertions,
        total: userAssertions.length,
        limit: 100,
        offset: parseInt(offset || '0'),
      },
      {
        headers: {
          Deprecation: 'true',
          Sunset: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90天后停用
          Link: `</api/oracle/uma-users/${address}/assertions>; rel="successor-version"`,
        },
      },
    );
  } catch (error) {
    logger.error('Failed to get user assertions', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
