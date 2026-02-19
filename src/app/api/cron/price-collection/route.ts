import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  collectAllPrices,
  SUPPORTED_PROTOCOLS,
} from '@/features/oracle/services/priceHistoryCollector';
import { hasDatabase } from '@/lib/database/db';
import { logger } from '@/shared/logger';

const CRON_SECRET = process.env.CRON_SECRET;

function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');

  if (CRON_SECRET) {
    const expectedAuth = `Bearer ${CRON_SECRET}`;
    if (authHeader !== expectedAuth) {
      return false;
    }
  }

  const isVercelCron = request.headers.get('x-vercel-cron') === 'true';
  const isLocalDev = process.env.NODE_ENV === 'development';

  return isVercelCron || isLocalDev;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    if (!verifyCronRequest(request)) {
      logger.warn('Unauthorized cron request attempt', {
        hasAuthHeader: !!request.headers.get('authorization'),
        isVercelCron: request.headers.get('x-vercel-cron'),
      });
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasDatabase()) {
      logger.warn('Database not available for price collection cron');
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 503 },
      );
    }

    logger.info('Starting scheduled price collection', {
      protocols: SUPPORTED_PROTOCOLS,
      trigger: 'vercel-cron',
    });

    const result = await collectAllPrices();

    const duration = Date.now() - startTime;

    logger.info('Price collection cron completed', {
      totalAttempted: result.totalAttempted,
      successful: result.successful,
      failed: result.failed,
      durationMs: duration,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: duration,
      summary: {
        totalAttempted: result.totalAttempted,
        successful: result.successful,
        failed: result.failed,
      },
      results: result.results,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Price collection cron failed', {
      error: error instanceof Error ? error.message : String(error),
      durationMs: duration,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Price collection failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        duration: duration,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
