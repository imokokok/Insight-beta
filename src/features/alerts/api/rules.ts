import { SUPPORTED_CHAINS } from '@/config/constants';
import { query } from '@/lib/database/db';
import { withTransaction } from '@/lib/database/dbOptimization';
import { logger } from '@/shared/logger';
import type { SupportedChain } from '@/types/chains';
import { type AlertRuleRow, rowToAlertRule } from '@/types/database/alert';
import type { AlertRule } from '@/types/oracle/alert';
import type { AlertEvent, AlertSeverity } from '@/types/oracle/alert';
import type { OracleProtocol } from '@/types/oracle/protocol';

const SUPPORTED_CHAIN_IDS = SUPPORTED_CHAINS.map((c) => c.id);

const VALID_ALERT_EVENTS: readonly AlertEvent[] = [
  'price_deviation',
  'price_stale',
  'price_volatility_spike',
  'price_update_failed',
  'assertion_created',
  'assertion_expiring',
  'assertion_disputed',
  'assertion_settled',
  'dispute_created',
  'dispute_resolved',
  'voting_period_ending',
  'sync_error',
  'sync_stale',
  'rpc_failure',
  'contract_error',
  'high_latency',
  'low_uptime',
  'rate_limit_hit',
  'liveness_expiring',
  'contract_paused',
  'sync_backlog',
  'backlog_assertions',
  'backlog_disputes',
  'market_stale',
  'execution_delayed',
  'low_participation',
  'high_vote_divergence',
  'high_dispute_rate',
  'slow_api_request',
  'high_error_rate',
  'database_slow_query',
  'low_gas',
] as const;

const VALID_ALERT_SEVERITIES: readonly AlertSeverity[] = [
  'low',
  'medium',
  'high',
  'critical',
  'info',
  'warning',
  'emergency',
] as const;

const VALID_CHANNELS = ['webhook', 'email', 'telegram', 'slack', 'pagerduty'] as const;

function validateAlertEvent(event: string): AlertEvent {
  if (VALID_ALERT_EVENTS.includes(event as AlertEvent)) {
    return event as AlertEvent;
  }
  logger.warn(`Invalid alert event: ${event}, falling back to default 'price_deviation'`);
  return 'price_deviation';
}

function validateAlertSeverity(severity: string): AlertSeverity {
  if (VALID_ALERT_SEVERITIES.includes(severity as AlertSeverity)) {
    return severity as AlertSeverity;
  }
  logger.warn(`Invalid alert severity: ${severity}, falling back to default 'warning'`);
  return 'warning';
}

function validateProtocols(protocols: unknown): OracleProtocol[] | undefined {
  if (!Array.isArray(protocols)) return undefined;
  if (protocols.length === 0) return undefined;
  return protocols.filter((p): p is OracleProtocol => typeof p === 'string');
}

function validateChains(chains: unknown): SupportedChain[] | undefined {
  if (!Array.isArray(chains)) return undefined;
  const validChains = chains.filter(
    (c): c is SupportedChain =>
      typeof c === 'string' && SUPPORTED_CHAIN_IDS.includes(c as SupportedChain),
  );
  return validChains.length > 0 ? validChains : undefined;
}

function validateChannels(channels: unknown): AlertRule['channels'] | undefined {
  if (!Array.isArray(channels)) return undefined;
  const validChannels = channels.filter((c): c is (typeof VALID_CHANNELS)[number] =>
    VALID_CHANNELS.includes(c as (typeof VALID_CHANNELS)[number]),
  );
  return validChannels.length > 0 ? (validChannels as AlertRule['channels']) : undefined;
}

function generateId(): string {
  return `rule-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export interface CreateRuleData {
  name: string;
  enabled?: boolean;
  event: string;
  severity?: string;
  protocols?: string[];
  chains?: string[];
  symbols?: string[];
  params?: Record<string, unknown>;
  channels?: string[];
  recipients?: string[];
  cooldownMinutes?: number;
  maxNotificationsPerHour?: number;
  runbook?: string;
  owner?: string;
}

export interface UpdateRuleData extends Partial<CreateRuleData> {
  silencedUntil?: string;
}

export async function fetchAlertRules(): Promise<AlertRule[]> {
  try {
    const result = await query<AlertRuleRow>('SELECT * FROM alert_rules ORDER BY created_at DESC');
    return result.rows.map(rowToAlertRule);
  } catch (err) {
    logger.error('Failed to fetch alert rules', { error: err });
    throw err;
  }
}

export async function fetchAlertRuleById(id: string): Promise<AlertRule | null> {
  try {
    const result = await query<AlertRuleRow>('SELECT * FROM alert_rules WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return rowToAlertRule(result.rows[0]!);
  } catch (err) {
    logger.error('Failed to fetch alert rule', { error: err });
    throw err;
  }
}

export async function createAlertRule(data: CreateRuleData): Promise<AlertRule> {
  const id = generateId();
  const now = new Date();
  const enabled = data.enabled ?? true;
  const severity = data.severity ?? 'warning';

  await query(
    `INSERT INTO alert_rules (
      id, name, enabled, event, severity, protocols, chains, instances, symbols,
      params, channels, recipients, cooldown_minutes, max_notifications_per_hour,
      runbook, owner, silenced_until, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
    [
      id,
      data.name,
      enabled,
      data.event,
      severity,
      data.protocols ?? null,
      data.chains ?? null,
      null,
      data.symbols ?? null,
      data.params ? JSON.stringify(data.params) : null,
      data.channels ?? null,
      data.recipients ?? null,
      data.cooldownMinutes ?? 5,
      data.maxNotificationsPerHour ?? 10,
      data.runbook ?? null,
      data.owner ?? null,
      null,
      now,
      now,
    ],
  );

  return {
    id,
    name: data.name,
    enabled,
    event: validateAlertEvent(data.event),
    severity: validateAlertSeverity(severity),
    protocols: validateProtocols(data.protocols),
    chains: validateChains(data.chains),
    symbols: data.symbols,
    params: data.params,
    channels: validateChannels(data.channels),
    recipients: data.recipients,
    cooldownMinutes: data.cooldownMinutes ?? 5,
    maxNotificationsPerHour: data.maxNotificationsPerHour ?? 10,
    runbook: data.runbook,
    owner: data.owner,
  };
}

export async function updateAlertRule(id: string, data: UpdateRuleData): Promise<AlertRule | null> {
  try {
    return await withTransaction(async (client) => {
      const existingResult = await client.query<AlertRuleRow>(
        'SELECT * FROM alert_rules WHERE id = $1 FOR UPDATE',
        [id],
      );

      if (existingResult.rows.length === 0) {
        return null;
      }

      const existing = existingResult.rows[0]!;
      const now = new Date();

      const updatedRule = {
        name: data.name ?? existing.name,
        enabled: data.enabled ?? existing.enabled,
        event: data.event ?? existing.event,
        severity: data.severity ?? existing.severity,
        protocols: data.protocols ?? existing.protocols,
        chains: data.chains ?? existing.chains,
        instances: data.chains ? null : existing.instances,
        symbols: data.symbols ?? existing.symbols,
        params: data.params
          ? JSON.stringify(data.params)
          : existing.params
            ? JSON.stringify(existing.params)
            : null,
        channels: data.channels ?? existing.channels,
        recipients: data.recipients ?? existing.recipients,
        cooldown_minutes: data.cooldownMinutes ?? existing.cooldown_minutes,
        max_notifications_per_hour:
          data.maxNotificationsPerHour ?? existing.max_notifications_per_hour,
        runbook: data.runbook ?? existing.runbook,
        owner: data.owner ?? existing.owner,
        silenced_until: data.silencedUntil ? new Date(data.silencedUntil) : existing.silenced_until,
      };

      await client.query(
        `UPDATE alert_rules SET
          name = $2, enabled = $3, event = $4, severity = $5, protocols = $6, chains = $7,
          instances = $8, symbols = $9, params = $10, channels = $11, recipients = $12,
          cooldown_minutes = $13, max_notifications_per_hour = $14, runbook = $15, owner = $16,
          silenced_until = $17, updated_at = $18
        WHERE id = $1`,
        [
          id,
          updatedRule.name,
          updatedRule.enabled,
          updatedRule.event,
          updatedRule.severity,
          updatedRule.protocols,
          updatedRule.chains,
          updatedRule.instances,
          updatedRule.symbols,
          updatedRule.params,
          updatedRule.channels,
          updatedRule.recipients,
          updatedRule.cooldown_minutes,
          updatedRule.max_notifications_per_hour,
          updatedRule.runbook,
          updatedRule.owner,
          updatedRule.silenced_until,
          now,
        ],
      );

      return {
        id,
        name: updatedRule.name,
        enabled: updatedRule.enabled,
        event: validateAlertEvent(updatedRule.event),
        severity: validateAlertSeverity(updatedRule.severity),
        protocols: validateProtocols(updatedRule.protocols),
        chains: validateChains(updatedRule.chains),
        instances: updatedRule.instances ?? undefined,
        symbols: updatedRule.symbols ?? undefined,
        params: updatedRule.params ? JSON.parse(updatedRule.params as string) : undefined,
        channels: validateChannels(updatedRule.channels),
        recipients: updatedRule.recipients ?? undefined,
        cooldownMinutes: updatedRule.cooldown_minutes ?? undefined,
        maxNotificationsPerHour: updatedRule.max_notifications_per_hour ?? undefined,
        runbook: updatedRule.runbook ?? undefined,
        owner: updatedRule.owner ?? undefined,
        silencedUntil: updatedRule.silenced_until?.toISOString() ?? undefined,
      };
    });
  } catch (err) {
    logger.error('Failed to update alert rule', { error: err });
    throw err;
  }
}

export async function deleteAlertRule(id: string): Promise<boolean> {
  try {
    const existingResult = await query<AlertRuleRow>('SELECT * FROM alert_rules WHERE id = $1', [
      id,
    ]);

    if (existingResult.rows.length === 0) {
      return false;
    }

    await query('DELETE FROM alert_rules WHERE id = $1', [id]);
    return true;
  } catch (err) {
    logger.error('Failed to delete alert rule', { error: err });
    throw err;
  }
}

export { SUPPORTED_CHAIN_IDS };
