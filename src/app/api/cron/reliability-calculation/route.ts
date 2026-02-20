import type { NextRequest } from 'next/server';

import { calculateAndStoreReliabilityScores } from '@/features/oracle/services/reliabilityScorer';
import { error, ok } from '@/lib/api/apiResponse';
import { hasDatabase } from '@/lib/database/db';
import { AppError, ValidationError } from '@/lib/errors';
import { logger } from '@/shared/logger';
import type { TimePeriod } from '@/types/oracle/reliability';

const CRON_SECRET = process.env.CRON_SECRET;

const DEFAULT_PROTOCOLS = ['chainlink', 'pyth', 'redstone'];

function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');

  if (CRON_SECRET) {
    const expectedAuth = `Bearer ${CRON_SECRET}`;
    if (authHeader !== expectedAuth) {
      return false;
    }
    return true;
  }

  const isVercelCron = request.headers.get('x-vercel-cron') === 'true';

  if (isVercelCron) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    if (!verifyCronRequest(request)) {
      logger.warn('Unauthorized cron request attempt', {
        hasAuthHeader: !!request.headers.get('authorization'),
        isVercelCron: request.headers.get('x-vercel-cron'),
      });
      return error(
        new AppError('Unauthorized', {
          category: 'AUTHENTICATION',
          statusCode: 401,
          code: 'UNAUTHORIZED',
        }),
      );
    }

    if (!hasDatabase()) {
      logger.warn('Database not available for reliability calculation cron');
      return error(
        new AppError('Database not available', {
          category: 'UNAVAILABLE',
          statusCode: 503,
          code: 'SERVICE_UNAVAILABLE',
        }),
      );
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || '30d') as TimePeriod;

    if (!['7d', '30d', '90d'].includes(period)) {
      return error(new ValidationError('Invalid period. Must be one of: 7d, 30d, 90d'));
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

    return ok({
      timestamp: new Date().toISOString(),
      duration,
      period,
      count: results.length,
      data: results,
    });
  } catch (err) {
    const duration = Date.now() - startTime;

    logger.error('Reliability calculation cron failed', {
      error: err instanceof Error ? err.message : String(err),
      durationMs: duration,
    });

    return error(
      new AppError('Reliability calculation failed', {
        category: 'INTERNAL',
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        details: {
          message: err instanceof Error ? err.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          duration,
        },
      }),
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
