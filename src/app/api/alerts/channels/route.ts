import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/shared/logger';
import type {
  NotificationChannel,
  NotificationChannelType,
  NotificationChannelConfig,
} from '@/types/oracle/alert';

import { channelsStore, generateChannelId } from './store';

function validateChannelConfig(
  type: NotificationChannelType,
  config: NotificationChannelConfig
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
  try {
    return NextResponse.json({
      ok: true,
      channels: channelsStore,
      total: channelsStore.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to fetch notification channels', { error });
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch notification channels' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.type) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: name, type' },
        { status: 400 }
      );
    }

    const validTypes: NotificationChannelType[] = ['webhook', 'email', 'telegram', 'slack'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { ok: false, error: `Invalid channel type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const configValidation = validateChannelConfig(body.type, body.config || {});
    if (!configValidation.valid) {
      return NextResponse.json(
        { ok: false, error: configValidation.error },
        { status: 400 }
      );
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

    return NextResponse.json({
      ok: true,
      data: newChannel,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to create notification channel', { error });
    return NextResponse.json(
      { ok: false, error: 'Failed to create notification channel' },
      { status: 500 }
    );
  }
}
