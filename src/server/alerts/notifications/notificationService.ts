/**
 * Notification Service
 *
 * 通知服务主类
 */

import { logger } from '@/lib/logger';

import { sendEmailNotification } from './email';
import { sendSMSNotification } from './sms';

import type {
  NotificationChannel,
  AlertSeverity,
  AlertNotification,
  NotificationResult,
  NotificationConfig,
  EmailConfig,
  SMSConfig,
  WebhookConfig,
  SlackConfig,
  DiscordConfig,
  TelegramConfig,
  PagerDutyConfig,
} from './types';

export class NotificationService {
  private configs: Map<string, NotificationConfig> = new Map();

  /**
   * 注册通知渠道配置
   */
  registerChannel(name: string, config: NotificationConfig): void {
    this.configs.set(name, config);
    logger.info(`Registered notification channel: ${name} (${config.type})`);
  }

  /**
   * 发送通知到指定渠道
   */
  async sendNotification(
    channelName: string,
    notification: AlertNotification,
  ): Promise<NotificationResult> {
    const config = this.configs.get(channelName);
    if (!config) {
      return {
        success: false,
        channel: 'email',
        error: `Channel ${channelName} not found`,
        timestamp: new Date(),
        durationMs: 0,
      };
    }

    logger.info(`Sending notification via ${channelName}`, {
      alertId: notification.alertId,
      severity: notification.severity,
    });

    switch (config.type) {
      case 'email':
        return sendEmailNotification(notification, config as EmailConfig);
      case 'sms':
        return sendSMSNotification(notification, config as SMSConfig);
      case 'webhook':
        return sendWebhookNotification(notification, config as WebhookConfig);
      case 'slack':
        return sendSlackNotification(notification, config as SlackConfig);
      case 'discord':
        return sendDiscordNotification(notification, config as DiscordConfig);
      case 'telegram':
        return sendTelegramNotification(notification, config as TelegramConfig);
      case 'pagerduty':
        return sendPagerDutyNotification(notification, config as PagerDutyConfig);
      default: {
        const unknownConfig = config as NotificationConfig;
        return {
          success: false,
          channel: unknownConfig.type as NotificationChannel,
          error: `Unknown channel type: ${unknownConfig.type}`,
          timestamp: new Date(),
          durationMs: 0,
        };
      }
    }
  }

  /**
   * 广播通知到所有已注册的渠道
   */
  async broadcastNotification(
    notification: AlertNotification,
    filter?: (config: NotificationConfig) => boolean,
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const [name, config] of this.configs) {
      if (filter && !filter(config)) {
        continue;
      }

      const result = await this.sendNotification(name, notification);
      results.push(result);
    }

    return results;
  }

  /**
   * 根据严重性级别发送通知
   */
  async sendBySeverity(
    notification: AlertNotification,
    severityConfig: Record<AlertSeverity, string[]>,
  ): Promise<NotificationResult[]> {
    const channelNames = severityConfig[notification.severity] || [];
    const results: NotificationResult[] = [];

    for (const channelName of channelNames) {
      const result = await this.sendNotification(channelName, notification);
      results.push(result);
    }

    return results;
  }
}

// ============================================================================
// Placeholder implementations for other channels (to be moved to separate files)
// ============================================================================

async function sendWebhookNotification(
  notification: AlertNotification,
  config: WebhookConfig,
): Promise<NotificationResult> {
  const startTime = Date.now();
  let lastError: string | undefined;

  for (let attempt = 0; attempt < config.retryCount; attempt++) {
    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: JSON.stringify({
          id: notification.id,
          alertId: notification.alertId,
          severity: notification.severity,
          title: notification.title,
          message: notification.message,
          details: notification.details,
          timestamp: notification.timestamp.toISOString(),
          protocol: notification.protocol,
          chain: notification.chain,
          symbol: notification.symbol,
        }),
        signal: AbortSignal.timeout(config.timeoutMs),
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.status}`);
      }

      return {
        success: true,
        channel: 'webhook',
        messageId: `webhook-${Date.now()}`,
        timestamp: new Date(),
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < config.retryCount - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  return {
    success: false,
    channel: 'webhook',
    error: lastError,
    timestamp: new Date(),
    durationMs: Date.now() - startTime,
  };
}

async function sendSlackNotification(
  notification: AlertNotification,
  config: SlackConfig,
): Promise<NotificationResult> {
  const startTime = Date.now();

  try {
    const color = getSeverityColor(notification.severity);

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: config.channel,
        username: config.username || 'Oracle Monitor',
        icon_emoji: config.iconEmoji || ':warning:',
        attachments: [
          {
            color,
            title: notification.title,
            text: notification.message,
            fields: [
              {
                title: 'Severity',
                value: notification.severity.toUpperCase(),
                short: true,
              },
              {
                title: 'Time',
                value: notification.timestamp.toISOString(),
                short: true,
              },
            ],
            footer: 'Oracle Monitor Platform',
            ts: Math.floor(notification.timestamp.getTime() / 1000),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }

    return {
      success: true,
      channel: 'slack',
      messageId: `slack-${Date.now()}`,
      timestamp: new Date(),
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      channel: 'slack',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
      durationMs: Date.now() - startTime,
    };
  }
}

async function sendDiscordNotification(
  notification: AlertNotification,
  config: DiscordConfig,
): Promise<NotificationResult> {
  const startTime = Date.now();

  try {
    const color = getSeverityColorNumber(notification.severity);

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: config.username || 'Oracle Monitor',
        avatar_url: config.avatarUrl,
        embeds: [
          {
            title: notification.title,
            description: notification.message,
            color,
            fields: [
              {
                name: 'Severity',
                value: notification.severity.toUpperCase(),
                inline: true,
              },
              {
                name: 'Time',
                value: notification.timestamp.toISOString(),
                inline: true,
              },
            ],
            footer: {
              text: 'Oracle Monitor Platform',
            },
            timestamp: notification.timestamp.toISOString(),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    return {
      success: true,
      channel: 'discord',
      messageId: `discord-${Date.now()}`,
      timestamp: new Date(),
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      channel: 'discord',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
      durationMs: Date.now() - startTime,
    };
  }
}

async function sendTelegramNotification(
  notification: AlertNotification,
  config: TelegramConfig,
): Promise<NotificationResult> {
  const startTime = Date.now();

  try {
    const emoji = getSeverityEmoji(notification.severity);
    const text = formatTelegramMessage(notification, emoji, config.parseMode);

    const results = await Promise.all(
      config.chatIds.map(async (chatId) => {
        const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: config.parseMode,
          }),
        });

        if (!response.ok) {
          throw new Error(`Telegram API error: ${response.status}`);
        }

        return response.json();
      }),
    );

    return {
      success: true,
      channel: 'telegram',
      messageId: `telegram-${results[0]?.result?.message_id}`,
      timestamp: new Date(),
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      channel: 'telegram',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
      durationMs: Date.now() - startTime,
    };
  }
}

async function sendPagerDutyNotification(
  notification: AlertNotification,
  config: PagerDutyConfig,
): Promise<NotificationResult> {
  const startTime = Date.now();

  try {
    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routing_key: config.integrationKey,
        event_action: 'trigger',
        dedup_key: notification.alertId,
        payload: {
          summary: notification.title,
          severity: config.severity,
          source: 'oracle-monitor',
          custom_details: {
            message: notification.message,
            ...notification.details,
            protocol: notification.protocol,
            chain: notification.chain,
            symbol: notification.symbol,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`PagerDuty API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      channel: 'pagerduty',
      messageId: data.dedup_key,
      timestamp: new Date(),
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      channel: 'pagerduty',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
      durationMs: Date.now() - startTime,
    };
  }
}

// Utility functions
function getSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case 'critical':
      return '#dc3545';
    case 'warning':
      return '#ffc107';
    case 'info':
      return '#17a2b8';
    default:
      return '#6c757d';
  }
}

function getSeverityColorNumber(severity: AlertSeverity): number {
  switch (severity) {
    case 'critical':
      return 0xdc3545;
    case 'warning':
      return 0xffc107;
    case 'info':
      return 0x17a2b8;
    default:
      return 0x6c757d;
  }
}

function getSeverityEmoji(severity: AlertSeverity): string {
  switch (severity) {
    case 'critical':
      return '🚨';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    default:
      return '📢';
  }
}

function formatTelegramMessage(
  notification: AlertNotification,
  emoji: string,
  parseMode: 'HTML' | 'Markdown',
): string {
  if (parseMode === 'HTML') {
    return `
<b>${emoji} ${notification.title}</b>

<b>Severity:</b> ${notification.severity.toUpperCase()}
<b>Time:</b> ${notification.timestamp.toISOString()}

${notification.message}

${notification.protocol ? `<b>Protocol:</b> ${notification.protocol}\n` : ''}${
      notification.chain ? `<b>Chain:</b> ${notification.chain}\n` : ''
    }${notification.symbol ? `<b>Symbol:</b> ${notification.symbol}` : ''}
    `.trim();
  }

  return `
*${emoji} ${notification.title}*

*Severity:* ${notification.severity.toUpperCase()}
*Time:* ${notification.timestamp.toISOString()}

${notification.message}

${notification.protocol ? `*Protocol:* ${notification.protocol}\n` : ''}${
    notification.chain ? `*Chain:* ${notification.chain}\n` : ''
  }${notification.symbol ? `*Symbol:* ${notification.symbol}` : ''}
  `.trim();
}
