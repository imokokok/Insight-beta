import type { NextRequest } from 'next/server';

import { fetchMetrics } from '@/features/comparison/api';
import { ok, error } from '@/lib/api/apiResponse';
import { logger } from '@/shared/logger';

export async function GET(request: NextRequest) {
  const requestStartTime = performance.now();

  try {
    const { searchParams } = new URL(request.url);
    const protocolsParam = searchParams.get('protocols');

    const result = await fetchMetrics({ protocols: protocolsParam ?? undefined });

    if (!result.success) {
      return error(result.error, result.status);
    }

    const requestTime = performance.now() - requestStartTime;

    logger.info('Comparison metrics API request completed', {
      performance: { totalRequestTimeMs: Math.round(requestTime) },
      responseStats: { metricsCount: result.data.metrics.length },
    });

    return ok(result.data);
  } catch (err) {
    const requestTime = performance.now() - requestStartTime;

    logger.error('Comparison metrics API request failed', {
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
