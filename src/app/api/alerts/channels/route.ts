import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';
import { createNotificationChannelSchema } from '@/lib/api/validation/schemas';
import { parseAndValidate } from '@/lib/api/validation/validate';
import type { NotificationChannelConfig } from '@/types/oracle/alert';

import { mockChannels, createChannel, generateChannelId } from './store';

function validateChannelConfig(
  type: string,
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
    channels: mockChannels,
    total: mockChannels.length,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  const parsed = await parseAndValidate(request, createNotificationChannelSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const data = parsed.data;

  const configValidation = validateChannelConfig(data.type, data.config);
  if (!configValidation.valid) {
    return error({ code: 'VALIDATION_ERROR', message: configValidation.error }, 400);
  }

  const now = new Date().toISOString();
  const newChannel = {
    id: generateChannelId(),
    name: data.name,
    type: data.type,
    enabled: data.enabled,
    config: data.config,
    description: data.description,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: null,
    testStatus: null,
  };

  await createChannel(newChannel);

  return ok({ channel: newChannel, timestamp: new Date().toISOString() });
}
