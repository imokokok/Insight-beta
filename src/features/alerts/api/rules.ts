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
    event: data.event as AlertEvent,
    severity: severity as AlertSeverity,
    protocols: data.protocols as OracleProtocol[] | undefined,
    chains: data.chains as SupportedChain[] | undefined,
    symbols: data.symbols,
    params: data.params,
    channels: data.channels as AlertRule['channels'],
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
        event: updatedRule.event as AlertEvent,
        severity: updatedRule.severity as AlertSeverity,
        protocols: (updatedRule.protocols as OracleProtocol[]) ?? undefined,
        chains: (updatedRule.chains as SupportedChain[]) ?? undefined,
        instances: updatedRule.instances ?? undefined,
        symbols: updatedRule.symbols ?? undefined,
        params: updatedRule.params ? JSON.parse(updatedRule.params as string) : undefined,
        channels: (updatedRule.channels as AlertRule['channels']) ?? undefined,
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
