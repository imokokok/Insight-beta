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
const isDevelopment = process.env.NODE_ENV === 'development';

function verifyCronRequest(request: NextRequest): { valid: boolean; reason?: string } {
  const authHeader = request.headers.get('authorization');

  if (CRON_SECRET) {
    const expectedAuth = `Bearer ${CRON_SECRET}`;
    if (authHeader !== expectedAuth) {
      return { valid: false, reason: 'invalid_bearer_token' };
    }
    return { valid: true };
  }

  if (isDevelopment) {
    const isLocalRequest =
      request.headers.get('host')?.includes('localhost') ||
      request.headers.get('x-forwarded-for') === '127.0.0.1';

    if (isLocalRequest) {
      return { valid: true };
    }
    return { valid: false, reason: 'non_local_request_in_dev' };
  }

  return { valid: false, reason: 'cron_secret_not_configured' };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const verification = verifyCronRequest(request);
    if (!verification.valid) {
      logger.warn('Unauthorized cron request attempt', {
        reason: verification.reason,
        hasAuthHeader: !!request.headers.get('authorization'),
        host: request.headers.get('host'),
        xForwardedFor: request.headers.get('x-forwarded-for'),
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
