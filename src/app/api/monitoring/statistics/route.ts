/**
 * Statistics API
 *
 * Provides aggregated performance statistics for monitoring dashboard
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/shared/logger';
import { performanceMonitor } from '@/services/monitoring/performanceMonitor';

/**
 * GET /api/monitoring/statistics
 *
 * Query params:
 * - duration: Time range in milliseconds (default: 3600000 = 1 hour)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const duration = parseInt(searchParams.get('duration') ?? '3600000', 10);

    const stats = performanceMonitor.getStatistics(duration);

    return NextResponse.json({
      success: true,
      data: stats,
      meta: {
        duration,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch statistics', { error });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch statistics',
      },
      { status: 500 },
    );
  }
}
