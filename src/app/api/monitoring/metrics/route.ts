/**
 * Performance Metrics API
 *
 * Provides real-time performance metrics for monitoring dashboard
 */

import type { NextRequest } from 'next/server';

import { performanceMonitor } from '@/services/monitoring/performanceMonitor';
import { apiSuccess, withErrorHandler, getQueryParam } from '@/shared/utils';

/**
 * GET /api/monitoring/metrics
 *
 * Query params:
 * - duration: Time range in milliseconds (default: 3600000 = 1 hour)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
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
});
