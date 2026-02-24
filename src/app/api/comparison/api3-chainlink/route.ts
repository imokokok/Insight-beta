import type { NextRequest } from 'next/server';

import { fetchApi3ChainlinkComparison } from '@/features/comparison/api';
import { ok, error } from '@/lib/api/apiResponse';
import { logger } from '@/shared/logger';

export async function GET(_request: NextRequest) {
  const requestStartTime = performance.now();

  try {
    const data = await fetchApi3ChainlinkComparison();

    const requestTime = performance.now() - requestStartTime;

    logger.info('API3 vs Chainlink comparison API request completed', {
      performance: { totalRequestTimeMs: Math.round(requestTime) },
      responseStats: {
        hasLatencyData: !!data.latency,
        hasAvailabilityData: !!data.availability,
        hasGasCostData: !!data.gasCost,
        hasDataQualityData: !!data.dataQuality,
      },
    });

    return ok(data);
  } catch (err) {
    const requestTime = performance.now() - requestStartTime;

    logger.error('API3 vs Chainlink comparison API request failed', {
      error: err,
      performance: { totalRequestTimeMs: Math.round(requestTime) },
    });

    return error(
      {
        code: 'internal_error',
        message: err instanceof Error ? err.message : 'Internal server error',
      },
      500,
    );
  }
}
