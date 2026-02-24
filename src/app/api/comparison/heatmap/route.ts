import type { NextRequest } from 'next/server';

import { fetchHeatmap } from '@/features/comparison/api';
import { ok, error } from '@/lib/api/apiResponse';
import { logger } from '@/shared/logger';

export async function GET(request: NextRequest) {
  const requestStartTime = performance.now();

  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols');
    const protocolsParam = searchParams.get('protocols');

    const response = await fetchHeatmap({
      symbols: symbolsParam ?? undefined,
      protocols: protocolsParam ?? undefined,
    });

    const requestTime = performance.now() - requestStartTime;
    logger.info('Heatmap API request completed', {
      performance: { totalRequestTimeMs: Math.round(requestTime) },
      requestParams: { symbols: symbolsParam, protocols: protocolsParam },
      responseStats: {
        totalPairs: response.totalPairs,
        criticalDeviations: response.criticalDeviations,
      },
    });

    return ok(response);
  } catch (err) {
    const requestTime = performance.now() - requestStartTime;
    logger.error('Heatmap API request failed', {
      error: err,
      performance: { totalRequestTimeMs: Math.round(requestTime) },
    });

    return error({ code: 'heatmap_error', message: 'Failed to fetch heatmap data' }, 500);
  }
}
