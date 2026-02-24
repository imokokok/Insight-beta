import type { NextRequest } from 'next/server';

import { fetchRealtime } from '@/features/comparison/api';
import { apiSuccess, getQueryParam } from '@/lib/api/apiResponse';
import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import { logger } from '@/shared/logger';

async function handleGet(request: NextRequest) {
  const requestStartTime = performance.now();

  const symbolsParam = getQueryParam(request, 'symbols');
  const protocolsParam = getQueryParam(request, 'protocols');

  const response = await fetchRealtime({
    symbols: symbolsParam ?? undefined,
    protocols: protocolsParam ?? undefined,
  });

  const requestTime = performance.now() - requestStartTime;
  logger.info('Realtime API request completed', {
    performance: { totalRequestTimeMs: Math.round(requestTime) },
    requestParams: { symbols: symbolsParam, protocols: protocolsParam },
    responseStats: { totalPairs: response.length },
  });

  return apiSuccess({
    data: response,
    meta: {
      timestamp: new Date().toISOString(),
      requestTimeMs: Math.round(requestTime),
    },
  });
}

export const GET = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  validate: { allowedMethods: ['GET'] },
})(handleGet);
