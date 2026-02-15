/**
 * Performance Metrics API
 *
 * Provides real-time performance metrics for monitoring dashboard
 */

import type { NextRequest } from 'next/server';

import { performanceMonitor } from '@/features/monitoring/services';
import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import { apiSuccess, getQueryParam } from '@/shared/utils';

async function handleGet(request: NextRequest) {
  const durationParam = getQueryParam(request, 'duration');
  const duration = durationParam ? parseInt(durationParam, 10) : 3600000;

  const metrics = performanceMonitor.getMetricsHistory(duration);

  return apiSuccess({
    metrics,
    meta: {
      count: metrics.length,
      duration,
      timestamp: Date.now(),
    },
  });
}

export const GET = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  validate: { allowedMethods: ['GET'] },
})(handleGet);
