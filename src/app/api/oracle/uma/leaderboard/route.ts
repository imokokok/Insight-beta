import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { getUMALeaderboard } from '@/server/oracle/umaState';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId') || undefined;
    const metric = searchParams.get('metric') as
      | 'proposals'
      | 'disputes'
      | 'votes'
      | 'bond'
      | undefined;
    const limit = searchParams.get('limit');

    const leaderboard = await getUMALeaderboard({
      instanceId,
      metric,
      limit: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json(leaderboard);
  } catch (error) {
    logger.error('Failed to get UMA leaderboard', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
