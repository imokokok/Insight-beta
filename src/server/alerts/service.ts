/**
 * Alert Management Service
 *
 * 告警管理服务
 * - 告警抑制和去重
 * - 告警升级策略
 * - 告警通知路由
 * - 告警历史管理
 */

import { logger } from '@/lib/logger';
import type { AnomalySeverity } from '@/server/security/anomalyDetectionService';
import type {
  Alert,
  AlertStatus,
  SuppressionRule,
  EscalationPolicy,
  EscalationLevel,
  AlertStats,
} from './types';
import {
  AlertSuppressionManager,
  AlertEscalationManager,
  AlertDeduplicationManager,
} from './managers';

export class AlertManagementService {
  private alerts: Map<string, Alert> = new Map();
  private suppressionManager = new AlertSuppressionManager();
  private escalationManager: AlertEscalationManager;
  private deduplicationManager = new AlertDeduplicationManager();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.escalationManager = new AlertEscalationManager(this.handleEscalation.bind(this));
    this.startCleanupTimer();
    this.initializeDefaultPolicies();
  }

  /**
   * 创建告警
   */
  createAlert(
    alertData: Omit<
      Alert,
      | 'id'
      | 'createdAt'
      | 'updatedAt'
      | 'escalationLevel'
      | 'escalationHistory'
      | 'notificationHistory'
      | 'status'
    >,
  ): Alert | null {
    // 检查去重
    const duplicateCheck = this.deduplicationManager.checkDuplicate(alertData);
    if (duplicateCheck.isDuplicate) {
      logger.debug(`Duplicate alert detected, count: ${duplicateCheck.count}`);
      return null;
    }

    // 检查抑制
    const suppressionCheck = this.suppressionManager.shouldSuppress(alertData);
    if (suppressionCheck.suppressed) {
      logger.info(
        `Alert suppressed by rule ${suppressionCheck.ruleId}: ${suppressionCheck.reason}`,
      );
      return null;
    }

    // 创建告警
    const alert: Alert = {
      ...alertData,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      escalationLevel: 0,
      escalationHistory: [],
      notificationHistory: [],
    };

    this.alerts.set(alert.id, alert);
    logger.info(`Alert created: ${alert.id} - ${alert.title}`);

    // 启动升级流程
    this.escalationManager.startEscalation(alert);

    return alert;
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): Alert | null {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;
    alert.updatedAt = new Date();

    this.escalationManager.cancelEscalation(alertId);

    logger.info(`Alert ${alertId} acknowledged by ${acknowledgedBy}`);
    return alert;
  }

  /**
   * 解决告警
   */
  resolveAlert(alertId: string, resolvedBy: string): Alert | null {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.resolvedBy = resolvedBy;
    alert.updatedAt = new Date();

    this.escalationManager.cancelEscalation(alertId);

    logger.info(`Alert ${alertId} resolved by ${resolvedBy}`);
    return alert;
  }

  /**
   * 获取告警
   */
  getAlert(alertId: string): Alert | undefined {
    return this.alerts.get(alertId);
  }

  /**
   * 获取所有告警
   */
  getAlerts(filters?: {
    status?: AlertStatus;
    severity?: AnomalySeverity;
    source?: string;
    symbol?: string;
  }): Alert[] {
    let alerts = Array.from(this.alerts.values());

    if (filters) {
      if (filters.status) {
        alerts = alerts.filter((a) => a.status === filters.status);
      }
      if (filters.severity) {
        alerts = alerts.filter((a) => a.severity === filters.severity);
      }
      if (filters.source) {
        alerts = alerts.filter((a) => a.source === filters.source);
      }
      if (filters.symbol) {
        alerts = alerts.filter((a) => a.symbol === filters.symbol);
      }
    }

    return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 添加抑制规则
   */
  addSuppressionRule(rule: Omit<SuppressionRule, 'id' | 'createdAt'>): SuppressionRule {
    return this.suppressionManager.addRule(rule);
  }

  /**
   * 删除抑制规则
   */
  removeSuppressionRule(ruleId: string): boolean {
    return this.suppressionManager.removeRule(ruleId);
  }

  /**
   * 获取抑制规则
   */
  getSuppressionRules(): SuppressionRule[] {
    return this.suppressionManager.getRules();
  }

  /**
   * 添加升级策略
   */
  addEscalationPolicy(policy: Omit<EscalationPolicy, 'id'>): EscalationPolicy {
    return this.escalationManager.addPolicy(policy);
  }

  /**
   * 获取升级策略
   */
  getEscalationPolicies(): EscalationPolicy[] {
    return this.escalationManager.getAllPolicies();
  }

  /**
   * 获取统计信息
   */
  getStats(): AlertStats {
    const alerts = Array.from(this.alerts.values());
    const activeAlerts = alerts.filter((a) => a.status === 'active');

    const alertsBySeverity: Record<AnomalySeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const alertsByStatus: Record<AlertStatus, number> = {
      active: 0,
      acknowledged: 0,
      resolved: 0,
      suppressed: 0,
      escalated: 0,
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    alerts.forEach((alert) => {
      alertsBySeverity[alert.severity]++;
      alertsByStatus[alert.status]++;

      if (alert.resolvedAt && alert.createdAt) {
        totalResolutionTime += alert.resolvedAt.getTime() - alert.createdAt.getTime();
        resolvedCount++;
      }
    });

    return {
      totalAlerts: alerts.length,
      activeAlerts: activeAlerts.length,
      alertsBySeverity,
      alertsByStatus,
      averageResolutionTimeMs: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
      suppressionRate: alertsByStatus.suppressed / alerts.length,
      escalationRate: alertsByStatus.escalated / alerts.length,
    };
  }

  /**
   * 处理升级回调
   */
  private handleEscalation(alert: Alert, level: EscalationLevel): void {
    logger.info(
      `Escalating alert ${alert.id} to level ${level.level} via channels: ${level.channels.join(', ')}`,
    );

    level.channels.forEach((channel) => {
      alert.notificationHistory.push({
        channel,
        timestamp: new Date(),
        status: 'sent',
      });
    });
  }

  /**
   * 初始化默认策略
   */
  private initializeDefaultPolicies(): void {
    this.addEscalationPolicy({
      name: 'Default Escalation Policy',
      levels: [
        {
          level: 1,
          name: 'Initial Alert',
          timeoutMs: 300000,
          channels: ['email', 'webhook'],
          requireAcknowledgment: true,
          autoEscalate: true,
          notifyOnEscalation: false,
        },
        {
          level: 2,
          name: 'Manager Notification',
          timeoutMs: 600000,
          channels: ['email', 'sms', 'slack'],
          requireAcknowledgment: true,
          autoEscalate: true,
          notifyOnEscalation: true,
        },
        {
          level: 3,
          name: 'Executive Escalation',
          timeoutMs: 900000,
          channels: ['email', 'sms', 'slack', 'telegram'],
          requireAcknowledgment: false,
          autoEscalate: false,
          notifyOnEscalation: true,
        },
      ],
      defaultChannels: ['email'],
    });
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.suppressionManager.cleanupExpiredSuppressions();
      this.deduplicationManager.cleanup();
    }, 3600000);
  }

  /**
   * 停止服务
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}
