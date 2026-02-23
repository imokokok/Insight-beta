import type { NextRequest } from 'next/server';

import { calculateAndStoreReliabilityScores } from '@/features/oracle/services/reliabilityScorer';
import { ok, error } from '@/lib/api/apiResponse';
import { hasDatabase } from '@/lib/database/db';
import { logger } from '@/shared/logger';
import type { TimePeriod } from '@/types/oracle/reliability';

export async function POST(request: NextRequest) {
  try {
    if (!hasDatabase()) {
      return error({ code: 'DATABASE_UNAVAILABLE', message: 'Database not available' }, 503);
    }

    const body = await request.json().catch(() => ({}));
    const { period = '30d', protocols = ['chainlink', 'pyth', 'redstone'] } = body;

    if (!['7d', '30d', '90d'].includes(period)) {
      return error(
        { code: 'INVALID_PERIOD', message: 'Invalid period. Must be one of: 7d, 30d, 90d' },
        400,
      );
    }

    const results = await calculateAndStoreReliabilityScores(period as TimePeriod, protocols);

    logger.info('Reliability scores calculated', {
      period,
      protocolsCount: results.length,
    });

    return ok(results, { period, timestamp: new Date().toISOString(), count: results.length });
  } catch (err) {
    logger.error('Reliability score calculation failed', {
      error: err instanceof Error ? err.message : String(err),
    });

    return error(
      {
        code: 'RELIABILITY_CALCULATION_FAILED',
        message: 'Failed to calculate reliability scores',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      500,
    );
  }
}

export async function GET() {
  return ok({
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
