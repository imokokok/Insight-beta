import type { NextRequest } from 'next/server';

import {
  fetchChannelById,
  updateExistingChannel,
  deleteExistingChannel,
} from '@/features/alerts/api';
import { error, ok } from '@/lib/api/apiResponse';
import { logger } from '@/shared/logger';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const channel = await fetchChannelById(id);

    if (!channel) {
      return error({ code: 'NOT_FOUND', message: 'Channel not found' }, 404);
    }

    return ok({ channel, timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('Failed to fetch notification channel', { error: err });
    return error({ code: 'INTERNAL_ERROR', message: 'Failed to fetch notification channel' }, 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = await updateExistingChannel({
      id,
      name: body.name,
      enabled: body.enabled,
      config: body.config,
      description: body.description,
    });

    if ('error' in result) {
      if (result.error === 'Channel not found') {
        return error({ code: 'NOT_FOUND', message: result.error }, 404);
      }
      return error({ code: 'VALIDATION_ERROR', message: result.error }, 400);
    }

    return ok({ channel: result.channel, timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('Failed to update notification channel', { error: err });
    return error({ code: 'INTERNAL_ERROR', message: 'Failed to update notification channel' }, 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const deleted = await deleteExistingChannel(id);

    if (!deleted) {
      return error({ code: 'NOT_FOUND', message: 'Channel not found' }, 404);
    }

    return ok({ message: 'Channel deleted successfully', timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('Failed to delete notification channel', { error: err });
    return error({ code: 'INTERNAL_ERROR', message: 'Failed to delete notification channel' }, 500);
  }
}
