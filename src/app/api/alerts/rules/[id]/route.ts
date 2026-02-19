import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

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
      return NextResponse.json({ ok: false, error: 'Alert rule not found' }, { status: 404 });
    }

    const rule = rowToAlertRule(result.rows[0]!);

    return NextResponse.json({
      ok: true,
      data: rule,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to fetch alert rule', { error });
    return NextResponse.json({ ok: false, error: 'Failed to fetch alert rule' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingResult = await query<AlertRuleRow>('SELECT * FROM alert_rules WHERE id = $1', [
      id,
    ]);

    if (existingResult.rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Alert rule not found' }, { status: 404 });
    }

    const existing = existingResult.rows[0]!;

    const updatedFields = {
      name: (body.name ?? existing.name) as string,
      enabled: (body.enabled ?? existing.enabled) as boolean,
      event: (body.event ?? existing.event) as string,
      severity: (body.severity ?? existing.severity) as string,
      protocols: (body.protocols ?? existing.protocols) as string[] | null,
      chains: (body.chains ?? existing.chains) as string[] | null,
      instances: (body.instances ?? existing.instances) as string[] | null,
      symbols: (body.symbols ?? existing.symbols) as string[] | null,
      params: (body.params !== undefined
        ? JSON.stringify(body.params)
        : existing.params
          ? JSON.stringify(existing.params)
          : null) as string | null,
      channels: (body.channels ?? existing.channels) as string[] | null,
      recipients: (body.recipients ?? existing.recipients) as string[] | null,
      cooldown_minutes: (body.cooldownMinutes ?? existing.cooldown_minutes) as number | null,
      max_notifications_per_hour: (body.maxNotificationsPerHour ??
        existing.max_notifications_per_hour) as number | null,
      runbook: (body.runbook ?? existing.runbook) as string | null,
      owner: (body.owner ?? existing.owner) as string | null,
      silenced_until:
        body.silencedUntil !== undefined
          ? ((body.silencedUntil ? new Date(body.silencedUntil) : null) as Date | null)
          : existing.silenced_until,
      updated_at: new Date() as Date,
    };

    await query(
      `UPDATE alert_rules SET 
        name = $2, enabled = $3, event = $4, severity = $5, protocols = $6,
        chains = $7, instances = $8, symbols = $9, params = $10, channels = $11,
        recipients = $12, cooldown_minutes = $13, max_notifications_per_hour = $14,
        runbook = $15, owner = $16, silenced_until = $17, updated_at = $18
      WHERE id = $1`,
      [
        id,
        updatedFields.name,
        updatedFields.enabled,
        updatedFields.event,
        updatedFields.severity,
        updatedFields.protocols,
        updatedFields.chains,
        updatedFields.instances,
        updatedFields.symbols,
        updatedFields.params,
        updatedFields.channels,
        updatedFields.recipients,
        updatedFields.cooldown_minutes,
        updatedFields.max_notifications_per_hour,
        updatedFields.runbook,
        updatedFields.owner,
        updatedFields.silenced_until,
        updatedFields.updated_at,
      ],
    );

    const updatedRule: AlertRule = {
      id,
      name: updatedFields.name,
      enabled: updatedFields.enabled,
      event: updatedFields.event as AlertEvent,
      severity: updatedFields.severity as AlertSeverity,
      protocols: (updatedFields.protocols as OracleProtocol[]) ?? undefined,
      chains: (updatedFields.chains as SupportedChain[]) ?? undefined,
      instances: updatedFields.instances ?? undefined,
      symbols: updatedFields.symbols ?? undefined,
      params: body.params ?? existing.params ?? undefined,
      channels: updatedFields.channels as AlertRule['channels'],
      recipients: updatedFields.recipients ?? undefined,
      cooldownMinutes: updatedFields.cooldown_minutes ?? undefined,
      maxNotificationsPerHour: updatedFields.max_notifications_per_hour ?? undefined,
      runbook: updatedFields.runbook ?? undefined,
      owner: updatedFields.owner ?? undefined,
      silencedUntil: updatedFields.silenced_until
        ? updatedFields.silenced_until.toISOString()
        : undefined,
    };

    return NextResponse.json({
      ok: true,
      data: updatedRule,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to update alert rule', { error });
    return NextResponse.json({ ok: false, error: 'Failed to update alert rule' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const result = await query('DELETE FROM alert_rules WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return NextResponse.json({ ok: false, error: 'Alert rule not found' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      message: 'Alert rule deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to delete alert rule', { error });
    return NextResponse.json({ ok: false, error: 'Failed to delete alert rule' }, { status: 500 });
  }
}
