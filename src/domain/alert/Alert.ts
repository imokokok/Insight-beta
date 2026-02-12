/**
 * Alert 领域模型
 */

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  channels: NotificationChannel[];
  cooldown: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertCondition {
  type: 'price_deviation' | 'latency' | 'status_change' | 'custom';
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  timeframe?: number;
  metadata?: Record<string, unknown>;
}

export interface Alert {
  id: string;
  ruleId: string;
  oracleId?: string;
  symbol?: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface NotificationChannel {
  id: string;
  type: 'email' | 'sms' | 'webhook' | 'telegram';
  config: Record<string, unknown>;
  enabled: boolean;
}

export class AlertAggregate {
  private rule: AlertRule;
  private alerts: Alert[];

  constructor(rule: AlertRule) {
    this.rule = rule;
    this.alerts = [];
  }

  shouldTrigger(condition: AlertCondition): boolean {
    if (!this.rule.enabled) return false;

    const lastAlert = this.alerts[this.alerts.length - 1];
    if (lastAlert) {
      const timeSinceLastAlert = Date.now() - lastAlert.triggeredAt.getTime();
      if (timeSinceLastAlert < this.rule.cooldown) {
        return false;
      }
    }

    return this.evaluateCondition(condition);
  }

  private evaluateCondition(condition: AlertCondition): boolean {
    switch (condition.operator) {
      case 'gt':
        return condition.threshold > this.rule.condition.threshold;
      case 'lt':
        return condition.threshold < this.rule.condition.threshold;
      case 'eq':
        return condition.threshold === this.rule.condition.threshold;
      case 'gte':
        return condition.threshold >= this.rule.condition.threshold;
      case 'lte':
        return condition.threshold <= this.rule.condition.threshold;
      default:
        return false;
    }
  }

  createAlert(alert: Alert): void {
    this.alerts.push(alert);
  }
}
