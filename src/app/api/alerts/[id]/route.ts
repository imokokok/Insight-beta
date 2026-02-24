import type { NextRequest } from 'next/server';

import { updateAlertStatus, getAlertStoredData, validateAlertAction } from '@/features/alerts/api';
import { ok, error } from '@/lib/api/apiResponse';
import { logger } from '@/shared/logger';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { action, note, duration } = body as {
      action: 'acknowledge' | 'resolve' | 'silence';
      note?: string;
      duration?: number;
    };

    if (!validateAlertAction(action)) {
      return error(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid action. Must be acknowledge, resolve, or silence.',
        },
        400,
      );
    }

    const result = await updateAlertStatus(id, { action, note, duration });

    if (!result) {
      return error(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid action. Must be acknowledge, resolve, or silence.',
        },
        400,
      );
    }

    return ok({ alert: result.alert, message: result.message, timestamp: result.timestamp });
  } catch (err) {
    logger.error('Failed to update alert', { error: err });
    return error({ code: 'INTERNAL_ERROR', message: 'Failed to update alert' }, 500);
  }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const storedData = getAlertStoredData(id);

    if (!storedData) {
      return ok({ data: null, message: 'No stored data for this alert' });
    }

    return ok({ data: storedData, timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('Failed to get alert', { error: err });
    return error({ code: 'INTERNAL_ERROR', message: 'Failed to get alert' }, 500);
  }
}
