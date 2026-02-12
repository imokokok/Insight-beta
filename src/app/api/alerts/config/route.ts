/**
 * 告警配置 API 路由
 *
 * 管理告警通知渠道配置
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { env } from '@/config/env';
import { logger } from '@/shared/logger';
import { notificationManager, type NotificationManagerConfig } from '@/services/alert/notificationManager';
import type { NotificationConfig } from '@/services/alert/notifications/types';

// 从环境变量加载配置
function loadConfigFromEnv(): NotificationManagerConfig {
  const channels: Record<string, NotificationConfig> = {};

  // Email
  if (env.INSIGHT_SMTP_HOST && env.INSIGHT_SMTP_USER) {
    channels['email'] = {
      type: 'email',
      smtpHost: env.INSIGHT_SMTP_HOST,
      smtpPort: env.INSIGHT_SMTP_PORT || 587,
      username: env.INSIGHT_SMTP_USER,
      password: env.INSIGHT_SMTP_PASS || '',
      fromAddress: env.INSIGHT_FROM_EMAIL || env.INSIGHT_SMTP_USER,
      toAddresses: env.INSIGHT_DEFAULT_EMAIL ? [env.INSIGHT_DEFAULT_EMAIL] : [],
      useTLS: env.INSIGHT_SMTP_PORT === 465,
    };
  }

  // Webhook
  if (env.INSIGHT_WEBHOOK_URL) {
    channels['webhook'] = {
      type: 'webhook',
      url: env.INSIGHT_WEBHOOK_URL,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeoutMs: env.INSIGHT_WEBHOOK_TIMEOUT_MS || 5000,
      retryCount: 3,
    };
  }

  // Slack
  if (env.INSIGHT_SLACK_WEBHOOK_URL) {
    channels['slack'] = {
      type: 'slack',
      webhookUrl: env.INSIGHT_SLACK_WEBHOOK_URL,
    };
  }

  // Telegram
  if (env.INSIGHT_TELEGRAM_BOT_TOKEN && env.INSIGHT_TELEGRAM_CHAT_ID) {
    channels['telegram'] = {
      type: 'telegram',
      botToken: env.INSIGHT_TELEGRAM_BOT_TOKEN,
      chatIds: [env.INSIGHT_TELEGRAM_CHAT_ID],
      parseMode: 'HTML',
    };
  }

  return {
    channels,
    severityChannels: {
      critical: Object.keys(channels),
      warning: Object.keys(channels).filter(k => k !== 'pagerduty'),
      info: ['email', 'slack'],
    },
    cooldownMs: 5 * 60 * 1000,
    maxHistorySize: 10000,
    deduplicationEnabled: true,
    deduplicationWindowMs: 60 * 1000,
  };
}

// 初始化配置
const config = loadConfigFromEnv();
notificationManager.updateConfig(config);

/**
 * GET /api/alerts/config
 * 获取当前告警配置
 */
export async function GET() {
  try {
    const channelHealth = notificationManager.getChannelHealth();
    const stats = notificationManager.getStats();

    return NextResponse.json({
      success: true,
      config: {
        channels: config.channels,
        severityChannels: config.severityChannels,
        cooldownMs: config.cooldownMs,
        deduplicationEnabled: config.deduplicationEnabled,
      },
      channelHealth,
      stats,
    });
  } catch (error) {
    logger.error('Failed to get alert config', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to get alert config' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/alerts/config
 * 更新告警配置
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channels, severityChannels, cooldownMs, deduplicationEnabled } = body;

    const newConfig: Partial<NotificationManagerConfig> = {};

    if (channels) newConfig.channels = channels;
    if (severityChannels) newConfig.severityChannels = severityChannels;
    if (cooldownMs !== undefined) newConfig.cooldownMs = cooldownMs;
    if (deduplicationEnabled !== undefined) newConfig.deduplicationEnabled = deduplicationEnabled;

    notificationManager.updateConfig(newConfig as NotificationManagerConfig);

    logger.info('Alert config updated');

    return NextResponse.json({
      success: true,
      message: 'Alert config updated successfully',
    });
  } catch (error) {
    logger.error('Failed to update alert config', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to update alert config' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/alerts/config
 * 重置告警配置
 */
export async function DELETE() {
  try {
    notificationManager.reset();

    logger.info('Alert config reset');

    return NextResponse.json({
      success: true,
      message: 'Alert config reset successfully',
    });
  } catch (error) {
    logger.error('Failed to reset alert config', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to reset alert config' },
      { status: 500 }
    );
  }
}
