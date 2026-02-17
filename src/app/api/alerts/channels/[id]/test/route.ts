import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/shared/logger';

import { channelsStore } from '../../store';

async function simulateWebhookTest(url: string): Promise<{ success: boolean; message: string }> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  if (url.includes('example.com')) {
    return {
      success: true,
      message: 'Test notification sent successfully to webhook endpoint',
    };
  }
  
  return {
    success: Math.random() > 0.3,
    message: Math.random() > 0.3 
      ? 'Test notification sent successfully' 
      : 'Failed to connect to webhook endpoint',
  };
}

async function simulateEmailTest(email: string): Promise<{ success: boolean; message: string }> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  
  return {
    success: true,
    message: `Test email sent successfully to ${email}`,
  };
}

async function simulateTelegramTest(botToken: string, chatId: string): Promise<{ success: boolean; message: string }> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  
  if (botToken && chatId) {
    return {
      success: true,
      message: 'Test message sent successfully to Telegram chat',
    };
  }
  
  return {
    success: false,
    message: 'Invalid bot token or chat ID',
  };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const channelIndex = channelsStore.findIndex((c) => c.id === id);

    if (channelIndex === -1) {
      return NextResponse.json(
        { ok: false, success: false, message: 'Channel not found' },
        { status: 404 }
      );
    }

    const channel = channelsStore[channelIndex];
    if (!channel) {
      return NextResponse.json(
        { ok: false, success: false, message: 'Channel not found' },
        { status: 404 }
      );
    }

    if (!channel.enabled) {
      return NextResponse.json({
        ok: false,
        success: false,
        message: 'Channel is disabled. Enable it first to send test notifications.',
      });
    }

    let testResult: { success: boolean; message: string };

    switch (channel.type) {
      case 'webhook':
        testResult = await simulateWebhookTest(channel.config.url || '');
        break;
      case 'email':
        testResult = await simulateEmailTest(channel.config.email || '');
        break;
      case 'telegram':
        testResult = await simulateTelegramTest(
          channel.config.botToken || '',
          channel.config.chatId || ''
        );
        break;
      case 'slack':
        testResult = await simulateWebhookTest(channel.config.url || '');
        break;
      default:
        testResult = {
          success: false,
          message: `Unsupported channel type: ${channel.type}`,
        };
    }

    channelsStore[channelIndex] = {
      id: channel.id,
      name: channel.name,
      type: channel.type,
      enabled: channel.enabled,
      config: channel.config,
      description: channel.description,
      createdAt: channel.createdAt,
      updatedAt: new Date().toISOString(),
      lastUsedAt: channel.lastUsedAt,
      testStatus: testResult.success ? 'success' : 'failed',
      testMessage: testResult.message,
    };

    return NextResponse.json({
      ok: true,
      success: testResult.success,
      message: testResult.message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to test notification channel', { error });
    return NextResponse.json(
      { ok: false, success: false, message: 'Failed to test notification channel' },
      { status: 500 }
    );
  }
}
