import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { z } from 'zod';

import { logger } from '@/lib/logger';
import { getVoterSlashing } from '@/server/oracle/umaRewards';

const querySchema = z.object({
  voter: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
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
 * GET /api/oracle/uma/slashing
 *
 * Query params:
 * - voter: Required. Voter address to get slashing history for
 * - limit: Number of results (default: 20)
 * - offset: Offset for pagination (default: 0)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse(Object.fromEntries(searchParams));

    if (!params.voter) {
      return NextResponse.json({ ok: false, error: 'Voter address is required' }, { status: 400 });
    }

    const slashing = await getVoterSlashing(params.voter, {
      limit: params.limit,
      offset: params.offset,
    });

    // Calculate total slashed
    const totalSlashed = slashing.records.reduce(
      (sum, record) => sum + BigInt(record.slashAmount),
      0n,
    );

    return NextResponse.json({
      ok: true,
      data: {
        voter: params.voter,
        slashingHistory: slashing.records,
        totalSlashed: totalSlashed.toString(),
        pagination: {
          total: slashing.total,
          limit: params.limit,
          offset: params.offset,
          hasMore: slashing.total > params.offset + params.limit,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to get slashing history', { error });
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to get slashing history',
      },
      { status: 500 },
    );
  }
}
