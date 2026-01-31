import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getVoterStaking, getAllStakers } from '@/server/oracle/umaRewards';
import { logger } from '@/lib/logger';

const querySchema = z.object({
  voter: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 50)),
  offset: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 0)),
  minStake: z.string().optional(),
});

/**
 * GET /api/oracle/uma/staking
 *
 * Query params:
 * - voter: Get specific voter's staking info
 * - limit: Number of results (default: 50)
 * - offset: Offset for pagination (default: 0)
 * - minStake: Minimum stake amount filter
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse(Object.fromEntries(searchParams));

    // If voter is specified, return their staking info
    if (params.voter) {
      const staking = await getVoterStaking(params.voter);

      if (!staking) {
        return NextResponse.json(
          {
            ok: false,
            error: 'No staking info found for this voter',
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        ok: true,
        data: staking,
      });
    }

    // Otherwise return list of all stakers
    const stakers = await getAllStakers({
      limit: params.limit,
      offset: params.offset,
      minStake: params.minStake,
    });

    return NextResponse.json({
      ok: true,
      data: {
        stakers: stakers.records,
        pagination: {
          total: stakers.total,
          limit: params.limit,
          offset: params.offset,
          hasMore: stakers.total > params.offset + params.limit,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to get staking info', { error });
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to get staking info',
      },
      { status: 500 },
    );
  }
}
