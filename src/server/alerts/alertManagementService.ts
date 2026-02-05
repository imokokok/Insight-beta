/**
 * Alert Management Service
 *
 * 告警管理系统
 * - 告警抑制和去重
 * - 告警升级策略
 * - 告警通知路由
 * - 告警历史管理
 */

import { logger } from '@/lib/logger';
import type { AnomalySeverity } from '@/server/security/anomalyDetectionService';

// ============================================================================
// 类型定义
// ============================================================================

export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'suppressed' | 'escalated';
export type AlertChannel = 'email' | 'sms' | 'webhook' | 'slack' | 'telegram' | 'push';

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: AnomalySeverity;
  status: AlertStatus;
  source: string;
  symbol?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  escalationLevel: number;
  escalationHistory: EscalationRecord[];
  notificationHistory: NotificationRecord[];
  suppressionReason?: string;
  duplicateOf?: string;
}

export interface EscalationRecord {
  level: number;
  timestamp: Date;
  reason: string;
  notifiedChannels: AlertChannel[];
}

export interface NotificationRecord {
  channel: AlertChannel;
  timestamp: Date;
  status: 'sent' | 'failed' | 'retrying';
  error?: string;
}

export interface SuppressionRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: SuppressionCondition[];
  durationMs: number;
  reason: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface SuppressionCondition {
  field: string;
  operator: 'equals' | 'contains' | 'in' | 'gt' | 'lt';
  value: string | number | string[];
}

export interface EscalationPolicy {
  id: string;
  name: string;
  levels: EscalationLevel[];
  defaultChannels: AlertChannel[];
}

export interface EscalationLevel {
  level: number;
  name: string;
  timeoutMs: number;
  channels: AlertChannel[];
  requireAcknowledgment: boolean;
  autoEscalate: boolean;
  notifyOnEscalation: boolean;
}

export interface AlertStats {
  totalAlerts: number;
  activeAlerts: number;
  alertsBySeverity: Record<AnomalySeverity, number>;
  alertsByStatus: Record<AlertStatus, number>;
  averageResolutionTimeMs: number;
  suppressionRate: number;
  escalationRate: number;
}

// ============================================================================
// 告警抑制管理器
// ============================================================================

class AlertSuppressionManager {
  private rules: Map<string, SuppressionRule> = new Map();
  private suppressionLog: Map<string, Date> = new Map();

  /**
   * 添加抑制规则
   */
  addRule(rule: Omit<SuppressionRule, 'id' | 'createdAt'>): SuppressionRule {
    const newRule: SuppressionRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };

    this.rules.set(newRule.id, newRule);
    logger.info(`Suppression rule added: ${newRule.name}`);
    return newRule;
  }

  /**
   * 检查告警是否应该被抑制
   */
  shouldSuppress(alert: Partial<Alert>): { suppressed: boolean; ruleId?: string; reason?: string } {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      if (rule.expiresAt && rule.expiresAt < new Date()) continue;

      if (this.matchesConditions(alert, rule.conditions)) {
        // 检查是否已经在抑制期内
        const key = this.getSuppressionKey(alert);
        const lastSuppressed = this.suppressionLog.get(key);

        if (lastSuppressed && Date.now() - lastSuppressed.getTime() < rule.durationMs) {
          return { suppressed: true, ruleId: rule.id, reason: rule.reason };
        }

        // 记录新的抑制
        this.suppressionLog.set(key, new Date());
        return { suppressed: true, ruleId: rule.id, reason: rule.reason };
      }
    }

    return { suppressed: false };
  }

  /**
   * 检查告警是否匹配抑制条件
   */
  private matchesConditions(alert: Partial<Alert>, conditions: SuppressionCondition[]): boolean {
    return conditions.every((condition) => {
      const value = this.getFieldValue(alert, condition.field);

      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'contains':
          return String(value).includes(String(condition.value));
        // Note: regex operator removed due to security concerns
        // Use 'contains' or 'equals' instead
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(String(value));
        case 'gt':
          return Number(value) > Number(condition.value);
        case 'lt':
          return Number(value) < Number(condition.value);
        default:
          return false;
      }
    });
  }

  /**
   * 获取字段值
   */
  private getFieldValue(alert: Partial<Alert>, field: string): unknown {
    const parts = field.split('.');
    let value: unknown = alert;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * 生成抑制键
   */
  private getSuppressionKey(alert: Partial<Alert>): string {
    return `${alert.source}-${alert.symbol}-${alert.severity}`;
  }

  /**
   * 删除抑制规则
   */
  removeRule(ruleId: string): boolean {
    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      logger.info(`Suppression rule removed: ${ruleId}`);
    }
    return deleted;
  }

  /**
   * 获取所有规则
   */
  getRules(): SuppressionRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 清理过期的抑制记录
   */
  cleanupExpiredSuppressions(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.suppressionLog.entries()) {
      // 清理超过24小时的记录
      if (now - timestamp.getTime() > 24 * 60 * 60 * 1000) {
        this.suppressionLog.delete(key);
      }
    }
  }
}

// ============================================================================
// 告警升级管理器
// ============================================================================

class AlertEscalationManager {
  private policies: Map<string, EscalationPolicy> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(private onEscalate: (alert: Alert, level: EscalationLevel) => void) {}

  /**
   * 添加升级策略
   */
  addPolicy(policy: Omit<EscalationPolicy, 'id'>): EscalationPolicy {
    const newPolicy: EscalationPolicy = {
      ...policy,
      id: `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    this.policies.set(newPolicy.id, newPolicy);
    logger.info(`Escalation policy added: ${newPolicy.name}`);
    return newPolicy;
  }

  /**
   * 启动告警升级流程
   */
  startEscalation(alert: Alert, policyId?: string): void {
    const policy = policyId ? this.policies.get(policyId) : this.getDefaultPolicy();

    if (!policy) {
      logger.warn(`No escalation policy found for alert ${alert.id}`);
      return;
    }

    // 取消现有的升级定时器
    this.cancelEscalation(alert.id);

    // 启动第一级升级
    this.scheduleEscalation(alert, policy, 0);
  }

  /**
   * 安排升级
   */
  private scheduleEscalation(alert: Alert, policy: EscalationPolicy, levelIndex: number): void {
    if (levelIndex >= policy.levels.length) {
      logger.info(`Alert ${alert.id} reached maximum escalation level`);
      return;
    }

    const level = policy.levels[levelIndex];
    if (!level) {
      logger.warn(`No escalation level found at index ${levelIndex} for alert ${alert.id}`);
      return;
    }

    const timer = setTimeout(() => {
      // 检查告警是否已被确认或解决
      if (alert.status === 'acknowledged' || alert.status === 'resolved') {
        logger.debug(`Alert ${alert.id} already handled, canceling escalation`);
        return;
      }

      // 执行升级
      this.executeEscalation(alert, level);

      // 如果允许自动升级，安排下一级
      if (level.autoEscalate && levelIndex < policy.levels.length - 1) {
        this.scheduleEscalation(alert, policy, levelIndex + 1);
      }
    }, level.timeoutMs);

    this.escalationTimers.set(alert.id, timer);
  }

  /**
   * 执行升级
   */
  private executeEscalation(alert: Alert, level: EscalationLevel): void {
    logger.info(`Escalating alert ${alert.id} to level ${level.level}: ${level.name}`);

    // 更新告警状态
    alert.escalationLevel = level.level;
    alert.escalationHistory.push({
      level: level.level,
      timestamp: new Date(),
      reason: `Auto-escalated after ${level.timeoutMs}ms`,
      notifiedChannels: level.channels,
    });

    if (level.notifyOnEscalation) {
      alert.status = 'escalated';
    }

    // 触发升级回调
    this.onEscalate(alert, level);
  }

  /**
   * 取消升级
   */
  cancelEscalation(alertId: string): void {
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
      logger.debug(`Escalation cancelled for alert ${alertId}`);
    }
  }

  /**
   * 获取默认策略
   */
  private getDefaultPolicy(): EscalationPolicy | undefined {
    return Array.from(this.policies.values())[0];
  }

  /**
   * 获取策略
   */
  getPolicy(policyId: string): EscalationPolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * 获取所有策略
   */
  getAllPolicies(): EscalationPolicy[] {
    return Array.from(this.policies.values());
  }
}

// ============================================================================
// 告警去重管理器
// ============================================================================

class AlertDeduplicationManager {
  private recentAlerts: Map<string, { count: number; firstSeen: Date; lastSeen: Date }> = new Map();
  private readonly deduplicationWindowMs = 3600000; // 1小时

  /**
   * 检查是否是重复告警
   */
  checkDuplicate(alert: Partial<Alert>): {
    isDuplicate: boolean;
    duplicateOf?: string;
    count: number;
  } {
    const key = this.generateDuplicateKey(alert);
    const existing = this.recentAlerts.get(key);

    if (existing) {
      // 检查是否在去重窗口内
      if (Date.now() - existing.firstSeen.getTime() < this.deduplicationWindowMs) {
        existing.count++;
        existing.lastSeen = new Date();
        return { isDuplicate: true, duplicateOf: key, count: existing.count };
      }
    }

    // 记录新告警
    this.recentAlerts.set(key, {
      count: 1,
      firstSeen: new Date(),
      lastSeen: new Date(),
    });

    return { isDuplicate: false, count: 1 };
  }

  /**
   * 生成去重键
   */
  private generateDuplicateKey(alert: Partial<Alert>): string {
    return `${alert.source}-${alert.symbol}-${alert.severity}-${alert.title}`;
  }

  /**
   * 清理过期的去重记录
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.recentAlerts.entries()) {
      if (now - data.lastSeen.getTime() > this.deduplicationWindowMs) {
        this.recentAlerts.delete(key);
      }
    }
  }

  /**
   * 获取去重统计
   */
  getStats(): { totalGroups: number; totalAlerts: number } {
    let totalAlerts = 0;
    for (const data of this.recentAlerts.values()) {
      totalAlerts += data.count;
    }
    return {
      totalGroups: this.recentAlerts.size,
      totalAlerts,
    };
  }
}

// ============================================================================
// 主服务类
// ============================================================================

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
      // 可以选择更新原告警或完全忽略
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

    // 取消升级
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

    // 取消升级
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

    // const dedupStats = this.deduplicationManager.getStats();

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
    // 这里可以集成实际的通知服务
    logger.info(
      `Escalating alert ${alert.id} to level ${level.level} via channels: ${level.channels.join(', ')}`,
    );

    // 记录通知历史
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
    // 添加默认升级策略
    this.addEscalationPolicy({
      name: 'Default Escalation Policy',
      levels: [
        {
          level: 1,
          name: 'Initial Alert',
          timeoutMs: 300000, // 5分钟
          channels: ['email', 'webhook'],
          requireAcknowledgment: true,
          autoEscalate: true,
          notifyOnEscalation: false,
        },
        {
          level: 2,
          name: 'Manager Notification',
          timeoutMs: 600000, // 10分钟
          channels: ['email', 'sms', 'slack'],
          requireAcknowledgment: true,
          autoEscalate: true,
          notifyOnEscalation: true,
        },
        {
          level: 3,
          name: 'Executive Escalation',
          timeoutMs: 900000, // 15分钟
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
    }, 3600000); // 每小时清理一次
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

// ============================================================================
// 单例导出
// ============================================================================

export const alertManagementService = new AlertManagementService();
