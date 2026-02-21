import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';
import { query } from '@/lib/database/db';
import { logger } from '@/shared/logger';
import type { SupportedChain } from '@/types/chains';
import type { AlertRule, AlertEvent, AlertSeverity } from '@/types/oracle/alert';
import type { OracleProtocol } from '@/types/oracle/protocol';

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
  channels: string[] | null;
  recipients: string[] | null;
  cooldown_minutes: number | null;
  max_notifications_per_hour: number | null;
  runbook: string | null;
  owner: string | null;
  silenced_until: Date | null;
  created_at: Date;
  updated_at: Date;
}

function rowToAlertRule(row: AlertRuleRow): AlertRule {
  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    event: row.event as AlertEvent,
    severity: row.severity as AlertSeverity,
    protocols: (row.protocols as OracleProtocol[]) ?? undefined,
    chains: (row.chains as SupportedChain[]) ?? undefined,
    instances: row.instances ?? undefined,
    symbols: row.symbols ?? undefined,
    params: row.params ?? undefined,
    channels: (row.channels as AlertRule['channels']) ?? undefined,
    recipients: row.recipients ?? undefined,
    cooldownMinutes: row.cooldown_minutes ?? undefined,
    maxNotificationsPerHour: row.max_notifications_per_hour ?? undefined,
    runbook: row.runbook ?? undefined,
    owner: row.owner ?? undefined,
    silencedUntil: row.silenced_until?.toISOString() ?? undefined,
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const result = await query<AlertRuleRow>('SELECT * FROM alert_rules WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return error({ code: 'NOT_FOUND', message: 'Alert rule not found' }, 404);
    }

    const rule = rowToAlertRule(result.rows[0]!);

    return ok({ rule, timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('Failed to fetch alert rule', { error: err });
    return error({ code: 'INTERNAL_ERROR', message: 'Failed to fetch alert rule' }, 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingResult = await query<AlertRuleRow>('SELECT * FROM alert_rules WHERE id = $1', [
      id,
    ]);

    if (existingResult.rows.length === 0) {
      return error({ code: 'NOT_FOUND', message: 'Alert rule not found' }, 404);
    }

    const existing = existingResult.rows[0]!;
    const now = new Date();

    const updatedRule = {
      name: body.name ?? existing.name,
      enabled: body.enabled ?? existing.enabled,
      event: body.event ?? existing.event,
      severity: body.severity ?? existing.severity,
      protocols: body.protocols ?? existing.protocols,
      chains: body.chains ?? existing.chains,
      instances: body.instances ?? existing.instances,
      symbols: body.symbols ?? existing.symbols,
      params: body.params
        ? JSON.stringify(body.params)
        : existing.params
          ? JSON.stringify(existing.params)
          : null,
      channels: body.channels ?? existing.channels,
      recipients: body.recipients ?? existing.recipients,
      cooldown_minutes: body.cooldownMinutes ?? existing.cooldown_minutes,
      max_notifications_per_hour:
        body.maxNotificationsPerHour ?? existing.max_notifications_per_hour,
      runbook: body.runbook ?? existing.runbook,
      owner: body.owner ?? existing.owner,
      silenced_until: body.silencedUntil ? new Date(body.silencedUntil) : existing.silenced_until,
    };

    await query(
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

    const rule: AlertRule = {
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

    return ok({ rule, timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('Failed to update alert rule', { error: err });
    return error({ code: 'INTERNAL_ERROR', message: 'Failed to update alert rule' }, 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const existingResult = await query<AlertRuleRow>('SELECT * FROM alert_rules WHERE id = $1', [
      id,
    ]);

    if (existingResult.rows.length === 0) {
      return error({ code: 'NOT_FOUND', message: 'Alert rule not found' }, 404);
    }

    await query('DELETE FROM alert_rules WHERE id = $1', [id]);

    return ok({
      success: true,
      message: 'Alert rule deleted',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Failed to delete alert rule', { error: err });
    return error({ code: 'INTERNAL_ERROR', message: 'Failed to delete alert rule' }, 500);
  }
}
