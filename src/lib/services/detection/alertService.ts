/**
 * 告警服务 - 负责发送各种渠道的告警通知
 *
 * 单一职责：处理告警通知的发送
 * 使用 NotificationManager 架构，支持告警历史记录和渠道健康监控
 */

import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import type { ManipulationAlert } from '@/lib/types/security/detection';
import {
  notificationManager,
  type NotificationManagerConfig,
} from '@/server/alerts/notificationManager';
import type {
  NotificationConfig,
  EmailConfig,
  WebhookConfig,
  SlackConfig,
  TelegramConfig,
  PagerDutyConfig,
} from '@/server/alerts/notifications/types';

export interface AlertChannelConfig {
  email?: boolean;
  webhook?: boolean;
  slack?: boolean;
  telegram?: boolean;
  pagerduty?: boolean;
  discord?: boolean;
}

export interface AlertServiceConfig {
  channels: AlertChannelConfig;
  cooldownMs: number;
  deduplicationEnabled?: boolean;
  deduplicationWindowMs?: number;
}

/**
 * 告警服务
 * 
 * 封装 NotificationManager，提供更简单的告警发送接口
 * 同时保持与现有代码的兼容性
 */
export class AlertService {
  private config: AlertServiceConfig;

  constructor(config: AlertServiceConfig) {
    this.config = config;
    this.initializeNotificationManager();
  }

  /**
   * 初始化 NotificationManager
   */
  private initializeNotificationManager(): void {
    const channels: Record<string, NotificationConfig> = {};
    const severityChannels = {
      critical: [] as string[],
      warning: [] as string[],
      info: [] as string[],
    };

    // Webhook
    if (this.config.channels.webhook && env.INSIGHT_WEBHOOK_URL) {
      channels['webhook'] = {
        type: 'webhook',
        url: env.INSIGHT_WEBHOOK_URL,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeoutMs: env.INSIGHT_WEBHOOK_TIMEOUT_MS || 5000,
        retryCount: 3,
      } as WebhookConfig;
      severityChannels.critical.push('webhook');
      severityChannels.warning.push('webhook');
    }

    // Slack
    if (this.config.channels.slack && env.INSIGHT_SLACK_WEBHOOK_URL) {
      channels['slack'] = {
        type: 'slack',
        webhookUrl: env.INSIGHT_SLACK_WEBHOOK_URL,
      } as SlackConfig;
      severityChannels.critical.push('slack');
      severityChannels.warning.push('slack');
      severityChannels.info.push('slack');
    }

    // Email
    if (this.config.channels.email && env.INSIGHT_SMTP_HOST && env.INSIGHT_SMTP_USER) {
      channels['email'] = {
        type: 'email',
        smtpHost: env.INSIGHT_SMTP_HOST,
        smtpPort: env.INSIGHT_SMTP_PORT || 587,
        username: env.INSIGHT_SMTP_USER,
        password: env.INSIGHT_SMTP_PASS || '',
        fromAddress: env.INSIGHT_FROM_EMAIL || env.INSIGHT_SMTP_USER,
        toAddresses: env.INSIGHT_DEFAULT_EMAIL ? [env.INSIGHT_DEFAULT_EMAIL] : [],
        useTLS: env.INSIGHT_SMTP_PORT === 465,
      } as EmailConfig;
      severityChannels.critical.push('email');
      severityChannels.warning.push('email');
    }

    // Telegram
    if (
      this.config.channels.telegram &&
      env.INSIGHT_TELEGRAM_BOT_TOKEN &&
      env.INSIGHT_TELEGRAM_CHAT_ID
    ) {
      channels['telegram'] = {
        type: 'telegram',
        botToken: env.INSIGHT_TELEGRAM_BOT_TOKEN,
        chatIds: [env.INSIGHT_TELEGRAM_CHAT_ID],
        parseMode: 'HTML',
      } as TelegramConfig;
      severityChannels.critical.push('telegram');
      severityChannels.warning.push('telegram');
    }

    // PagerDuty
    if (this.config.channels.pagerduty && env.INSIGHT_PAGERDUTY_KEY) {
      channels['pagerduty'] = {
        type: 'pagerduty',
        integrationKey: env.INSIGHT_PAGERDUTY_KEY,
        severity: 'critical',
      } as PagerDutyConfig;
      severityChannels.critical.push('pagerduty');
    }

    const managerConfig: NotificationManagerConfig = {
      channels,
      severityChannels,
      cooldownMs: this.config.cooldownMs,
      maxHistorySize: 10000,
      deduplicationEnabled: this.config.deduplicationEnabled ?? true,
      deduplicationWindowMs: this.config.deduplicationWindowMs ?? 60000,
    };

    notificationManager.updateConfig(managerConfig);
    logger.info('AlertService initialized with NotificationManager');
  }

  /**
   * 发送告警
   */
  async sendAlert(alert: ManipulationAlert): Promise<void> {
    const alertKey = `${alert.protocol}:${alert.symbol}:${alert.type}`;

    try {
      await notificationManager.sendAlert({
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
      });

      logger.info('Alert sent successfully', {
        alertKey,
        type: alert.type,
        severity: alert.severity,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Alert in cooldown period') {
        logger.debug('Alert in cooldown, skipping', { alertKey });
        return;
      }
      if (error instanceof Error && error.message === 'Duplicate alert') {
        logger.debug('Duplicate alert detected, skipping', { alertKey });
        return;
      }
      logger.error('Failed to send alert', { error, alertKey });
      throw error;
    }
  }

  /**
   * 批量发送告警
   */
  async sendBatchAlerts(alerts: ManipulationAlert[]): Promise<void> {
    for (const alert of alerts) {
      try {
        await this.sendAlert(alert);
      } catch (error) {
        logger.error('Failed to send batch alert', { error, alert });
      }
    }
  }

  /**
   * 测试通知渠道
   */
  async testChannel(channelName: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await notificationManager.testChannel(channelName);
      return {
        success: result.success,
        message: result.success
          ? `测试通知已成功发送到 ${channelName}`
          : `测试通知发送到 ${channelName} 失败: ${result.error}`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '测试失败',
      };
    }
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    return notificationManager.acknowledgeAlert(alertId, acknowledgedBy);
  }

  /**
   * 获取告警历史
   */
  getAlertHistory(options?: Parameters<typeof notificationManager.getAlertHistory>[0]) {
    return notificationManager.getAlertHistory(options);
  }

  /**
   * 获取渠道健康状态
   */
  getChannelHealth() {
    return notificationManager.getChannelHealth();
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return notificationManager.getStats();
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<AlertServiceConfig>): void {
    this.config = { ...this.config, ...config };
    this.initializeNotificationManager();
  }

  /**
   * 重置告警历史
   */
  resetHistory(): void {
    notificationManager.reset();
    logger.info('Alert history reset');
  }

  /**
   * 清理过期数据
   */
  cleanup(): void {
    notificationManager.cleanup();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private formatAlertMessage(alert: ManipulationAlert): string {
    const lines: string[] = [
      `类型: ${alert.type}`,
      `协议: ${alert.protocol}`,
      `交易对: ${alert.symbol}`,
      `严重级别: ${alert.severity}`,
    ];

    if (alert.details) {
      lines.push(`详情: ${JSON.stringify(alert.details, null, 2)}`);
    }

    if (alert.detectedAt) {
      lines.push(`时间: ${new Date(alert.detectedAt).toISOString()}`);
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
}

// 导出单例实例
export const alertService = new AlertService({
  channels: {
    email: false,
    webhook: false,
    slack: false,
    telegram: false,
    pagerduty: false,
    discord: false,
  },
  cooldownMs: 5 * 60 * 1000, // 默认 5 分钟冷却期
  deduplicationEnabled: true,
  deduplicationWindowMs: 60 * 1000,
});
