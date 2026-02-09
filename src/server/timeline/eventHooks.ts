/**
 * Event Timeline Hooks
 *
 * 事件时间线钩子 - 提供常用的事件创建函数
 * 用于在关键业务流程中自动记录事件
 */

import { logger } from '@/lib/logger';

// 类型定义
type EventSeverity = 'info' | 'warning' | 'error' | 'critical';

interface EventTimelineInput {
  eventType: string;
  severity?: EventSeverity;
  title: string;
  description?: string;
  protocol?: string;
  chain?: string;
  symbol?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
  parentEventId?: string;
  relatedEventIds?: string[];
  source?: 'system' | 'user' | 'api' | 'webhook';
  sourceUser?: string;
}

// 临时实现，实际应该调用 API
async function createTimelineEvent(input: EventTimelineInput): Promise<{ id: string }> {
  try {
    const response = await fetch('/api/timeline/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...input,
        occurredAt: input.occurredAt?.toISOString(),
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create timeline event');
    }
    
    const data = await response.json();
    return { id: data.data.id };
  } catch (error) {
    logger.error('Failed to create timeline event', { error, input });
    throw error;
  }
}

// ============================================================================
// 告警事件
// ============================================================================

interface AlertEventParams {
  alertId: string;
  alertType: string;
  severity: EventSeverity;
  title: string;
  message: string;
  protocol?: string;
  chain?: string;
  symbol?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 记录告警触发事件
 */
export async function hookAlertTriggered(params: AlertEventParams): Promise<void> {
  try {
    await createTimelineEvent({
      eventType: 'alert_triggered',
      severity: params.severity,
      title: params.title,
      description: params.message,
      protocol: params.protocol,
      chain: params.chain,
      symbol: params.symbol,
      entityType: 'alert',
      entityId: params.alertId,
      metadata: {
        alertId: params.alertId,
        alertType: params.alertType,
        ...params.metadata,
      },
      source: 'system',
    });
  } catch (error) {
    logger.error('Failed to create alert triggered timeline event', { error, params });
  }
}

/**
 * 记录告警恢复事件
 */
export async function hookAlertResolved(
  alertId: string,
  protocol?: string,
  chain?: string,
  symbol?: string
): Promise<void> {
  try {
    await createTimelineEvent({
      eventType: 'alert_resolved',
      severity: 'info',
      title: '告警已恢复',
      description: `告警 ${alertId} 已恢复`,
      protocol,
      chain,
      symbol,
      entityType: 'alert',
      entityId: alertId,
      metadata: { alertId },
      source: 'system',
    });
  } catch (error) {
    logger.error('Failed to create alert resolved timeline event', { error, alertId });
  }
}

// ============================================================================
// 争议事件
// ============================================================================

interface DisputeEventParams {
  disputeId: string;
  assertionId: string;
  protocol: string;
  chain: string;
  symbol: string;
  bondAmount?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 记录争议创建事件
 */
export async function hookDisputeCreated(params: DisputeEventParams): Promise<void> {
  try {
    await createTimelineEvent({
      eventType: 'dispute_created',
      severity: 'warning',
      title: `争议已创建: ${params.symbol}`,
      description: `针对 ${params.symbol} 的断言提出争议`,
      protocol: params.protocol,
      chain: params.chain,
      symbol: params.symbol,
      entityType: 'dispute',
      entityId: params.disputeId,
      metadata: {
        disputeId: params.disputeId,
        assertionId: params.assertionId,
        bondAmount: params.bondAmount,
        ...params.metadata,
      },
      source: 'system',
    });
  } catch (error) {
    logger.error('Failed to create dispute timeline event', { error, params });
  }
}

/**
 * 记录争议解决事件
 */
export async function hookDisputeResolved(
  disputeId: string,
  protocol: string,
  chain: string,
  symbol: string,
  resolution: 'valid' | 'invalid',
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await createTimelineEvent({
      eventType: 'dispute_resolved',
      severity: 'info',
      title: `争议已解决: ${symbol}`,
      description: `争议 ${disputeId} 被判定为 ${resolution === 'valid' ? '有效' : '无效'}`,
      protocol,
      chain,
      symbol,
      entityType: 'dispute',
      entityId: disputeId,
      metadata: {
        disputeId,
        resolution,
        ...metadata,
      },
      source: 'system',
    });
  } catch (error) {
    logger.error('Failed to create dispute resolved timeline event', { error, disputeId });
  }
}

// ============================================================================
// 价格事件
// ============================================================================

interface PriceEventParams {
  symbol: string;
  protocol: string;
  chain: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  metadata?: Record<string, unknown>;
}

/**
 * 记录价格飙升事件
 */
export async function hookPriceSpike(params: PriceEventParams): Promise<void> {
  const severity: EventSeverity =
    params.changePercent > 10 ? 'critical' : params.changePercent > 5 ? 'error' : 'warning';

  try {
    await createTimelineEvent({
      eventType: 'price_spike',
      severity,
      title: `${params.symbol} 价格飙升 ${params.changePercent.toFixed(2)}%`,
      description: `价格从 ${params.oldPrice} 上涨至 ${params.newPrice}`,
      protocol: params.protocol,
      chain: params.chain,
      symbol: params.symbol,
      metadata: {
        oldPrice: params.oldPrice,
        newPrice: params.newPrice,
        changePercent: params.changePercent,
        ...params.metadata,
      },
      source: 'system',
    });
  } catch (error) {
    logger.error('Failed to create price spike timeline event', { error, params });
  }
}

/**
 * 记录价格下降事件
 */
export async function hookPriceDrop(params: PriceEventParams): Promise<void> {
  const severity: EventSeverity =
    Math.abs(params.changePercent) > 10
      ? 'critical'
      : Math.abs(params.changePercent) > 5
        ? 'error'
        : 'warning';

  try {
    await createTimelineEvent({
      eventType: 'price_drop',
      severity,
      title: `${params.symbol} 价格下降 ${Math.abs(params.changePercent).toFixed(2)}%`,
      description: `价格从 ${params.oldPrice} 下跌至 ${params.newPrice}`,
      protocol: params.protocol,
      chain: params.chain,
      symbol: params.symbol,
      metadata: {
        oldPrice: params.oldPrice,
        newPrice: params.newPrice,
        changePercent: params.changePercent,
        ...params.metadata,
      },
      source: 'system',
    });
  } catch (error) {
    logger.error('Failed to create price drop timeline event', { error, params });
  }
}

// ============================================================================
// 部署事件
// ============================================================================

interface DeploymentEventParams {
  version: string;
  environment: string;
  commitHash?: string;
  branch?: string;
  deployedBy?: string;
  changes?: string[];
  affectedServices?: string[];
}

/**
 * 记录部署开始事件
 */
export async function hookDeploymentStarted(params: DeploymentEventParams): Promise<string> {
  try {
    const event = await createTimelineEvent({
      eventType: 'deployment',
      severity: 'info',
      title: `部署开始: ${params.version}`,
      description: `部署到 ${params.environment} 环境`,
      metadata: {
        version: params.version,
        environment: params.environment,
        commitHash: params.commitHash,
        branch: params.branch,
        deployedBy: params.deployedBy,
        changes: params.changes,
        affectedServices: params.affectedServices,
        status: 'started',
      },
      source: params.deployedBy ? 'user' : 'system',
      sourceUser: params.deployedBy,
    });

    return event.id;
  } catch (error) {
    logger.error('Failed to create deployment started timeline event', { error, params });
    throw error;
  }
}

/**
 * 记录部署完成事件
 */
export async function hookDeploymentCompleted(
  deploymentEventId: string,
  status: 'completed' | 'failed' | 'rolled_back',
  errorMessage?: string
): Promise<void> {
  try {
    await createTimelineEvent({
      eventType: 'deployment',
      severity: status === 'completed' ? 'info' : 'error',
      title: `部署${status === 'completed' ? '完成' : status === 'failed' ? '失败' : '已回滚'}`,
      description: errorMessage || `部署 ${deploymentEventId} ${status}`,
      metadata: {
        parentEventId: deploymentEventId,
        status,
        errorMessage,
      },
      parentEventId: deploymentEventId,
      source: 'system',
    });
  } catch (error) {
    logger.error('Failed to create deployment completed timeline event', { error, deploymentEventId });
  }
}

// ============================================================================
// 配置变更事件
// ============================================================================

interface ConfigChangeEventParams {
  configType: string;
  configId: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  changedBy?: string;
  protocol?: string;
  chain?: string;
}

/**
 * 记录配置变更事件
 */
export async function hookConfigChanged(params: ConfigChangeEventParams): Promise<void> {
  try {
    const changeSummary = Object.entries(params.changes)
      .map(([key, value]) => `${key}: ${JSON.stringify(value.old)} → ${JSON.stringify(value.new)}`)
      .join(', ');

    await createTimelineEvent({
      eventType: 'config_changed',
      severity: 'info',
      title: `配置变更: ${params.configType}`,
      description: changeSummary.substring(0, 200),
      protocol: params.protocol,
      chain: params.chain,
      entityType: 'config',
      entityId: params.configId,
      metadata: {
        configType: params.configType,
        configId: params.configId,
        changes: params.changes,
        changedBy: params.changedBy,
      },
      source: params.changedBy ? 'user' : 'system',
      sourceUser: params.changedBy,
    });
  } catch (error) {
    logger.error('Failed to create config changed timeline event', { error, params });
  }
}

// ============================================================================
// 修复事件
// ============================================================================

interface FixEventParams {
  issueId: string;
  issueType: string;
  title: string;
  description?: string;
  fixedBy?: string;
  protocol?: string;
  chain?: string;
  symbol?: string;
  relatedEventIds?: string[];
}

/**
 * 记录修复完成事件
 */
export async function hookFixCompleted(params: FixEventParams): Promise<void> {
  try {
    await createTimelineEvent({
      eventType: 'fix_completed',
      severity: 'info',
      title: `修复完成: ${params.title}`,
      description: params.description || `问题 ${params.issueId} 已修复`,
      protocol: params.protocol,
      chain: params.chain,
      symbol: params.symbol,
      entityType: 'incident',
      entityId: params.issueId,
      metadata: {
        issueId: params.issueId,
        issueType: params.issueType,
        fixedBy: params.fixedBy,
      },
      relatedEventIds: params.relatedEventIds,
      source: params.fixedBy ? 'user' : 'system',
      sourceUser: params.fixedBy,
    });
  } catch (error) {
    logger.error('Failed to create fix completed timeline event', { error, params });
  }
}

// ============================================================================
// 系统维护事件
// ============================================================================

interface MaintenanceEventParams {
  maintenanceType: string;
  description: string;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  affectedServices?: string[];
  initiatedBy?: string;
}

/**
 * 记录系统维护事件
 */
export async function hookSystemMaintenance(params: MaintenanceEventParams): Promise<void> {
  try {
    await createTimelineEvent({
      eventType: 'system_maintenance',
      severity: 'info',
      title: `系统维护: ${params.maintenanceType}`,
      description: params.description,
      metadata: {
        maintenanceType: params.maintenanceType,
        scheduledStart: params.scheduledStart,
        scheduledEnd: params.scheduledEnd,
        affectedServices: params.affectedServices,
      },
      source: params.initiatedBy ? 'user' : 'system',
      sourceUser: params.initiatedBy,
    });
  } catch (error) {
    logger.error('Failed to create system maintenance timeline event', { error, params });
  }
}

// ============================================================================
// SLO 事件
// ============================================================================

interface SloEventParams {
  sloId: string;
  sloName: string;
  protocol: string;
  chain: string;
  metricType: string;
  complianceRate: number;
  targetValue: number;
  errorBudgetRemaining?: number;
}

/**
 * 记录 SLO 违约事件
 */
export async function hookSloBreached(params: SloEventParams): Promise<void> {
  try {
    await createTimelineEvent({
      eventType: 'alert_triggered',
      severity: 'critical',
      title: `SLO 违约: ${params.sloName}`,
      description: `合规率 ${params.complianceRate.toFixed(2)}% 低于目标值 ${params.targetValue}%`,
      protocol: params.protocol,
      chain: params.chain,
      entityType: 'alert',
      entityId: params.sloId,
      metadata: {
        sloId: params.sloId,
        sloName: params.sloName,
        metricType: params.metricType,
        complianceRate: params.complianceRate,
        targetValue: params.targetValue,
        errorBudgetRemaining: params.errorBudgetRemaining,
        alertType: 'slo_breached',
      },
      source: 'system',
    });
  } catch (error) {
    logger.error('Failed to create SLO breached timeline event', { error, params });
  }
}

/**
 * 记录 Error Budget 告警事件
 */
export async function hookErrorBudgetAlert(
  params: SloEventParams & { daysUntilExhaustion: number }
): Promise<void> {
  try {
    await createTimelineEvent({
      eventType: 'alert_triggered',
      severity: 'warning',
      title: `Error Budget 告警: ${params.sloName}`,
      description: `预计 ${params.daysUntilExhaustion} 天后耗尽`,
      protocol: params.protocol,
      chain: params.chain,
      entityType: 'alert',
      entityId: params.sloId,
      metadata: {
        sloId: params.sloId,
        sloName: params.sloName,
        metricType: params.metricType,
        complianceRate: params.complianceRate,
        errorBudgetRemaining: params.errorBudgetRemaining,
        daysUntilExhaustion: params.daysUntilExhaustion,
        alertType: 'error_budget_low',
      },
      source: 'system',
    });
  } catch (error) {
    logger.error('Failed to create error budget alert timeline event', { error, params });
  }
}

// ============================================================================
// 批量事件创建
// ============================================================================

/**
 * 批量创建事件
 */
export async function hookBatchEvents(events: EventTimelineInput[]): Promise<void> {
  const results = await Promise.allSettled(
    events.map((event) => createTimelineEvent(event))
  );

  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    logger.error(`Failed to create ${failures.length} timeline events`, {
      failures: failures.map((f) => (f as PromiseRejectedResult).reason),
    });
  }
}

// ============================================================================
// 导出所有钩子
// ============================================================================

export const eventHooks = {
  // 告警
  alertTriggered: hookAlertTriggered,
  alertResolved: hookAlertResolved,

  // 争议
  disputeCreated: hookDisputeCreated,
  disputeResolved: hookDisputeResolved,

  // 价格
  priceSpike: hookPriceSpike,
  priceDrop: hookPriceDrop,

  // 部署
  deploymentStarted: hookDeploymentStarted,
  deploymentCompleted: hookDeploymentCompleted,

  // 配置
  configChanged: hookConfigChanged,

  // 修复
  fixCompleted: hookFixCompleted,

  // 维护
  systemMaintenance: hookSystemMaintenance,

  // SLO
  sloBreached: hookSloBreached,
  errorBudgetAlert: hookErrorBudgetAlert,

  // 批量
  batchEvents: hookBatchEvents,
};

export default eventHooks;
