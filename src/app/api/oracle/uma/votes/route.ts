import { listUMAVotes, fetchUMAVote } from '@/server/oracle/umaState';
import { logger } from '@/lib/logger';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId') || undefined;
    const assertionId = searchParams.get('assertionId') || undefined;
    const voter = searchParams.get('voter') || undefined;
    const txHash = searchParams.get('txHash');
    const logIndex = searchParams.get('logIndex');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    if (txHash && logIndex) {
      const vote = await fetchUMAVote(txHash, parseInt(logIndex), instanceId);
      if (!vote) {
        return NextResponse.json({ error: 'Vote not found' }, { status: 404 });
      }
      return NextResponse.json({ vote });
    }

    const result = await listUMAVotes({
      instanceId,
      assertionId,
      voter,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    return NextResponse.json({
      votes: result.votes,
      total: result.total,
      limit: 100,
      offset: parseInt(offset || '0'),
    });
  } catch (error) {
    logger.error('Failed to list UMA votes', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
