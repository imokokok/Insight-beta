import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { calculateAndStoreReliabilityScores } from '@/features/oracle/services/reliabilityScorer';
import { hasDatabase } from '@/lib/database/db';
import type { TimePeriod } from '@/lib/database/reliabilityTables';
import { logger } from '@/shared/logger';

export async function POST(request: NextRequest) {
  try {
    if (!hasDatabase()) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const { period = '30d', protocols = ['chainlink', 'pyth', 'redstone'] } = body;

    if (!['7d', '30d', '90d'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period. Must be one of: 7d, 30d, 90d' },
        { status: 400 },
      );
    }

    const results = await calculateAndStoreReliabilityScores(period as TimePeriod, protocols);

    logger.info('Reliability scores calculated', {
      period,
      protocolsCount: results.length,
    });

    return NextResponse.json({
      success: true,
      period,
      timestamp: new Date().toISOString(),
      count: results.length,
      data: results,
    });
  } catch (error) {
    logger.error('Reliability score calculation failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: 'Failed to calculate reliability scores',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Reliability Score Calculation API',
    endpoints: {
      'POST /api/oracle/reliability/calculate': {
        description: 'Calculate and store reliability scores for protocols',
        body: {
          period: 'Time period: 7d, 30d, or 90d (default: 30d)',
          protocols: 'Array of protocols to calculate (default: chainlink, pyth, redstone)',
        },
      },
    },
  });
}
