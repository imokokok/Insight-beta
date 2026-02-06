/**
 * Alert Escalation Manager
 *
 * 告警升级管理器
 */

import { logger } from '@/lib/logger';

import type { Alert, EscalationPolicy, EscalationLevel } from '../types';

export class AlertEscalationManager {
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
