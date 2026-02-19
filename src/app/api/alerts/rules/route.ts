import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
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

function generateId(): string {
  return `rule-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

async function handleGet(): Promise<NextResponse> {
  try {
    const result = await query<AlertRuleRow>('SELECT * FROM alert_rules ORDER BY created_at DESC');

    const rules = result.rows.map(rowToAlertRule);

    return NextResponse.json({
      ok: true,
      rules,
      total: rules.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to fetch alert rules', { error });
    return NextResponse.json({ ok: false, error: 'Failed to fetch alert rules' }, { status: 500 });
  }
}

async function handlePost(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    if (!body.name || !body.event) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: name, event' },
        { status: 400 },
      );
    }

    const id = generateId();
    const now = new Date();

    await query(
      `INSERT INTO alert_rules (
        id, name, enabled, event, severity, protocols, chains, instances, symbols,
        params, channels, recipients, cooldown_minutes, max_notifications_per_hour,
        runbook, owner, silenced_until, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [
        id,
        body.name,
        body.enabled ?? true,
        body.event,
        body.severity || 'warning',
        body.protocols ?? null,
        body.chains ?? null,
        body.instances ?? null,
        body.symbols ?? null,
        body.params ? JSON.stringify(body.params) : null,
        body.channels ?? null,
        body.recipients ?? null,
        body.cooldownMinutes ?? 5,
        body.maxNotificationsPerHour ?? 10,
        body.runbook ?? null,
        body.owner ?? null,
        body.silencedUntil ? new Date(body.silencedUntil) : null,
        now,
        now,
      ],
    );

    const newRule: AlertRule = {
      id,
      name: body.name,
      enabled: body.enabled ?? true,
      event: body.event as AlertEvent,
      severity: (body.severity as AlertSeverity) || 'warning',
      protocols: body.protocols,
      chains: body.chains,
      instances: body.instances,
      symbols: body.symbols,
      params: body.params,
      channels: body.channels || ['webhook'],
      recipients: body.recipients || [],
      cooldownMinutes: body.cooldownMinutes ?? 5,
      maxNotificationsPerHour: body.maxNotificationsPerHour ?? 10,
      runbook: body.runbook,
      owner: body.owner,
    };

    return NextResponse.json({
      ok: true,
      data: newRule,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to create alert rule', { error });
    return NextResponse.json({ ok: false, error: 'Failed to create alert rule' }, { status: 500 });
  }
}

export const GET = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  auth: { required: true },
  validate: { allowedMethods: ['GET'] },
})(handleGet);

export const POST = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  auth: { required: true },
  validate: { allowedMethods: ['POST'] },
})(handlePost);
