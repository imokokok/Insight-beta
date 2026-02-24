import type { NextRequest } from 'next/server';

import { fetchAlerts } from '@/features/alerts/api';
import { error, ok } from '@/lib/api/apiResponse';
import { AppError } from '@/lib/errors';
import { logger } from '@/shared/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');

    const data = await fetchAlerts({
      source: source ?? undefined,
      severity: severity ?? undefined,
      status: status ?? undefined,
    });

    return ok(data);
  } catch (err) {
    logger.error('Failed to fetch alerts', { error: err });

    return error(
      new AppError('Failed to fetch alerts', {
        category: 'INTERNAL',
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        details: {
          alerts: [],
          summary: {
            total: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            active: 0,
            resolved: 0,
            bySource: {
              price_anomaly: 0,
              cross_chain: 0,
              security: 0,
            },
          },
          timestamp: new Date().toISOString(),
        },
      }),
    );
  }
}
