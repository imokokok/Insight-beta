/**
 * Advanced Alert Rule Engine
 *
 * P2 优化：高级告警规则引擎
 * - 动态阈值配置
 * - 多条件组合规则
 * - 告警抑制和聚合
 * - 支持多种通知渠道
 */

import { logger } from '@/lib/logger';
import type { CrossOracleComparison, OracleProtocol } from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// 告警规则类型定义
// ============================================================================

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';
export type AlertConditionType =
  | 'price_deviation'
  | 'data_staleness'
  | 'protocol_down'
  | 'volume_anomaly';

export interface AlertCondition {
  type: AlertConditionType;
  symbol?: string;
  protocols?: OracleProtocol[];
  threshold: number;
  durationMs?: number; // 持续时间阈值
  consecutiveCount?: number; // 连续触发次数
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: AlertSeverity;
  conditions: AlertCondition[];
  logic: 'AND' | 'OR'; // 条件组合逻辑
  cooldownMs: number; // 冷却时间
  maxOccurrences?: number; // 最大触发次数
  channels: NotificationChannel[];
  createdAt: number;
  updatedAt: number;
}

export interface NotificationChannel {
  type: 'webhook' | 'email' | 'slack' | 'telegram';
  config: Record<string, string>;
}

export interface Alert {
  id: string;
  ruleId: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  symbol: string;
  context: Record<string, unknown>;
  status: 'open' | 'acknowledged' | 'resolved';
  createdAt: number;
  acknowledgedAt?: number;
  resolvedAt?: number;
  occurrenceCount: number;
}

// ============================================================================
// 告警规则引擎
// ============================================================================

export class AlertRuleEngine {
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private ruleHistory: Map<string, number[]> = new Map(); // 规则触发历史时间戳
  private alertHistory: Map<string, Alert[]> = new Map(); // 告警历史

  // 默认规则
  private readonly defaultRules: AlertRule[] = [
    {
      id: 'rule-price-deviation-warning',
      name: '价格偏差警告',
      description: '当价格偏差超过1%时触发警告',
      enabled: true,
      severity: 'warning',
      conditions: [{ type: 'price_deviation', threshold: 0.01 }],
      logic: 'OR',
      cooldownMs: 300000, // 5分钟冷却
      channels: [{ type: 'webhook', config: { url: '/api/alerts/webhook' } }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'rule-price-deviation-critical',
      name: '价格偏差严重',
      description: '当价格偏差超过5%时触发严重告警',
      enabled: true,
      severity: 'critical',
      conditions: [{ type: 'price_deviation', threshold: 0.05 }],
      logic: 'OR',
      cooldownMs: 600000, // 10分钟冷却
      channels: [
        { type: 'webhook', config: { url: '/api/alerts/webhook' } },
        { type: 'email', config: { to: 'admin@example.com' } },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'rule-data-staleness',
      name: '数据陈旧告警',
      description: '当数据超过5分钟未更新时触发',
      enabled: true,
      severity: 'warning',
      conditions: [
        { type: 'data_staleness', threshold: 300000 }, // 5分钟
      ],
      logic: 'OR',
      cooldownMs: 600000,
      channels: [{ type: 'webhook', config: { url: '/api/alerts/webhook' } }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'rule-protocol-down',
      name: '协议宕机告警',
      description: '当协议连续3次获取失败时触发',
      enabled: true,
      severity: 'critical',
      conditions: [{ type: 'protocol_down', threshold: 3, consecutiveCount: 3 }],
      logic: 'OR',
      cooldownMs: 900000, // 15分钟冷却
      channels: [
        { type: 'webhook', config: { url: '/api/alerts/webhook' } },
        { type: 'slack', config: { channel: '#alerts' } },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  constructor() {
    // 加载默认规则
    for (const rule of this.defaultRules) {
      this.rules.set(rule.id, rule);
    }
  }

  // ============================================================================
  // 规则管理
  // ============================================================================

  /**
   * 添加规则
   */
  addRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): AlertRule {
    const timestamp = Date.now().toString(36);
    const randomPart =
      typeof crypto !== 'undefined' && crypto.getRandomValues
        ? Array.from(crypto.getRandomValues(new Uint8Array(5)))
            .map((b) => b.toString(36).padStart(2, '0'))
            .join('')
        : Math.random().toString(36).slice(2, 12);
    const newRule: AlertRule = {
      ...rule,
      id: `rule-${timestamp}-${randomPart}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.rules.set(newRule.id, newRule);
    logger.info('Alert rule added', { ruleId: newRule.id, name: newRule.name });
    return newRule;
  }

  /**
   * 更新规则
   */
  updateRule(ruleId: string, updates: Partial<AlertRule>): AlertRule | null {
    const rule = this.rules.get(ruleId);
    if (!rule) return null;

    const updatedRule = {
      ...rule,
      ...updates,
      updatedAt: Date.now(),
    };
    this.rules.set(ruleId, updatedRule);
    logger.info('Alert rule updated', { ruleId });
    return updatedRule;
  }

  /**
   * 删除规则
   */
  deleteRule(ruleId: string): boolean {
    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      logger.info('Alert rule deleted', { ruleId });
    }
    return deleted;
  }

  /**
   * 启用/禁用规则
   */
  toggleRule(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    rule.enabled = enabled;
    rule.updatedAt = Date.now();
    logger.info('Alert rule toggled', { ruleId, enabled });
    return true;
  }

  /**
   * 获取所有规则
   */
  getAllRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 获取规则
   */
  getRule(ruleId: string): AlertRule | undefined {
    return this.rules.get(ruleId);
  }

  // ============================================================================
  // 告警评估
  // ============================================================================

  /**
   * 评估价格数据并触发告警
   */
  evaluate(comparison: CrossOracleComparison): Alert[] {
    const triggeredAlerts: Alert[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      const shouldTrigger = this.evaluateRule(rule, comparison);
      if (shouldTrigger) {
        const alert = this.createAlert(rule, comparison);
        if (alert) {
          triggeredAlerts.push(alert);
        }
      }
    }

    return triggeredAlerts;
  }

  /**
   * 评估单个规则
   */
  private evaluateRule(rule: AlertRule, comparison: CrossOracleComparison): boolean {
    // 检查冷却时间
    if (!this.checkCooldown(rule)) {
      return false;
    }

    // 检查最大触发次数
    if (rule.maxOccurrences && this.getOccurrenceCount(rule.id) >= rule.maxOccurrences) {
      return false;
    }

    // 评估所有条件
    const results = rule.conditions.map((condition) =>
      this.evaluateCondition(condition, comparison),
    );

    // 根据逻辑组合结果
    const triggered = rule.logic === 'AND' ? results.every((r) => r) : results.some((r) => r);

    if (triggered) {
      this.recordTrigger(rule.id);
    }

    return triggered;
  }

  /**
   * 评估单个条件
   */
  private evaluateCondition(condition: AlertCondition, comparison: CrossOracleComparison): boolean {
    switch (condition.type) {
      case 'price_deviation':
        // comparison.maxDeviationPercent 是小数形式 (如 0.01 = 1%)
        // condition.threshold 也是小数形式 (如 0.01 = 1%)
        return comparison.maxDeviationPercent >= condition.threshold;

      case 'data_staleness': {
        const age = Date.now() - new Date(comparison.timestamp).getTime();
        return age >= (condition.durationMs || condition.threshold);
      }

      case 'protocol_down':
        // 检查异常协议数量
        return comparison.outlierProtocols.length >= condition.threshold;

      case 'volume_anomaly':
        // 简化处理，实际应该检查交易量
        return false;

      default:
        return false;
    }
  }

  /**
   * 检查冷却时间
   */
  private checkCooldown(rule: AlertRule): boolean {
    const history = this.ruleHistory.get(rule.id) || [];
    if (history.length === 0) return true;

    const lastTrigger = history[history.length - 1];
    if (lastTrigger === undefined) return true;

    return Date.now() - lastTrigger >= rule.cooldownMs;
  }

  /**
   * 记录规则触发
   */
  private recordTrigger(ruleId: string): void {
    if (!this.ruleHistory.has(ruleId)) {
      this.ruleHistory.set(ruleId, []);
    }
    this.ruleHistory.get(ruleId)!.push(Date.now());
  }

  /**
   * 获取规则触发次数
   */
  private getOccurrenceCount(ruleId: string): number {
    return this.ruleHistory.get(ruleId)?.length || 0;
  }

  // ============================================================================
  // 告警管理
  // ============================================================================

  /**
   * 创建告警
   */
  private createAlert(rule: AlertRule, comparison: CrossOracleComparison): Alert | null {
    // 检查是否已有相同规则的开放告警
    const existingAlert = this.findExistingAlert(rule.id, comparison.symbol);
    if (existingAlert) {
      // 更新现有告警
      existingAlert.occurrenceCount++;
      existingAlert.context = {
        ...existingAlert.context,
        latestComparison: comparison,
      };
      return null; // 不创建新告警，而是更新现有
    }

    const timestamp = Date.now().toString(36);
    const randomPart =
      typeof crypto !== 'undefined' && crypto.getRandomValues
        ? Array.from(crypto.getRandomValues(new Uint8Array(5)))
            .map((b) => b.toString(36).padStart(2, '0'))
            .join('')
        : Math.random().toString(36).slice(2, 12);
    const alert: Alert = {
      id: `alert-${timestamp}-${randomPart}`,
      ruleId: rule.id,
      severity: rule.severity,
      title: this.generateAlertTitle(rule, comparison),
      message: this.generateAlertMessage(rule, comparison),
      symbol: comparison.symbol,
      context: {
        comparison,
        ruleName: rule.name,
      },
      status: 'open',
      createdAt: Date.now(),
      occurrenceCount: 1,
    };

    this.alerts.set(alert.id, alert);

    // 保存到历史
    if (!this.alertHistory.has(comparison.symbol)) {
      this.alertHistory.set(comparison.symbol, []);
    }
    this.alertHistory.get(comparison.symbol)!.push(alert);

    // 发送通知
    this.sendNotifications(rule, alert);

    logger.info('Alert created', {
      alertId: alert.id,
      ruleId: rule.id,
      severity: alert.severity,
      symbol: alert.symbol,
    });

    return alert;
  }

  /**
   * 查找现有告警
   */
  private findExistingAlert(ruleId: string, symbol: string): Alert | null {
    for (const alert of this.alerts.values()) {
      if (alert.ruleId === ruleId && alert.symbol === symbol && alert.status === 'open') {
        return alert;
      }
    }
    return null;
  }

  /**
   * 生成告警标题
   */
  private generateAlertTitle(rule: AlertRule, comparison: CrossOracleComparison): string {
    const severityLabel = {
      info: '【信息】',
      warning: '【警告】',
      critical: '【严重】',
      emergency: '【紧急】',
    }[rule.severity];

    return `${severityLabel} ${comparison.symbol} - ${rule.name}`;
  }

  /**
   * 生成告警消息
   */
  private generateAlertMessage(rule: AlertRule, comparison: CrossOracleComparison): string {
    const lines: string[] = [
      `交易对: ${comparison.symbol}`,
      `规则: ${rule.name}`,
      `偏差: ${(comparison.maxDeviationPercent * 100).toFixed(2)}%`,
      `推荐价格: $${comparison.recommendedPrice.toFixed(4)}`,
      `异常协议: ${comparison.outlierProtocols.join(', ') || '无'}`,
      `时间: ${new Date().toLocaleString()}`,
    ];
    return lines.join('\n');
  }

  /**
   * 发送通知
   */
  private async sendNotifications(rule: AlertRule, alert: Alert): Promise<void> {
    for (const channel of rule.channels) {
      try {
        await this.sendNotification(channel, alert);
      } catch (error) {
        logger.error('Failed to send notification', {
          error,
          channel: channel.type,
          alertId: alert.id,
        });
      }
    }
  }

  /**
   * 发送单个通知
   */
  private async sendNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    switch (channel.type) {
      case 'webhook': {
        const url = channel.config.url;
        if (url) {
          await this.sendWebhook(url, alert);
        } else {
          logger.warn('Webhook URL is missing', { alertId: alert.id });
        }
        break;
      }
      case 'email':
        // 实际项目中集成邮件服务
        logger.debug('Email notification', { to: channel.config.to, alert });
        break;
      case 'slack':
        // 实际项目中集成 Slack API
        logger.debug('Slack notification', { channel: channel.config.channel, alert });
        break;
      case 'telegram':
        // 实际项目中集成 Telegram Bot
        logger.debug('Telegram notification', { alert });
        break;
    }
  }

  /**
   * 发送 Webhook
   */
  private async sendWebhook(url: string, alert: Alert): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      logger.error('Webhook notification failed', { error, url, alertId: alert.id });
      throw error;
    }
  }

  // ============================================================================
  // 告警操作
  // ============================================================================

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId: string, userId?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== 'open') return false;

    alert.status = 'acknowledged';
    alert.acknowledgedAt = Date.now();
    alert.context.acknowledgedBy = userId;

    logger.info('Alert acknowledged', { alertId, userId });
    return true;
  }

  /**
   * 解决告警
   */
  resolveAlert(alertId: string, resolution?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status === 'resolved') return false;

    alert.status = 'resolved';
    alert.resolvedAt = Date.now();
    if (resolution) {
      alert.context.resolution = resolution;
    }

    logger.info('Alert resolved', { alertId, resolution });
    return true;
  }

  /**
   * 获取所有告警
   */
  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * 获取开放告警
   */
  getOpenAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter((a) => a.status === 'open');
  }

  /**
   * 获取告警历史
   */
  getAlertHistory(symbol?: string): Alert[] {
    if (symbol) {
      return this.alertHistory.get(symbol) || [];
    }
    return Array.from(this.alertHistory.values()).flat();
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalRules: number;
    enabledRules: number;
    totalAlerts: number;
    openAlerts: number;
    acknowledgedAlerts: number;
    resolvedAlerts: number;
  } {
    const allAlerts = Array.from(this.alerts.values());
    return {
      totalRules: this.rules.size,
      enabledRules: Array.from(this.rules.values()).filter((r) => r.enabled).length,
      totalAlerts: allAlerts.length,
      openAlerts: allAlerts.filter((a) => a.status === 'open').length,
      acknowledgedAlerts: allAlerts.filter((a) => a.status === 'acknowledged').length,
      resolvedAlerts: allAlerts.filter((a) => a.status === 'resolved').length,
    };
  }
}

// 导出单例
export const alertRuleEngine = new AlertRuleEngine();
