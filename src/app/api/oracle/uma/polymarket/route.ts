import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { z } from 'zod';

import { logger } from '@/lib/logger';
import { getMarkets, getMarket, getMarketStats } from '@/server/oracle/polymarket';

const querySchema = z.object({
  conditionId: z.string().optional(),
  resolved: z
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
 * GET /api/oracle/uma/polymarket
 *
 * Query params:
 * - conditionId: Get specific market by condition ID
 * - resolved: Filter by resolved status (true/false)
 * - limit: Number of results (default: 20)
 * - offset: Offset for pagination (default: 0)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse(Object.fromEntries(searchParams));

    // If conditionId is specified, return specific market
    if (params.conditionId) {
      const market = await getMarket(params.conditionId);

      if (!market) {
        return NextResponse.json({ ok: false, error: 'Market not found' }, { status: 404 });
      }

      return NextResponse.json({
        ok: true,
        data: market,
      });
    }

    // Otherwise return market list and stats
    const [markets, stats] = await Promise.all([
      getMarkets({
        resolved: params.resolved,
        limit: params.limit,
        offset: params.offset,
      }),
      getMarketStats(),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        markets: markets.records,
        pagination: {
          total: markets.total,
          limit: params.limit,
          offset: params.offset,
          hasMore: markets.total > params.offset + params.limit,
        },
        stats,
      },
    });
  } catch (error) {
    logger.error('Failed to get Polymarket data', { error });
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to get Polymarket data',
      },
      { status: 500 },
    );
  }
}
