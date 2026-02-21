import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  getChannelById,
  updateChannelTestStatus,
} from '@/features/alerts/services/notificationChannelService';
import { logger } from '@/shared/logger';

const DEFAULT_TIMEOUT_MS = 10000;

function getTimeoutMs(envVar: string, defaultMs: number = DEFAULT_TIMEOUT_MS): number {
  const envValue = process.env[envVar];
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return defaultMs;
}

async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<{ success: boolean; message: string }> {
  if (!botToken || !chatId) {
    return {
      success: false,
      message: 'Invalid bot token or chat ID',
    };
  }

  const timeoutMs = getTimeoutMs('INSIGHT_TELEGRAM_TIMEOUT_MS');
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.description || `HTTP ${response.status}`;
      logger.error('Telegram API error', { status: response.status, error: errorMessage });
      return {
        success: false,
        message: `Telegram API error: ${errorMessage}`,
      };
    }

    return {
      success: true,
      message: 'Test message sent successfully to Telegram chat',
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        message: `Telegram request timed out after ${timeoutMs}ms`,
      };
    }
    logger.error('Failed to send Telegram message', { error });
    return {
      success: false,
      message: `Failed to send Telegram message: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function sendWebhookNotification(
  url: string,
  payload: Record<string, unknown>,
): Promise<{ success: boolean; message: string }> {
  if (!url) {
    return {
      success: false,
      message: 'Webhook URL is required',
    };
  }

  try {
    new URL(url);
  } catch {
    return {
      success: false,
      message: 'Invalid webhook URL format',
    };
  }

  const timeoutMs = getTimeoutMs('INSIGHT_WEBHOOK_TIMEOUT_MS');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Insight-Oracle-Monitor/1.0',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.error('Webhook request failed', { status: response.status, url });
      return {
        success: false,
        message: `Webhook returned HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      message: 'Test notification sent successfully to webhook endpoint',
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        message: `Webhook request timed out after ${timeoutMs}ms`,
      };
    }
    logger.error('Failed to send webhook notification', { error, url });
    return {
      success: false,
      message: `Failed to connect to webhook: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function sendSlackNotification(
  webhookUrl: string,
  text: string,
): Promise<{ success: boolean; message: string }> {
  if (!webhookUrl) {
    return {
      success: false,
      message: 'Slack webhook URL is required',
    };
  }

  const timeoutMs = getTimeoutMs('INSIGHT_SLACK_TIMEOUT_MS');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text,
            },
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.error('Slack webhook failed', { status: response.status });
      return {
        success: false,
        message: `Slack webhook returned HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      message: 'Test notification sent successfully to Slack',
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        message: `Slack request timed out after ${timeoutMs}ms`,
      };
    }
    logger.error('Failed to send Slack notification', { error });
    return {
      success: false,
      message: `Failed to send Slack notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function simulateEmailTest(email: string): Promise<{ success: boolean; message: string }> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  if (!email) {
    return {
      success: false,
      message: 'Email address is required',
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      success: false,
      message: 'Invalid email address format',
    };
  }

  const smtpConfigured =
    process.env.INSIGHT_SMTP_HOST && process.env.INSIGHT_SMTP_USER && process.env.INSIGHT_SMTP_PASS;

  if (smtpConfigured) {
    return {
      success: true,
      message: `Email configuration validated for ${email}. Note: Actual SMTP sending requires nodemailer or similar library installation.`,
    };
  }

  return {
    success: true,
    message: `Test email validated for ${email} (SMTP not configured - simulation mode)`,
  };
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const channel = await getChannelById(id);

    if (!channel) {
      return NextResponse.json(
        { ok: false, success: false, message: 'Channel not found' },
        { status: 404 },
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

    const testMessage = `🔔 <b>Insight Oracle Monitor - Test Notification</b>

This is a test message from Insight Oracle Monitor.
Channel: ${channel.name}
Time: ${new Date().toISOString()}

If you received this message, your notification channel is configured correctly.`;

    const webhookPayload = {
      event: 'test',
      channel: channel.name,
      channelType: channel.type,
      timestamp: new Date().toISOString(),
      message: 'Test notification from Insight Oracle Monitor',
    };

    switch (channel.type) {
      case 'webhook':
        testResult = await sendWebhookNotification(channel.config.url || '', webhookPayload);
        break;
      case 'email':
        testResult = await simulateEmailTest(channel.config.email || '');
        break;
      case 'telegram':
        testResult = await sendTelegramMessage(
          channel.config.botToken || '',
          channel.config.chatId || '',
          testMessage,
        );
        break;
      case 'slack':
        testResult = await sendSlackNotification(
          channel.config.url || '',
          testMessage.replace(/<[^>]*>/g, ''),
        );
        break;
      default:
        testResult = {
          success: false,
          message: `Unsupported channel type: ${channel.type}`,
        };
    }

    await updateChannelTestStatus(
      id,
      testResult.success ? 'success' : 'failed',
      testResult.message,
    );

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
      { status: 500 },
    );
  }
}
