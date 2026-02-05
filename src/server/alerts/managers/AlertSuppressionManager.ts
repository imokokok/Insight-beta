/**
 * Alert Suppression Manager
 *
 * 告警抑制管理器
 */

import { logger } from '@/lib/logger';
import type { Alert, SuppressionRule, SuppressionCondition } from '../types';

export class AlertSuppressionManager {
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
