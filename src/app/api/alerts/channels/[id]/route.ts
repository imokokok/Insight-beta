import type { NextRequest } from 'next/server';

import { error, ok } from '@/lib/api/apiResponse';
import { logger } from '@/shared/logger';
import type {
  NotificationChannel,
  NotificationChannelType,
  NotificationChannelConfig,
} from '@/types/oracle/alert';

import { channelsStore } from '../store';

function validateChannelConfig(
  type: NotificationChannelType,
  config: NotificationChannelConfig,
): { valid: boolean; error?: string } {
  switch (type) {
    case 'webhook':
      if (!config.url) {
        return { valid: false, error: 'Webhook URL is required' };
      }
      try {
        new URL(config.url);
      } catch {
        return { valid: false, error: 'Invalid webhook URL' };
      }
      break;
    case 'email':
      if (!config.email) {
        return { valid: false, error: 'Email address is required' };
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(config.email)) {
        return { valid: false, error: 'Invalid email address' };
      }
      break;
    case 'telegram':
      if (!config.botToken) {
        return { valid: false, error: 'Bot token is required' };
      }
      if (!config.chatId) {
        return { valid: false, error: 'Chat ID is required' };
      }
      break;
    case 'slack':
      if (!config.url) {
        return { valid: false, error: 'Slack webhook URL is required' };
      }
      break;
  }
  return { valid: true };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const channel = channelsStore.find((c) => c.id === id);

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
    const channelIndex = channelsStore.findIndex((c) => c.id === id);

    if (channelIndex === -1) {
      return error({ code: 'NOT_FOUND', message: 'Channel not found' }, 404);
    }

    const existingChannel = channelsStore[channelIndex];
    if (!existingChannel) {
      return error({ code: 'NOT_FOUND', message: 'Channel not found' }, 404);
    }

    if (body.config) {
      const configValidation = validateChannelConfig(existingChannel.type, body.config);
      if (!configValidation.valid) {
        return error({ code: 'VALIDATION_ERROR', message: configValidation.error }, 400);
      }
    }

    const updatedChannel: NotificationChannel = {
      id: existingChannel.id,
      name: body.name ?? existingChannel.name,
      type: existingChannel.type,
      enabled: body.enabled ?? existingChannel.enabled,
      config: body.config ?? existingChannel.config,
      description: body.description ?? existingChannel.description,
      createdAt: existingChannel.createdAt,
      updatedAt: new Date().toISOString(),
      lastUsedAt: existingChannel.lastUsedAt,
      testStatus: existingChannel.testStatus,
      testMessage: existingChannel.testMessage,
    };

    channelsStore[channelIndex] = updatedChannel;

    return ok({ channel: updatedChannel, timestamp: new Date().toISOString() });
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
    const channelIndex = channelsStore.findIndex((c) => c.id === id);

    if (channelIndex === -1) {
      return error({ code: 'NOT_FOUND', message: 'Channel not found' }, 404);
    }

    channelsStore.splice(channelIndex, 1);

    return ok({ message: 'Channel deleted successfully', timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('Failed to delete notification channel', { error: err });
    return error({ code: 'INTERNAL_ERROR', message: 'Failed to delete notification channel' }, 500);
  }
}
