import type { NextRequest } from 'next/server';

import { SUPPORTED_CHAINS } from '@/config/constants';
import { ok, error } from '@/lib/api/apiResponse';
import { createAlertRuleSchema } from '@/lib/api/validation/schemas';
import {
  parseAlertEvent,
  parseAlertSeverity,
  parseOracleProtocolArray,
  parseSupportedChainArray,
} from '@/lib/api/validation/typeGuards';
import { parseAndValidate } from '@/lib/api/validation/validate';
import { query } from '@/lib/database/db';
import { logger } from '@/shared/logger';
import type { AlertRule } from '@/types/oracle/alert';

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

const SUPPORTED_CHAIN_IDS = SUPPORTED_CHAINS.map((c) => c.id);

function rowToAlertRule(row: AlertRuleRow): AlertRule {
  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    event: parseAlertEvent(row.event),
    severity: parseAlertSeverity(row.severity),
    protocols: parseOracleProtocolArray(row.protocols),
    chains: parseSupportedChainArray(row.chains, SUPPORTED_CHAIN_IDS),
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

export async function GET() {
  try {
    const result = await query<AlertRuleRow>('SELECT * FROM alert_rules ORDER BY created_at DESC');

    const rules = result.rows.map(rowToAlertRule);

    return ok({ rules, total: rules.length, timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('Failed to fetch alert rules', { error: err });
    return error({ code: 'INTERNAL_ERROR', message: 'Failed to fetch alert rules' }, 500);
  }
}

export async function POST(request: NextRequest) {
  const parsed = await parseAndValidate(request, createAlertRuleSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const data = parsed.data;
  const enabled = data.enabled ?? true;
  const severity = data.severity ?? 'warning';

  try {
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

    const newRule: AlertRule = {
      id,
      name: data.name,
      enabled,
      event: data.event,
      severity: parseAlertSeverity(severity),
      protocols: parseOracleProtocolArray(data.protocols),
      chains: parseSupportedChainArray(data.chains, SUPPORTED_CHAIN_IDS),
      symbols: data.symbols,
      params: data.params,
      channels: data.channels as AlertRule['channels'],
      recipients: data.recipients,
      cooldownMinutes: data.cooldownMinutes ?? 5,
      maxNotificationsPerHour: data.maxNotificationsPerHour ?? 10,
      runbook: data.runbook,
      owner: data.owner,
    };

    return ok({ rule: newRule, timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('Failed to create alert rule', { error: err });
    return error({ code: 'INTERNAL_ERROR', message: 'Failed to create alert rule' }, 500);
  }
}
