import { SUPPORTED_CHAINS } from '@/config/constants';
import {
  parseAlertEvent,
  parseAlertSeverity,
  parseOracleProtocolArray,
  parseSupportedChainArray,
} from '@/lib/api/validation/typeGuards';
import type { AlertRule } from '@/types/oracle/alert';

export interface AlertRuleRow {
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

export function rowToAlertRule(row: AlertRuleRow): AlertRule {
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
