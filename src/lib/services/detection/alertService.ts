/**
 * 告警服务 - 负责发送各种渠道的告警通知
 *
 * 单一职责：处理告警通知的发送
 */

import { logger } from '@/lib/logger';
import { notifyAlert, type NotificationChannel } from '@/server/notifications';
import type { ManipulationAlert } from '@/lib/types/security/detection';

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

  constructor(config: AlertServiceConfig) {
    this.config = config;
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

    // 发送通知
    const result = await notifyAlert(
      {
        title: `${alert.protocol} - ${alert.symbol}`,
        message: this.formatAlertMessage(alert),
        severity: this.mapSeverity(alert.severity),
        fingerprint: alertKey,
      },
      { channels },
    );

    // 记录结果
    if (result.success) {
      logger.info('Alert sent successfully', {
        alertKey,
        type: alert.type,
        severity: alert.severity,
        channels,
      });
    } else {
      logger.error('Some alert channels failed', {
        alertKey,
        failedChannels: result.channelResults.filter((r) => !r.success).map((r) => r.channel),
        errors: result.channelResults.filter((r) => !r.success).map((r) => r.error),
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
