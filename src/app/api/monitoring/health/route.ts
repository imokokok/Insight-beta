/**
 * Health Check API
 *
 * Provides system health status for monitoring dashboard
 */

import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { performanceMonitor } from '@/server/monitoring/performanceMonitor';

/**
 * GET /api/monitoring/health
 *
 * Returns current system health status
 */
export async function GET() {
  try {
    const health = performanceMonitor.getHealthStatus();

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(
      {
        success: true,
        data: health,
        meta: {
          timestamp: Date.now(),
        },
      },
      { status: statusCode },
    );
  } catch (error) {
    logger.error('Failed to fetch health status', { error });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch health status',
      },
      { status: 500 },
    );
  }
}
