import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';
import type {
  NotificationChannel,
  NotificationChannelType,
  NotificationChannelConfig,
} from '@/types/oracle/alert';

import { channelsStore, generateChannelId } from './store';

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

export async function GET() {
  return ok({
    channels: channelsStore,
    total: channelsStore.length,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.name || !body.type) {
    return error({ code: 'VALIDATION_ERROR', message: 'Missing required fields: name, type' }, 400);
  }

  const validTypes: NotificationChannelType[] = ['webhook', 'email', 'telegram', 'slack'];
  if (!validTypes.includes(body.type)) {
    return error(
      {
        code: 'VALIDATION_ERROR',
        message: `Invalid channel type. Must be one of: ${validTypes.join(', ')}`,
      },
      400,
    );
  }

  const configValidation = validateChannelConfig(body.type, body.config || {});
  if (!configValidation.valid) {
    return error({ code: 'VALIDATION_ERROR', message: configValidation.error }, 400);
  }

  const now = new Date().toISOString();
  const newChannel: NotificationChannel = {
    id: generateChannelId(),
    name: body.name,
    type: body.type,
    enabled: body.enabled ?? true,
    config: body.config || {},
    description: body.description,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: null,
    testStatus: null,
  };

  channelsStore.push(newChannel);

  return ok({ channel: newChannel, timestamp: new Date().toISOString() });
}
