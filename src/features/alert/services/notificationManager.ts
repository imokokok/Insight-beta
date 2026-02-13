/**
 * Notification Manager - 通知管理器
 *
 * 统一管理所有通知渠道的配置、发送和历史记录
 * 支持 Webhook、PagerDuty、Slack、Email、Telegram、Discord 等多种渠道
 */

import { logger } from '@/shared/logger';

import { NotificationService } from './notifications/notificationService';

import type {
  AlertNotification,
  NotificationChannel,
  NotificationConfig,
  NotificationResult,
  AlertSeverity,
} from './notifications/types';

// 告警历史记录
export interface AlertHistoryRecord {
  id: string;
  alertId: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  channels: NotificationChannel[];
  results: NotificationResult[];
  timestamp: Date;
  protocol?: string;
  chain?: string;
  symbol?: string;
  acknowledged?: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

// 渠道健康状态
export interface ChannelHealthStatus {
  channel: NotificationChannel;
  isHealthy: boolean;
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
  failureCount: number;
  successRate: number;
  averageLatencyMs: number;
}

// 通知管理器配置
export interface NotificationManagerConfig {
  // 渠道配置
  channels: {
    [key: string]: NotificationConfig;
  };
  // 严重性级别对应的渠道
  severityChannels: {
    critical: string[];
    warning: string[];
    info: string[];
  };
  // 告警冷却期（毫秒）
  cooldownMs: number;
  // 最大历史记录数
  maxHistorySize: number;
  // 是否启用去重
  deduplicationEnabled: boolean;
  // 去重窗口（毫秒）
  deduplicationWindowMs: number;
}

export class NotificationManager {
  private notificationService: NotificationService;
  private config: NotificationManagerConfig;
  private alertHistory: AlertHistoryRecord[] = [];
  private lastAlertTime: Map<string, number> = new Map();
  private recentAlerts: Map<string, number> = new Map(); // 用于去重
  private channelHealth: Map<NotificationChannel, ChannelHealthStatus> = new Map();

  constructor(config: NotificationManagerConfig) {
    this.config = config;
    this.notificationService = new NotificationService();
    this.initializeChannels();
    this.initializeHealthTracking();
  }

  /**
   * 初始化所有通知渠道
   */
  private initializeChannels(): void {
    for (const [name, channelConfig] of Object.entries(this.config.channels)) {
      try {
        this.notificationService.registerChannel(name, channelConfig);
        logger.info(`Notification channel registered: ${name}`);
      } catch (error) {
        logger.error(`Failed to register channel: ${name}`, { error });
      }
    }
  }

  /**
   * 初始化渠道健康追踪
   */
  private initializeHealthTracking(): void {
    const channels: NotificationChannel[] = [
      'email',
      'sms',
      'webhook',
      'slack',
      'discord',
      'telegram',
      'pagerduty',
    ];
    for (const channel of channels) {
      this.channelHealth.set(channel, {
        channel,
        isHealthy: true,
        failureCount: 0,
        successRate: 1,
        averageLatencyMs: 0,
      });
    }
  }

  /**
   * 发送告警通知
   */
  async sendAlert(notification: AlertNotification): Promise<AlertHistoryRecord> {
    const alertKey = this.generateAlertKey(notification);

    // 检查冷却期
    if (this.isInCooldown(alertKey)) {
      logger.debug('Alert in cooldown, skipping', { alertKey });
      throw new Error('Alert in cooldown period');
    }

    // 检查去重
    if (this.config.deduplicationEnabled && this.isDuplicate(alertKey)) {
      logger.debug('Duplicate alert detected, skipping', { alertKey });
      throw new Error('Duplicate alert');
    }

    // 获取该严重性级别对应的渠道
    const channelNames = this.config.severityChannels[notification.severity] || [];

    if (channelNames.length === 0) {
      logger.warn('No channels configured for severity', {
        severity: notification.severity,
        alertId: notification.alertId,
      });
      throw new Error('No notification channels configured');
    }

    // 发送通知到所有配置的渠道
    const results: NotificationResult[] = [];
    const channels: NotificationChannel[] = [];

    for (const channelName of channelNames) {
      const config = this.config.channels[channelName];
      if (!config) {
        logger.warn(`Channel not found: ${channelName}`);
        continue;
      }

      try {
        const result = await this.notificationService.sendNotification(channelName, notification);
        results.push(result);
        channels.push(config.type);

        // 更新渠道健康状态
        this.updateChannelHealth(config.type, result);
      } catch (error) {
        logger.error(`Failed to send notification via ${channelName}`, {
          error,
          alertId: notification.alertId,
        });
        results.push({
          success: false,
          channel: config.type,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
          durationMs: 0,
        });
        this.updateChannelHealth(config.type, {
          success: false,
          channel: config.type,
          timestamp: new Date(),
          durationMs: 0,
        });
      }
    }

    // 更新最后告警时间
    this.lastAlertTime.set(alertKey, Date.now());
    this.recentAlerts.set(alertKey, Date.now());

    // 创建历史记录
    const historyRecord: AlertHistoryRecord = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      alertId: notification.alertId,
      severity: notification.severity,
      title: notification.title,
      message: notification.message,
      channels,
      results,
      timestamp: new Date(),
      protocol: notification.protocol,
      chain: notification.chain,
      symbol: notification.symbol,
    };

    // 添加到历史记录
    this.addToHistory(historyRecord);

    // 记录结果
    const successCount = results.filter((r) => r.success).length;
    logger.info(`Alert sent`, {
      alertId: notification.alertId,
      severity: notification.severity,
      channels: channelNames,
      successCount,
      failureCount: results.length - successCount,
    });

    return historyRecord;
  }

  /**
   * 批量发送告警
   */
  async sendBatchAlerts(notifications: AlertNotification[]): Promise<AlertHistoryRecord[]> {
    const results: AlertHistoryRecord[] = [];

    for (const notification of notifications) {
      try {
        const record = await this.sendAlert(notification);
        results.push(record);
      } catch (error) {
        logger.error('Failed to send batch alert', {
          alertId: notification.alertId,
          error,
        });
      }
    }

    return results;
  }

  /**
   * 测试通知渠道
   */
  async testChannel(channelName: string): Promise<NotificationResult> {
    const testNotification: AlertNotification = {
      id: `test-${Date.now()}`,
      alertId: `test-${Date.now()}`,
      severity: 'info',
      title: 'Test Notification',
      message: 'This is a test notification from Oracle Monitor Platform',
      details: { test: true },
      timestamp: new Date(),
    };

    return this.notificationService.sendNotification(channelName, testNotification);
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const record = this.alertHistory.find((r) => r.alertId === alertId);
    if (!record) return false;

    record.acknowledged = true;
    record.acknowledgedAt = new Date();
    record.acknowledgedBy = acknowledgedBy;

    logger.info('Alert acknowledged', { alertId, acknowledgedBy });
    return true;
  }

  /**
   * 获取告警历史
   */
  getAlertHistory(options?: {
    severity?: AlertSeverity;
    protocol?: string;
    chain?: string;
    symbol?: string;
    startTime?: Date;
    endTime?: Date;
    acknowledged?: boolean;
    limit?: number;
    offset?: number;
  }): AlertHistoryRecord[] {
    let filtered = [...this.alertHistory];

    if (options?.severity) {
      filtered = filtered.filter((r) => r.severity === options.severity);
    }
    if (options?.protocol) {
      filtered = filtered.filter((r) => r.protocol === options.protocol);
    }
    if (options?.chain) {
      filtered = filtered.filter((r) => r.chain === options.chain);
    }
    if (options?.symbol) {
      filtered = filtered.filter((r) => r.symbol === options.symbol);
    }
    if (options?.startTime) {
      filtered = filtered.filter((r) => r.timestamp >= options.startTime!);
    }
    if (options?.endTime) {
      filtered = filtered.filter((r) => r.timestamp <= options.endTime!);
    }
    if (options?.acknowledged !== undefined) {
      filtered = filtered.filter((r) => r.acknowledged === options.acknowledged);
    }

    // 排序（最新的在前）
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // 分页
    const offset = options?.offset || 0;
    const limit = options?.limit || filtered.length;
    return filtered.slice(offset, offset + limit);
  }

  /**
   * 获取渠道健康状态
   */
  getChannelHealth(): ChannelHealthStatus[] {
    return Array.from(this.channelHealth.values());
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalAlerts: number;
    acknowledgedAlerts: number;
    pendingAlerts: number;
    channelHealth: ChannelHealthStatus[];
    recentAlertsCount: number;
  } {
    const now = Date.now();
    const recentWindow = 24 * 60 * 60 * 1000; // 24小时

    return {
      totalAlerts: this.alertHistory.length,
      acknowledgedAlerts: this.alertHistory.filter((r) => r.acknowledged).length,
      pendingAlerts: this.alertHistory.filter((r) => !r.acknowledged).length,
      channelHealth: this.getChannelHealth(),
      recentAlertsCount: this.alertHistory.filter((r) => now - r.timestamp.getTime() < recentWindow)
        .length,
    };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<NotificationManagerConfig>): void {
    this.config = { ...this.config, ...config };
    this.notificationService = new NotificationService();
    this.initializeChannels();
    logger.info('Notification manager config updated');
  }

  /**
   * 清理过期数据
   */
  cleanup(): void {
    const now = Date.now();

    // 清理历史记录
    if (this.alertHistory.length > this.config.maxHistorySize) {
      this.alertHistory = this.alertHistory.slice(-this.config.maxHistorySize);
    }

    // 清理去重记录
    for (const [key, timestamp] of this.recentAlerts.entries()) {
      if (now - timestamp > this.config.deduplicationWindowMs) {
        this.recentAlerts.delete(key);
      }
    }

    // 清理冷却记录
    for (const [key, timestamp] of this.lastAlertTime.entries()) {
      if (now - timestamp > this.config.cooldownMs) {
        this.lastAlertTime.delete(key);
      }
    }
  }

  /**
   * 重置所有数据
   */
  reset(): void {
    this.alertHistory = [];
    this.lastAlertTime.clear();
    this.recentAlerts.clear();
    this.initializeHealthTracking();
    logger.info('Notification manager reset');
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private generateAlertKey(notification: AlertNotification): string {
    return `${notification.protocol}:${notification.chain}:${notification.symbol}:${notification.severity}`;
  }

  private isInCooldown(alertKey: string): boolean {
    const lastTime = this.lastAlertTime.get(alertKey);
    if (!lastTime) return false;
    return Date.now() - lastTime < this.config.cooldownMs;
  }

  private isDuplicate(alertKey: string): boolean {
    const lastTime = this.recentAlerts.get(alertKey);
    if (!lastTime) return false;
    return Date.now() - lastTime < this.config.deduplicationWindowMs;
  }

  private addToHistory(record: AlertHistoryRecord): void {
    this.alertHistory.push(record);

    // 限制历史记录大小
    if (this.alertHistory.length > this.config.maxHistorySize) {
      this.alertHistory = this.alertHistory.slice(-this.config.maxHistorySize);
    }
  }

  private updateChannelHealth(channel: NotificationChannel, result: NotificationResult): void {
    const health = this.channelHealth.get(channel);
    if (!health) return;

    if (result.success) {
      health.lastSuccessAt = new Date();
      health.isHealthy = true;
    } else {
      health.lastFailureAt = new Date();
      health.failureCount++;
      // 如果连续失败超过5次，标记为不健康
      if (health.failureCount > 5) {
        health.isHealthy = false;
      }
    }

    // 更新平均延迟
    const totalLatency = health.averageLatencyMs * (health.failureCount + (result.success ? 1 : 0));
    health.averageLatencyMs = (totalLatency + result.durationMs) / (health.failureCount + 1);

    // 更新成功率
    const totalAttempts = this.alertHistory.length;
    const successCount = this.alertHistory.filter((r) =>
      r.results.some((res) => res.channel === channel && res.success),
    ).length;
    health.successRate = totalAttempts > 0 ? successCount / totalAttempts : 1;

    this.channelHealth.set(channel, health);
  }
}

// 导出单例实例（使用默认配置）
export const notificationManager = new NotificationManager({
  channels: {},
  severityChannels: {
    critical: [],
    warning: [],
    info: [],
  },
  cooldownMs: 5 * 60 * 1000, // 5分钟
  maxHistorySize: 10000,
  deduplicationEnabled: true,
  deduplicationWindowMs: 60 * 1000, // 1分钟
});
