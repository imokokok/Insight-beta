/**
 * Performance Metrics API
 *
 * Provides real-time performance metrics for monitoring dashboard
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { performanceMonitor } from '@/server/monitoring/performanceMonitor';

/**
 * GET /api/monitoring/metrics
 *
 * Query params:
 * - duration: Time range in milliseconds (default: 3600000 = 1 hour)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const duration = parseInt(searchParams.get('duration') ?? '3600000', 10);

    const metrics = performanceMonitor.getMetricsHistory(duration);

    return NextResponse.json({
      success: true,
      data: metrics,
      meta: {
        count: metrics.length,
        duration,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch metrics', { error });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch metrics',
      },
      { status: 500 },
    );
  }
}
