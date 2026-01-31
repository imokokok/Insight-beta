/**
 * Alert Service - 告警服务
 *
 * 提供价格偏差告警、数据过期告警、系统健康告警等功能
 */

import { query } from '@/server/db';
import type { QueryResultRow } from '@/server/db';
import { logger } from '@/lib/logger';
import type {
  OracleProtocol,
  SupportedChain,
  UnifiedAlert,
  UnifiedAlertRule,
  UnifiedAlertEvent,
} from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// 数据库行类型定义
// ============================================================================

interface AlertRuleRow {
  id: string;
  name: string;
  enabled: boolean;
  event: string;
  severity: string;
  protocols: string[] | null;
  chains: string[] | null;
  instances: string[] | null;
  symbols: string[] | null;
  params: Record<string, unknown> | null;
  channels: string[];
  cooldown_minutes: number;
  max_notifications_per_hour: number;
  created_at: Date;
  updated_at: Date;
}

interface AlertRow {
  id: string;
  rule_id: string | null;
  event: string;
  severity: string;
  title: string;
  message: string;
  protocol: string | null;
  chain: string | null;
  instance_id: string | null;
  symbol: string | null;
  context: Record<string, unknown> | null;
  status: string;
  acknowledged_by: string | null;
  acknowledged_at: Date | null;
  resolved_by: string | null;
  resolved_at: Date | null;
  occurrences: number;
  first_seen_at: Date;
  last_seen_at: Date;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// 告警规则管理
// ============================================================================

export interface AlertRuleConfig {
  id?: string;
  name: string;
  enabled: boolean;
  event: UnifiedAlertEvent;
  severity: 'info' | 'warning' | 'critical';
  protocols?: OracleProtocol[];
  chains?: SupportedChain[];
  instances?: string[];
  symbols?: string[];
  params?: {
    priceDeviationPercent?: number;
    stalenessSeconds?: number;
    minConfidence?: number;
    maxLatencyMs?: number;
    uptimeThreshold?: number;
  };
  channels?: Array<'webhook' | 'email' | 'telegram' | 'slack' | 'pagerduty'>;
  cooldownMinutes?: number;
  maxNotificationsPerHour?: number;
}

/**
 * 创建告警规则
 */
export async function createAlertRule(config: AlertRuleConfig): Promise<UnifiedAlertRule> {
  const result = await query(
    `
    INSERT INTO unified_alert_rules (
      name, enabled, event, severity, protocols, chains, instances, symbols,
      params, channels, cooldown_minutes, max_notifications_per_hour, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
    RETURNING *
    `,
    [
      config.name,
      config.enabled,
      config.event,
      config.severity,
      config.protocols || null,
      config.chains || null,
      config.instances || null,
      config.symbols || null,
      config.params ? JSON.stringify(config.params) : null,
      config.channels || ['webhook'],
      config.cooldownMinutes || 15,
      config.maxNotificationsPerHour || 10,
    ],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error('Failed to create alert rule: no row returned');
  }
  logger.info('Alert rule created', { ruleId: row.id, name: config.name });

  return mapAlertRuleFromDb(row as AlertRuleRow);
}

/**
 * 获取所有告警规则
 */
export async function getAlertRules(enabledOnly: boolean = false): Promise<UnifiedAlertRule[]> {
  let sql = 'SELECT * FROM unified_alert_rules';
  if (enabledOnly) {
    sql += ' WHERE enabled = true';
  }
  sql += ' ORDER BY created_at DESC';

  const result = await query(sql);
  return result.rows.map((row: QueryResultRow) => mapAlertRuleFromDb(row as AlertRuleRow));
}

/**
 * 更新告警规则
 */
export async function updateAlertRule(
  ruleId: string,
  updates: Partial<AlertRuleConfig>,
): Promise<UnifiedAlertRule | null> {
  const setClause: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    setClause.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.enabled !== undefined) {
    setClause.push(`enabled = $${paramIndex++}`);
    values.push(updates.enabled);
  }
  if (updates.severity !== undefined) {
    setClause.push(`severity = $${paramIndex++}`);
    values.push(updates.severity);
  }
  if (updates.protocols !== undefined) {
    setClause.push(`protocols = $${paramIndex++}`);
    values.push(updates.protocols);
  }
  if (updates.chains !== undefined) {
    setClause.push(`chains = $${paramIndex++}`);
    values.push(updates.chains);
  }
  if (updates.params !== undefined) {
    setClause.push(`params = $${paramIndex++}`);
    values.push(JSON.stringify(updates.params));
  }

  setClause.push(`updated_at = NOW()`);
  values.push(ruleId);

  const result = await query(
    `UPDATE unified_alert_rules SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values as (string | number | boolean | Date | null | string[])[],
  );

  if (result.rows.length === 0) return null;
  return mapAlertRuleFromDb(result.rows[0] as AlertRuleRow);
}

/**
 * 删除告警规则
 */
export async function deleteAlertRule(ruleId: string): Promise<boolean> {
  const result = await query('DELETE FROM unified_alert_rules WHERE id = $1', [ruleId]);
  return (result.rowCount ?? 0) > 0;
}

// ============================================================================
// 告警生成与处理
// ============================================================================

export interface AlertContext {
  protocol?: OracleProtocol;
  chain?: SupportedChain;
  instanceId?: string;
  symbol?: string;
  price?: number;
  referencePrice?: number;
  deviationPercent?: number;
  stalenessSeconds?: number;
  timestamp?: Date;
  [key: string]: unknown;
}

/**
 * 生成告警
 */
export async function generateAlert(
  ruleId: string,
  event: UnifiedAlertEvent,
  severity: 'info' | 'warning' | 'critical',
  title: string,
  message: string,
  context: AlertContext,
): Promise<UnifiedAlert> {
  // 检查冷却期
  const cooldownCheck = await query(
    `
    SELECT created_at FROM unified_alerts
    WHERE rule_id = $1 AND event = $2 AND status = 'open'
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [ruleId, event],
  );

  if (cooldownCheck.rows.length > 0) {
    const lastAlertRow = cooldownCheck.rows[0];
    if (lastAlertRow && lastAlertRow.created_at) {
      const lastAlert = new Date(lastAlertRow.created_at);
      const cooldownMinutes = 15; // 默认冷却时间
      const cooldownEnd = new Date(lastAlert.getTime() + cooldownMinutes * 60 * 1000);

      if (new Date() < cooldownEnd) {
        // 在冷却期内，增加计数而不是创建新告警
        await query(
          `
          UPDATE unified_alerts
          SET occurrences = occurrences + 1, last_seen_at = NOW()
          WHERE rule_id = $1 AND event = $2 AND status = 'open'
          `,
          [ruleId, event],
        );

        logger.debug('Alert suppressed due to cooldown', { ruleId, event });
      }
    }
  }

  const result = await query(
    `
    INSERT INTO unified_alerts (
      rule_id, event, severity, title, message, protocol, chain, instance_id, symbol,
      context, status, occurrences, first_seen_at, last_seen_at, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(), NOW(), NOW())
    ON CONFLICT (rule_id, event, protocol, chain, symbol, created_at)
    DO UPDATE SET
      occurrences = unified_alerts.occurrences + 1,
      last_seen_at = NOW(),
      updated_at = NOW()
    RETURNING *
    `,
    [
      ruleId,
      event,
      severity,
      title,
      message,
      context.protocol || null,
      context.chain || null,
      context.instanceId || null,
      context.symbol || null,
      JSON.stringify(context),
      'open',
      1,
    ],
  );

  const alertRow = result.rows[0];
  if (!alertRow) {
    throw new Error('Failed to generate alert: no row returned');
  }
  const alert = mapAlertFromDb(alertRow as AlertRow);
  logger.info('Alert generated', { alertId: alert.id, event, severity });

  // 发送通知
  await sendNotification(alert);

  return alert;
}

/**
 * 获取告警列表
 */
export async function getAlerts(filters?: {
  status?: 'open' | 'acknowledged' | 'resolved';
  severity?: 'info' | 'warning' | 'critical';
  protocol?: OracleProtocol;
  chain?: SupportedChain;
  limit?: number;
}): Promise<UnifiedAlert[]> {
  let sql = 'SELECT * FROM unified_alerts WHERE 1=1';
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters?.status) {
    sql += ` AND status = $${paramIndex++}`;
    params.push(filters.status);
  }
  if (filters?.severity) {
    sql += ` AND severity = $${paramIndex++}`;
    params.push(filters.severity);
  }
  if (filters?.protocol) {
    sql += ` AND protocol = $${paramIndex++}`;
    params.push(filters.protocol);
  }
  if (filters?.chain) {
    sql += ` AND chain = $${paramIndex++}`;
    params.push(filters.chain);
  }

  sql += ' ORDER BY created_at DESC';

  if (filters?.limit) {
    sql += ` LIMIT $${paramIndex++}`;
    params.push(filters.limit);
  }

  const result = await query(sql, params as (string | number | boolean | null | Date | string[])[]);
  return result.rows.map((row: QueryResultRow) => mapAlertFromDb(row as AlertRow));
}

/**
 * 确认告警
 */
export async function acknowledgeAlert(
  alertId: string,
  acknowledgedBy: string,
): Promise<UnifiedAlert | null> {
  const result = await query(
    `
    UPDATE unified_alerts
    SET status = 'acknowledged', acknowledged_by = $2, acknowledged_at = NOW(), updated_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [alertId, acknowledgedBy],
  );

  if (result.rows.length === 0) return null;
  logger.info('Alert acknowledged', { alertId, acknowledgedBy });
  return mapAlertFromDb(result.rows[0] as AlertRow);
}

/**
 * 解决告警
 */
export async function resolveAlert(
  alertId: string,
  resolvedBy: string,
): Promise<UnifiedAlert | null> {
  const result = await query(
    `
    UPDATE unified_alerts
    SET status = 'resolved', resolved_by = $2, resolved_at = NOW(), updated_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [alertId, resolvedBy],
  );

  if (result.rows.length === 0) return null;
  logger.info('Alert resolved', { alertId, resolvedBy });
  return mapAlertFromDb(result.rows[0] as AlertRow);
}

// ============================================================================
// 价格偏差告警检测
// ============================================================================

export interface PriceDeviationCheck {
  symbol: string;
  protocol: OracleProtocol;
  chain: SupportedChain;
  price: number;
  referencePrice: number;
  deviationPercent: number;
  threshold: number;
}

/**
 * 检测价格偏差并生成告警
 */
export async function checkPriceDeviation(
  check: PriceDeviationCheck,
  ruleId: string,
): Promise<UnifiedAlert | null> {
  const { symbol, protocol, chain, price, referencePrice, deviationPercent, threshold } = check;

  if (Math.abs(deviationPercent) < threshold) {
    return null; // 偏差在阈值内，不生成告警
  }

  const severity: 'warning' | 'critical' =
    Math.abs(deviationPercent) > threshold * 2 ? 'critical' : 'warning';

  const title = `价格偏差告警: ${symbol}`;
  const message = `${protocol} 在 ${chain} 上的 ${symbol} 价格偏离参考价格 ${Math.abs(deviationPercent).toFixed(2)}%`;

  return generateAlert(ruleId, 'price_deviation', severity, title, message, {
    protocol,
    chain,
    symbol,
    price,
    referencePrice,
    deviationPercent,
    timestamp: new Date(),
  });
}

/**
 * 批量检测价格偏差
 */
export async function batchCheckPriceDeviations(
  checks: PriceDeviationCheck[],
  ruleId: string,
): Promise<UnifiedAlert[]> {
  const alerts: UnifiedAlert[] = [];

  for (const check of checks) {
    try {
      const alert = await checkPriceDeviation(check, ruleId);
      if (alert) alerts.push(alert);
    } catch (error) {
      logger.error('Failed to check price deviation', { error, check });
    }
  }

  return alerts;
}

// ============================================================================
// 数据过期告警检测
// ============================================================================

export interface StalenessCheck {
  symbol: string;
  protocol: OracleProtocol;
  chain: SupportedChain;
  instanceId: string;
  lastUpdateTimestamp: Date;
  stalenessSeconds: number;
  thresholdSeconds: number;
}

/**
 * 检测数据过期并生成告警
 */
export async function checkDataStaleness(
  check: StalenessCheck,
  ruleId: string,
): Promise<UnifiedAlert | null> {
  const { symbol, protocol, chain, instanceId, stalenessSeconds, thresholdSeconds } = check;

  if (stalenessSeconds < thresholdSeconds) {
    return null; // 数据未过期
  }

  const severity: 'warning' | 'critical' =
    stalenessSeconds > thresholdSeconds * 2 ? 'critical' : 'warning';

  const title = `数据过期告警: ${symbol}`;
  const message = `${protocol} 在 ${chain} 上的 ${symbol} 数据已过期 ${Math.floor(stalenessSeconds / 60)} 分钟`;

  return generateAlert(ruleId, 'price_stale', severity, title, message, {
    protocol,
    chain,
    instanceId,
    symbol,
    stalenessSeconds,
    thresholdSeconds,
    timestamp: new Date(),
  });
}

/**
 * 扫描所有价格数据，检测过期数据
 */
export async function scanForStaleData(
  stalenessThresholdSeconds: number = 300, // 5分钟
  ruleId: string = 'default-stale-rule',
): Promise<UnifiedAlert[]> {
  const result = await query(
    `
    SELECT DISTINCT ON (protocol, chain, symbol)
      protocol, chain, symbol, instance_id, timestamp,
      EXTRACT(EPOCH FROM (NOW() - timestamp)) as staleness_seconds
    FROM unified_price_feeds
    WHERE is_stale = false
    ORDER BY protocol, chain, symbol, timestamp DESC
    `,
  );

  const alerts: UnifiedAlert[] = [];

  for (const row of result.rows) {
    const stalenessSeconds = parseFloat(row.staleness_seconds);

    if (stalenessSeconds > stalenessThresholdSeconds) {
      const alert = await checkDataStaleness(
        {
          symbol: row.symbol,
          protocol: row.protocol as OracleProtocol,
          chain: row.chain as SupportedChain,
          instanceId: row.instance_id,
          lastUpdateTimestamp: new Date(row.timestamp),
          stalenessSeconds,
          thresholdSeconds: stalenessThresholdSeconds,
        },
        ruleId,
      );

      if (alert) alerts.push(alert);
    }
  }

  logger.info('Stale data scan completed', { scanned: result.rows.length, alerts: alerts.length });
  return alerts;
}

// ============================================================================
// 同步健康告警
// ============================================================================

/**
 * 检测同步异常并生成告警
 */
export async function checkSyncHealth(
  instanceId: string,
  protocol: OracleProtocol,
  chain: SupportedChain,
): Promise<UnifiedAlert[]> {
  const alerts: UnifiedAlert[] = [];

  const syncState = await query('SELECT * FROM unified_sync_state WHERE instance_id = $1', [
    instanceId,
  ]);

  if (syncState.rows.length === 0) return alerts;

  const state = syncState.rows[0] as {
    status: string;
    last_error?: string;
    lag_blocks?: number;
    consecutive_failures?: number;
  };

  // 检查同步状态
  if (state.status === 'error') {
    const alert = await generateAlert(
      'sync-health-rule',
      'sync_error',
      'critical',
      `同步错误: ${protocol} - ${chain}`,
      `实例 ${instanceId} 同步失败: ${state.last_error || 'Unknown error'}`,
      {
        protocol,
        chain,
        instanceId,
        error: state.last_error,
        timestamp: new Date(),
      },
    );
    alerts.push(alert);
  }

  // 检查同步延迟
  if (state.lag_blocks && state.lag_blocks > 100) {
    const alert = await generateAlert(
      'sync-lag-rule',
      'sync_stale',
      'warning',
      `同步延迟: ${protocol} - ${chain}`,
      `实例 ${instanceId} 落后 ${state.lag_blocks} 个区块`,
      {
        protocol,
        chain,
        instanceId,
        lagBlocks: state.lag_blocks,
        timestamp: new Date(),
      },
    );
    alerts.push(alert);
  }

  return alerts;
}

// ============================================================================
// 通知发送
// ============================================================================

async function sendNotification(alert: UnifiedAlert): Promise<void> {
  // Webhook 通知
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId: alert.id,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          protocol: alert.protocol,
          chain: alert.chain,
          timestamp: alert.createdAt,
        }),
      });
    } catch (error) {
      logger.error('Failed to send webhook notification', { error, alertId: alert.id });
    }
  }

  // 这里可以添加其他通知渠道：邮件、Telegram、Slack 等
}

// ============================================================================
// 告警统计
// ============================================================================

export interface AlertStats {
  total: number;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  byProtocol: Record<string, number>;
  recent24h: number;
  avgResolutionTimeMinutes: number;
}

/**
 * 获取告警统计
 */
export async function getAlertStats(timeRangeHours: number = 24): Promise<AlertStats> {
  const [
    totalResult,
    bySeverityResult,
    byStatusResult,
    byProtocolResult,
    recentResult,
    resolutionResult,
  ] = await Promise.all([
    query('SELECT COUNT(*) as total FROM unified_alerts'),
    query('SELECT severity, COUNT(*) as count FROM unified_alerts GROUP BY severity'),
    query('SELECT status, COUNT(*) as count FROM unified_alerts GROUP BY status'),
    query(
      'SELECT protocol, COUNT(*) as count FROM unified_alerts WHERE protocol IS NOT NULL GROUP BY protocol',
    ),
    query(
      `SELECT COUNT(*) as count FROM unified_alerts WHERE created_at > NOW() - INTERVAL '${timeRangeHours} hours'`,
    ),
    query(
      `
      SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60) as avg_minutes
      FROM unified_alerts
      WHERE status = 'resolved' AND resolved_at IS NOT NULL
      `,
    ),
  ]);

  return {
    total: parseInt(totalResult.rows[0]?.total || 0),
    bySeverity: Object.fromEntries(
      bySeverityResult.rows.map((r) => [r.severity, parseInt(r.count)]),
    ),
    byStatus: Object.fromEntries(byStatusResult.rows.map((r) => [r.status, parseInt(r.count)])),
    byProtocol: Object.fromEntries(
      byProtocolResult.rows.map((r) => [r.protocol, parseInt(r.count)]),
    ),
    recent24h: parseInt(recentResult.rows[0]?.count || 0),
    avgResolutionTimeMinutes: Math.round(parseFloat(resolutionResult.rows[0]?.avg_minutes || 0)),
  };
}

// ============================================================================
// 辅助函数
// ============================================================================

// AlertRuleRow and AlertRow are defined at the top of the file

function mapAlertRuleFromDb(row: AlertRuleRow): UnifiedAlertRule {
  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    event: row.event as UnifiedAlertEvent,
    severity: row.severity as 'info' | 'warning' | 'critical',
    protocols: row.protocols ? (row.protocols as OracleProtocol[]) : undefined,
    chains: row.chains ? (row.chains as SupportedChain[]) : undefined,
    instances: row.instances || undefined,
    symbols: row.symbols || undefined,
    params: row.params ? (row.params as Record<string, unknown>) : undefined,
    channels: (row.channels || ['webhook']) as Array<'email' | 'webhook' | 'telegram' | 'slack' | 'pagerduty'>,
    cooldownMinutes: row.cooldown_minutes,
    maxNotificationsPerHour: row.max_notifications_per_hour,
  };
}

// AlertRow is defined at the top of the file

function mapAlertFromDb(row: AlertRow): UnifiedAlert {
  return {
    id: row.id,
    ruleId: row.rule_id || undefined,
    event: row.event as UnifiedAlertEvent,
    severity: row.severity as 'info' | 'warning' | 'critical',
    title: row.title,
    message: row.message,
    protocol: row.protocol ? (row.protocol as OracleProtocol) : undefined,
    chain: row.chain ? (row.chain as SupportedChain) : undefined,
    instanceId: row.instance_id || undefined,
    symbol: row.symbol || undefined,
    context: row.context ? (row.context as Record<string, unknown>) : {},
    status: row.status as 'open' | 'acknowledged' | 'resolved',
    acknowledgedBy: row.acknowledged_by || undefined,
    acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at).toISOString() : undefined,
    resolvedBy: row.resolved_by || undefined,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : undefined,
    occurrences: row.occurrences,
    firstSeenAt: new Date(row.first_seen_at).toISOString(),
    lastSeenAt: new Date(row.last_seen_at).toISOString(),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}
