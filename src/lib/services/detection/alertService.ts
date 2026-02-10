/**
 * 告警服务 - 负责发送各种渠道的告警通知
 *
 * 单一职责：处理告警通知的发送
 * 使用新的 NotificationService 架构
 */

import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import type { ManipulationAlert } from '@/lib/types/security/detection';
import {
  NotificationService,
  type NotificationChannel,
  type AlertNotification,
  type NotificationResult,
} from '@/server/alerts/notifications';

export interface AlertChannelConfig {
  email?: boolean;
  webhook?: boolean;
  slack?: boolean;
  telegram?: boolean;
}

export interface AlertServiceConfig {
  channels: AlertChannelConfig;
  cooldownMs: number;
}

export class AlertService {
  private config: AlertServiceConfig;
  private lastAlertTime: Map<string, number> = new Map();
  private notificationService: NotificationService;

  constructor(config: AlertServiceConfig) {
    this.config = config;
    this.notificationService = new NotificationService();
    this.initializeChannels();
  }

  /**
   * 初始化通知渠道配置
   */
  private initializeChannels(): void {
    // Webhook
    if (this.config.channels.webhook && env.INSIGHT_WEBHOOK_URL) {
      this.notificationService.registerChannel('webhook', {
        type: 'webhook',
        url: env.INSIGHT_WEBHOOK_URL,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeoutMs: Number(env.INSIGHT_WEBHOOK_TIMEOUT_MS) || 10000,
        retryCount: 3,
      });
    }

    // Slack
    if (this.config.channels.slack && env.INSIGHT_SLACK_WEBHOOK_URL) {
      this.notificationService.registerChannel('slack', {
        type: 'slack',
        webhookUrl: env.INSIGHT_SLACK_WEBHOOK_URL,
      });
    }

    // Email
    if (this.config.channels.email && env.INSIGHT_SMTP_HOST && env.INSIGHT_SMTP_USER) {
      this.notificationService.registerChannel('email', {
        type: 'email',
        smtpHost: env.INSIGHT_SMTP_HOST,
        smtpPort: Number(env.INSIGHT_SMTP_PORT) || 587,
        username: env.INSIGHT_SMTP_USER,
        password: env.INSIGHT_SMTP_PASS || '',
        fromAddress: env.INSIGHT_FROM_EMAIL || env.INSIGHT_SMTP_USER,
        toAddresses: env.INSIGHT_DEFAULT_EMAIL ? [env.INSIGHT_DEFAULT_EMAIL] : [],
        useTLS: (Number(env.INSIGHT_SMTP_PORT) || 587) === 465,
      });
    }

    // Telegram
    if (
      this.config.channels.telegram &&
      env.INSIGHT_TELEGRAM_BOT_TOKEN &&
      env.INSIGHT_TELEGRAM_CHAT_ID
    ) {
      this.notificationService.registerChannel('telegram', {
        type: 'telegram',
        botToken: env.INSIGHT_TELEGRAM_BOT_TOKEN,
        chatIds: [env.INSIGHT_TELEGRAM_CHAT_ID],
        parseMode: 'HTML',
      });
    }
  }

  async sendAlert(alert: ManipulationAlert): Promise<void> {
    const alertKey = `${alert.protocol}:${alert.symbol}:${alert.type}`;

    // 检查冷却期
    if (this.isInCooldown(alertKey)) {
      logger.debug('Alert in cooldown, skipping', { alertKey });
      return;
    }

    // 更新最后告警时间
    this.lastAlertTime.set(alertKey, Date.now());

    // 构建通知渠道列表
    const channels: NotificationChannel[] = [];
    if (this.config.channels.email) channels.push('email');
    if (this.config.channels.webhook) channels.push('webhook');
    if (this.config.channels.slack) channels.push('slack');
    if (this.config.channels.telegram) channels.push('telegram');

    if (channels.length === 0) {
      logger.debug('No notification channels configured, skipping', { alertKey });
      return;
    }

    // 构建通知对象
    const notification: AlertNotification = {
      id: alertKey,
      alertId: alertKey,
      severity: this.mapSeverity(alert.severity),
      title: `${alert.protocol} - ${alert.symbol}`,
      message: this.formatAlertMessage(alert),
      details: {
        protocol: alert.protocol,
        symbol: alert.symbol,
        type: alert.type,
        ...alert.details,
      },
      timestamp: new Date(),
      protocol: alert.protocol,
      symbol: alert.symbol,
    };

    // 发送通知到所有配置的渠道
    const results: NotificationResult[] = [];
    for (const channel of channels) {
      try {
        const result = await this.notificationService.sendNotification(channel, notification);
        results.push(result);
      } catch (error) {
        logger.error(`Failed to send notification via ${channel}`, { error, alertKey });
        results.push({
          success: false,
          channel,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
          durationMs: 0,
        });
      }
    }

    // 记录结果
    const allSuccessful = results.every((r) => r.success);
    if (allSuccessful) {
      logger.info('Alert sent successfully', {
        alertKey,
        type: alert.type,
        severity: alert.severity,
        channels,
      });
    } else {
      logger.error('Some alert channels failed', {
        alertKey,
        failedChannels: results.filter((r) => !r.success).map((r) => r.channel),
        errors: results.filter((r) => !r.success).map((r) => r.error),
      });
    }
  }

  private isInCooldown(alertKey: string): boolean {
    const lastTime = this.lastAlertTime.get(alertKey);
    if (!lastTime) return false;
    return Date.now() - lastTime < this.config.cooldownMs;
  }

  private formatAlertMessage(alert: ManipulationAlert): string {
    const lines: string[] = [
      `Type: ${alert.type}`,
      `Protocol: ${alert.protocol}`,
      `Symbol: ${alert.symbol}`,
      `Severity: ${alert.severity}`,
    ];

    if (alert.details) {
      lines.push(`Details: ${JSON.stringify(alert.details, null, 2)}`);
    }

    if (alert.detectedAt) {
      lines.push(`Time: ${new Date(alert.detectedAt).toISOString()}`);
    }

    return lines.join('\n');
  }

  private mapSeverity(severity: ManipulationAlert['severity']): 'info' | 'warning' | 'critical' {
    switch (severity) {
      case 'low':
        return 'info';
      case 'medium':
        return 'warning';
      case 'high':
      case 'critical':
        return 'critical';
      default:
        return 'info';
    }
  }

  updateConfig(config: Partial<AlertServiceConfig>): void {
    this.config = { ...this.config, ...config };
    // 重新初始化渠道
    this.notificationService = new NotificationService();
    this.initializeChannels();
  }

  /**
   * 获取告警统计信息
   */
  getStats(): {
    totalAlerts: number;
    cooldownActive: number;
    channels: AlertChannelConfig;
  } {
    const now = Date.now();
    const cooldownActive = Array.from(this.lastAlertTime.entries()).filter(
      ([, lastTime]) => now - lastTime < this.config.cooldownMs,
    ).length;

    return {
      totalAlerts: this.lastAlertTime.size,
      cooldownActive,
      channels: this.config.channels,
    };
  }

  /**
   * 重置告警历史
   */
  resetHistory(): void {
    this.lastAlertTime.clear();
    logger.info('Alert history reset');
  }
}

// 导出单例实例
export const alertService = new AlertService({
  channels: {
    email: false,
    webhook: false,
    slack: false,
    telegram: false,
  },
  cooldownMs: 5 * 60 * 1000, // 默认 5 分钟冷却期
});
