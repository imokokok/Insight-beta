import type { NextRequest } from 'next/server';

import {
  collectAllPrices,
  SUPPORTED_PROTOCOLS,
} from '@/features/oracle/services/priceHistoryCollector';
import { error, ok } from '@/lib/api/apiResponse';
import { hasDatabase } from '@/lib/database/db';
import { AppError } from '@/lib/errors';
import { logger } from '@/shared/logger';

const CRON_SECRET = process.env.CRON_SECRET;

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
      logger.warn('Database not available for price collection cron');
      return error(
        new AppError('Database not available', {
          category: 'UNAVAILABLE',
          statusCode: 503,
          code: 'SERVICE_UNAVAILABLE',
        }),
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

    return ok({
      timestamp: new Date().toISOString(),
      duration: duration,
      summary: {
        totalAttempted: result.totalAttempted,
        successful: result.successful,
        failed: result.failed,
      },
      results: result.results,
    });
  } catch (err) {
    const duration = Date.now() - startTime;

    logger.error('Price collection cron failed', {
      error: err instanceof Error ? err.message : String(err),
      durationMs: duration,
    });

    return error(
      new AppError('Price collection failed', {
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
