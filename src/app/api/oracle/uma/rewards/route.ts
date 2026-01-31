import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getVoterRewards, getRewardsStats, calculateVoterStats } from '@/server/oracle/umaRewards';
import { syncDVMEvents } from '@/server/oracle/umaRewardsSync';
import { requireAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';

const querySchema = z.object({
  voter: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  claimed: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20)),
  offset: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 0)),
});

/**
 * GET /api/oracle/uma/rewards
 *
 * Query params:
 * - voter: Filter by voter address
 * - claimed: Filter by claimed status (true/false)
 * - limit: Number of results (default: 20)
 * - offset: Offset for pagination (default: 0)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse(Object.fromEntries(searchParams));

    // If voter is specified, return their rewards
    if (params.voter) {
      const [rewards, stats] = await Promise.all([
        getVoterRewards(params.voter, {
          claimed: params.claimed,
          limit: params.limit,
          offset: params.offset,
        }),
        calculateVoterStats(params.voter),
      ]);

      return NextResponse.json({
        ok: true,
        data: {
          voter: params.voter,
          rewards: rewards.records,
          pagination: {
            total: rewards.total,
            limit: params.limit,
            offset: params.offset,
            hasMore: rewards.total > params.offset + params.limit,
          },
          stats,
        },
      });
    }

    // Otherwise return global stats
    const stats = await getRewardsStats();
    return NextResponse.json({
      ok: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to get rewards', { error });
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to get rewards',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/oracle/uma/rewards/sync
 * Trigger a manual sync of DVM rewards
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const auth = await requireAuth(request);
    if (!auth.isAdmin) {
      return NextResponse.json({ ok: false, error: 'Admin permission required' }, { status: 403 });
    }

    const result = await syncDVMEvents();

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (error) {
    logger.error('Failed to sync rewards', { error });
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to sync rewards',
      },
      { status: 500 },
    );
  }
}
