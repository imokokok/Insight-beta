/**
 * 测试通知 API
 *
 * 用于测试各个通知渠道是否配置正确
 * 使用新的 NotificationService 架构
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { z } from 'zod';

import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import { NotificationService, type NotificationChannel } from '@/server/alerts/notifications';
import { requireAdminWithToken } from '@/server/apiResponse';

const testNotificationSchema = z.object({
  channel: z.enum(['email', 'webhook', 'slack', 'telegram']),
  recipient: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminWithToken(request);
    if (auth) return auth;

    const body = await request.json();
    const result = testNotificationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: result.error.format() },
        { status: 400 },
      );
    }

    const { channel, recipient } = result.data;

    // 创建通知服务实例
    const notificationService = new NotificationService();

    // 根据渠道类型注册配置
    const channelResult = registerChannel(notificationService, channel, recipient);
    if (!channelResult.success) {
      return NextResponse.json({ error: channelResult.error }, { status: 400 });
    }

    // 构建测试通知
    const notification = {
      id: `test-${Date.now()}`,
      alertId: `test-${Date.now()}`,
      severity: 'info' as const,
      title: 'Test Notification',
      message:
        "This is a test notification from OracleMonitor. If you're seeing this, your notification system is working correctly!",
      details: {
        channel,
        recipient: recipient || 'default',
      },
      timestamp: new Date(),
    };

    // 发送测试通知
    const sendResult = await notificationService.sendNotification(channel, notification);

    if (!sendResult.success) {
      return NextResponse.json(
        {
          error: 'Failed to send notification',
          message: sendResult.error,
          channel,
        },
        { status: 500 },
      );
    }

    logger.info('Test notification sent', { channel, recipient });

    return NextResponse.json({
      success: true,
      message: `Test notification sent via ${channel}`,
      channel,
      recipient: recipient || 'default',
      durationMs: sendResult.durationMs,
    });
  } catch (error) {
    logger.error('Failed to send test notification', { error });
    return NextResponse.json(
      {
        error: 'Failed to send test notification',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * 注册通知渠道配置
 */
function registerChannel(
  service: NotificationService,
  channel: NotificationChannel,
  recipient?: string,
): { success: boolean; error?: string } {
  switch (channel) {
    case 'webhook':
      if (!env.INSIGHT_WEBHOOK_URL) {
        return { success: false, error: 'Webhook URL not configured' };
      }
      service.registerChannel('webhook', {
        type: 'webhook',
        url: env.INSIGHT_WEBHOOK_URL,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeoutMs: Number(env.INSIGHT_WEBHOOK_TIMEOUT_MS) || 10000,
        retryCount: 3,
      });
      break;

    case 'slack':
      if (!env.INSIGHT_SLACK_WEBHOOK_URL) {
        return { success: false, error: 'Slack webhook URL not configured' };
      }
      service.registerChannel('slack', {
        type: 'slack',
        webhookUrl: env.INSIGHT_SLACK_WEBHOOK_URL,
      });
      break;

    case 'email':
      if (!env.INSIGHT_SMTP_HOST || !env.INSIGHT_SMTP_USER) {
        return { success: false, error: 'Email SMTP not configured' };
      }
      service.registerChannel('email', {
        type: 'email',
        smtpHost: env.INSIGHT_SMTP_HOST,
        smtpPort: Number(env.INSIGHT_SMTP_PORT) || 587,
        username: env.INSIGHT_SMTP_USER,
        password: env.INSIGHT_SMTP_PASS || '',
        fromAddress: env.INSIGHT_FROM_EMAIL || env.INSIGHT_SMTP_USER,
        toAddresses: recipient
          ? [recipient]
          : env.INSIGHT_DEFAULT_EMAIL
            ? [env.INSIGHT_DEFAULT_EMAIL]
            : [],
        useTLS: (Number(env.INSIGHT_SMTP_PORT) || 587) === 465,
      });
      break;

    case 'telegram':
      if (!env.INSIGHT_TELEGRAM_BOT_TOKEN || !env.INSIGHT_TELEGRAM_CHAT_ID) {
        return { success: false, error: 'Telegram bot not configured' };
      }
      service.registerChannel('telegram', {
        type: 'telegram',
        botToken: env.INSIGHT_TELEGRAM_BOT_TOKEN,
        chatIds: recipient ? [recipient] : [env.INSIGHT_TELEGRAM_CHAT_ID],
        parseMode: 'HTML',
      });
      break;

    default:
      return { success: false, error: `Unsupported channel: ${channel}` };
  }

  return { success: true };
}
