/**
 * SLO Scheduler Service
 *
 * SLO 定时任务服务 - 定期执行 SLO 评估和告警检查
 */

import { logger } from '@/shared/logger';
import { NotificationService } from '@/services/alert/notifications';

// ============================================================================
// 配置
// ============================================================================

interface SloSchedulerConfig {
  evaluationIntervalMs: number;    // SLO 评估间隔（默认 5 分钟）
  alertCheckIntervalMs: number;    // 告警检查间隔（默认 1 分钟）
  errorBudgetThreshold: number;    // Error Budget 告警阈值（默认 20%）
  burnRateThreshold: number;       // 消耗速率告警阈值（分钟/天）
}

const defaultConfig: SloSchedulerConfig = {
  evaluationIntervalMs: 5 * 60 * 1000,  // 5 分钟
  alertCheckIntervalMs: 60 * 1000,       // 1 分钟
  errorBudgetThreshold: 20,              // 剩余 20% 时告警
  burnRateThreshold: 60,                 // 每天消耗超过 60 分钟时告警
};

// ============================================================================
// 类型定义
// ============================================================================

export interface SloReport {
  sloId: string;
  name: string;
  protocol: string;
  chain: string;
  metricType: string;
  targetValue: number;
  currentCompliance: number;
  status: 'compliant' | 'at_risk' | 'breached';
  errorBudget: {
    total: number;
    used: number;
    remaining: number;
    burnRate: number;
    daysUntilExhaustion?: number;
    status: string;
  };
  trend: 'improving' | 'stable' | 'degrading';
}

// ============================================================================
// SLO 调度器
// ============================================================================

export class SloScheduler {
  private config: SloSchedulerConfig;
  private notificationService = new NotificationService();
  private evaluationTimer: NodeJS.Timeout | null = null;
  private alertCheckTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastAlertTimes: Map<string, number> = new Map();

  constructor(config: Partial<SloSchedulerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * 启动 SLO 调度器
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('SLO scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting SLO scheduler', { config: this.config });

    // 立即执行一次评估
    this.runEvaluation().catch(error => {
      logger.error('Initial SLO evaluation failed', { error });
    });

    // 启动定期评估
    this.evaluationTimer = setInterval(() => {
      this.runEvaluation().catch(error => {
        logger.error('Scheduled SLO evaluation failed', { error });
      });
    }, this.config.evaluationIntervalMs);

    // 启动告警检查
    this.alertCheckTimer = setInterval(() => {
      this.checkAlerts().catch(error => {
        logger.error('SLO alert check failed', { error });
      });
    }, this.config.alertCheckIntervalMs);

    logger.info('SLO scheduler started');
  }

  /**
   * 停止 SLO 调度器
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
      this.evaluationTimer = null;
    }

    if (this.alertCheckTimer) {
      clearInterval(this.alertCheckTimer);
      this.alertCheckTimer = null;
    }

    logger.info('SLO scheduler stopped');
  }

  /**
   * 执行 SLO 评估
   */
  private async runEvaluation(): Promise<void> {
    logger.debug('Running scheduled SLO evaluation');

    try {
      // 调用 API 执行评估
      const response = await fetch('/api/slo/evaluate', { method: 'POST' });
      if (!response.ok) {
        throw new Error('SLO evaluation API failed');
      }
      logger.debug('SLO evaluation completed');
    } catch (error) {
      logger.error('SLO evaluation failed', { error });
    }
  }

  /**
   * 检查 SLO 告警
   */
  private async checkAlerts(): Promise<void> {
    try {
      const response = await fetch('/api/slo/reports');
      if (!response.ok) {
        throw new Error('Failed to fetch SLO reports');
      }
      const data = await response.json();
      const reports: SloReport[] = data.data.reports;

      for (const report of reports) {
        await this.checkSloAlerts(report);
      }
    } catch (error) {
      logger.error('Failed to check SLO alerts', { error });
    }
  }

  /**
   * 检查单个 SLO 的告警条件
   */
  private async checkSloAlerts(report: SloReport): Promise<void> {
    const alertKey = `slo_${report.sloId}`;
    const lastAlertTime = this.lastAlertTimes.get(alertKey) || 0;
    const now = Date.now();
    const minAlertInterval = 30 * 60 * 1000; // 30 分钟内不重复告警

    // 1. 检查 SLO 违约
    if (report.status === 'breached') {
      if (now - lastAlertTime > minAlertInterval) {
        await this.sendSloAlert(report, 'breached');
        this.lastAlertTimes.set(alertKey, now);
      }
      return;
    }

    // 2. 检查 Error Budget 即将耗尽
    const errorBudgetRemaining = (report.errorBudget.remaining / report.errorBudget.total) * 100;
    if (errorBudgetRemaining < this.config.errorBudgetThreshold) {
      if (now - lastAlertTime > minAlertInterval) {
        await this.sendSloAlert(report, 'error_budget_low');
        this.lastAlertTimes.set(alertKey, now);
      }
      return;
    }

    // 3. 检查消耗速率过快
    if (report.errorBudget.burnRate > this.config.burnRateThreshold) {
      if (now - lastAlertTime > minAlertInterval) {
        await this.sendSloAlert(report, 'burn_rate_high');
        this.lastAlertTimes.set(alertKey, now);
      }
      return;
    }

    // 4. 检查 SLO 风险状态
    if (report.status === 'at_risk') {
      if (now - lastAlertTime > minAlertInterval) {
        await this.sendSloAlert(report, 'at_risk');
        this.lastAlertTimes.set(alertKey, now);
      }
    }
  }

  /**
   * 发送 SLO 告警
   */
  private async sendSloAlert(
    report: SloReport,
    alertType: 'breached' | 'error_budget_low' | 'burn_rate_high' | 'at_risk'
  ): Promise<void> {
    const titles: Record<typeof alertType, string> = {
      breached: `SLO 违约: ${report.name}`,
      error_budget_low: `Error Budget 即将耗尽: ${report.name}`,
      burn_rate_high: `Error Budget 消耗过快: ${report.name}`,
      at_risk: `SLO 处于风险状态: ${report.name}`,
    };

    const messages: Record<typeof alertType, string> = {
      breached: `SLO "${report.name}" 已突破阈值。当前合规率: ${report.currentCompliance.toFixed(2)}%，目标: ${report.targetValue}%`,
      error_budget_low: `SLO "${report.name}" 的 Error Budget 仅剩 ${(report.errorBudget.remaining / report.errorBudget.total * 100).toFixed(1)}%。预计 ${report.errorBudget.daysUntilExhaustion} 天后耗尽。`,
      burn_rate_high: `SLO "${report.name}" 的 Error Budget 消耗速率为 ${report.errorBudget.burnRate.toFixed(1)} 分钟/天，超过阈值。`,
      at_risk: `SLO "${report.name}" 处于风险状态。当前合规率: ${report.currentCompliance.toFixed(2)}%，低于目标值。`,
    };

    const severities: Record<typeof alertType, 'critical' | 'warning' | 'info'> = {
      breached: 'critical',
      error_budget_low: 'warning',
      burn_rate_high: 'warning',
      at_risk: 'info',
    };

    const title = titles[alertType];
    const message = messages[alertType];
    const severity = severities[alertType];

    // 发送通知
    try {
      await this.notificationService.sendNotification('slack', {
        id: crypto.randomUUID(),
        alertId: `slo-${report.sloId}-${alertType}`,
        severity,
        title,
        message,
        details: {
          sloId: report.sloId,
          sloName: report.name,
          protocol: report.protocol,
          chain: report.chain,
          metricType: report.metricType,
          currentCompliance: report.currentCompliance,
          targetValue: report.targetValue,
          errorBudget: report.errorBudget,
          trend: report.trend,
        },
        timestamp: new Date(),
        protocol: report.protocol,
        chain: report.chain,
      });
    } catch (error) {
      logger.error('Failed to send SLO alert notification', { error, alertType, sloId: report.sloId });
    }

    logger.info(`SLO alert sent: ${alertType}`, {
      sloId: report.sloId,
      sloName: report.name,
    });
  }

  /**
   * 获取调度器状态
   */
  getStatus(): {
    isRunning: boolean;
    config: SloSchedulerConfig;
    lastAlertTimes: Record<string, number>;
  } {
    return {
      isRunning: this.isRunning,
      config: this.config,
      lastAlertTimes: Object.fromEntries(this.lastAlertTimes),
    };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<SloSchedulerConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('SLO scheduler config updated', { config: this.config });

    // 如果正在运行，重启以应用新配置
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }
}

// ============================================================================
// 单例实例
// ============================================================================

let sloScheduler: SloScheduler | null = null;

export function getSloScheduler(config?: Partial<SloSchedulerConfig>): SloScheduler {
  if (!sloScheduler) {
    sloScheduler = new SloScheduler(config);
  }
  return sloScheduler;
}

export function resetSloScheduler(): void {
  if (sloScheduler) {
    sloScheduler.stop();
    sloScheduler = null;
  }
}

// ============================================================================
// 便捷函数
// ============================================================================

export function startSloScheduler(config?: Partial<SloSchedulerConfig>): void {
  getSloScheduler(config).start();
}

export function stopSloScheduler(): void {
  resetSloScheduler();
}
