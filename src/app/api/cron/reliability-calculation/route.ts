import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { calculateAndStoreReliabilityScores } from '@/features/oracle/services/reliabilityScorer';
import { hasDatabase } from '@/lib/database/db';
import type { TimePeriod } from '@/lib/database/reliabilityTables';
import { logger } from '@/shared/logger';

const CRON_SECRET = process.env.CRON_SECRET;

const DEFAULT_PROTOCOLS = ['chainlink', 'pyth', 'redstone'];

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
      logger.warn('Database not available for reliability calculation cron');
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 503 },
      );
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || '30d') as TimePeriod;

    if (!['7d', '30d', '90d'].includes(period)) {
      return NextResponse.json(
        { success: false, error: 'Invalid period. Must be one of: 7d, 30d, 90d' },
        { status: 400 },
      );
    }

    logger.info('Starting scheduled reliability calculation', {
      period,
      protocols: DEFAULT_PROTOCOLS,
      trigger: 'vercel-cron',
    });

    const results = await calculateAndStoreReliabilityScores(period, DEFAULT_PROTOCOLS);

    const duration = Date.now() - startTime;

    logger.info('Reliability calculation cron completed', {
      period,
      protocolsCount: results.length,
      durationMs: duration,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: duration,
      period,
      count: results.length,
      data: results,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Reliability calculation cron failed', {
      error: error instanceof Error ? error.message : String(error),
      durationMs: duration,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Reliability calculation failed',
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
