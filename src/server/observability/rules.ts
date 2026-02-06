/**
 * Rules Module - 告警规则管理模块
 *
 * 支持告警规则的读取、写入、规范化处理
 */

import type { AlertRule, AlertRuleEvent, AlertSeverity } from '@/lib/types/oracleTypes';
import { hasDatabase } from '@/server/db';
import { readJsonFile, writeJsonFile } from '@/server/kvStore';
import { ensureSchema } from '@/server/schema';

import { VALID_RULE_EVENTS, VALID_SEVERITIES, ALERT_RULES_KEY } from './constants';

let schemaEnsured = false;
async function ensureDb() {
  if (!hasDatabase()) return;
  if (!schemaEnsured) {
    await ensureSchema();
    schemaEnsured = true;
  }
}

function normalizeRuleChannels(
  channels: unknown,
  recipient: string | null,
): Array<'webhook' | 'email' | 'telegram'> {
  const raw = Array.isArray(channels) && channels.length > 0 ? channels : ['webhook'];
  const out: Array<'webhook' | 'email' | 'telegram'> = [];
  for (const c of raw) {
    if (c !== 'webhook' && c !== 'email' && c !== 'telegram') continue;
    if (!out.includes(c)) out.push(c);
  }
  const safe: Array<'webhook' | 'email' | 'telegram'> =
    out.length > 0 ? out : (['webhook'] as Array<'webhook' | 'email' | 'telegram'>);
  if (safe.includes('email') && !recipient) {
    const withoutEmail = safe.filter((c) => c !== 'email');
    return withoutEmail.length > 0
      ? (withoutEmail as Array<'webhook' | 'email' | 'telegram'>)
      : (['webhook'] as Array<'webhook' | 'email' | 'telegram'>);
  }
  return safe;
}

function normalizeRuleParams(
  event: AlertRuleEvent,
  params: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  const p = params ?? {};
  const getNumber = (key: string) => {
    if (!Object.hasOwn(p, key)) return NaN;
    return Number(p[key]);
  };
  const setNumber = (key: string, value: number) => ({ ...p, [key]: value });
  const setNumbers = (pairs: Array<[string, number]>) => {
    let out = { ...p };
    for (const [k, v] of pairs) out = { ...out, [k]: v };
    return out;
  };

  if (event === 'stale_sync') {
    const maxAgeMs = getNumber('maxAgeMs');
    const v = Number.isFinite(maxAgeMs) && maxAgeMs > 0 ? maxAgeMs : 5 * 60 * 1000;
    return setNumber('maxAgeMs', v);
  }

  if (event === 'sync_backlog') {
    const maxLagBlocks = getNumber('maxLagBlocks');
    const v = Number.isFinite(maxLagBlocks) && maxLagBlocks > 0 ? maxLagBlocks : 200;
    return setNumber('maxLagBlocks', v);
  }

  if (event === 'backlog_assertions') {
    const maxOpenAssertions = getNumber('maxOpenAssertions');
    const v = Number.isFinite(maxOpenAssertions) && maxOpenAssertions > 0 ? maxOpenAssertions : 50;
    return setNumber('maxOpenAssertions', v);
  }

  if (event === 'backlog_disputes') {
    const maxOpenDisputes = getNumber('maxOpenDisputes');
    const v = Number.isFinite(maxOpenDisputes) && maxOpenDisputes > 0 ? maxOpenDisputes : 20;
    return setNumber('maxOpenDisputes', v);
  }

  if (event === 'market_stale') {
    const maxAgeMs = getNumber('maxAgeMs');
    const v = Number.isFinite(maxAgeMs) && maxAgeMs > 0 ? maxAgeMs : 6 * 60 * 60_000;
    return setNumber('maxAgeMs', v);
  }

  if (event === 'execution_delayed') {
    const maxDelayMinutes = getNumber('maxDelayMinutes');
    const v = Number.isFinite(maxDelayMinutes) && maxDelayMinutes > 0 ? maxDelayMinutes : 30;
    return setNumber('maxDelayMinutes', v);
  }

  if (event === 'low_participation') {
    const withinMinutes = getNumber('withinMinutes');
    const minTotalVotes = getNumber('minTotalVotes');
    const safeWithin = Number.isFinite(withinMinutes) && withinMinutes > 0 ? withinMinutes : 60;
    const safeMin = Number.isFinite(minTotalVotes) && minTotalVotes >= 0 ? minTotalVotes : 0;
    return setNumbers([
      ['withinMinutes', safeWithin],
      ['minTotalVotes', safeMin],
    ]);
  }

  if (event === 'liveness_expiring') {
    const withinMinutes = getNumber('withinMinutes');
    const safeWithin = Number.isFinite(withinMinutes) && withinMinutes > 0 ? withinMinutes : 60;
    return setNumber('withinMinutes', safeWithin);
  }

  if (event === 'price_deviation') {
    const thresholdPercent = getNumber('thresholdPercent');
    const v = Number.isFinite(thresholdPercent) && thresholdPercent > 0 ? thresholdPercent : 2;
    return setNumber('thresholdPercent', v);
  }

  if (event === 'low_gas') {
    const minBalanceEth = getNumber('minBalanceEth');
    const v = Number.isFinite(minBalanceEth) && minBalanceEth > 0 ? minBalanceEth : 0.1;
    return setNumber('minBalanceEth', v);
  }

  if (event === 'high_vote_divergence') {
    const withinMinutes = getNumber('withinMinutes');
    const minTotalVotes = getNumber('minTotalVotes');
    const maxMarginPercent = getNumber('maxMarginPercent');
    const safeWithin = Number.isFinite(withinMinutes) && withinMinutes > 0 ? withinMinutes : 60;
    const safeMin = Number.isFinite(minTotalVotes) && minTotalVotes > 0 ? minTotalVotes : 1;
    const safeMargin =
      Number.isFinite(maxMarginPercent) && maxMarginPercent > 0 && maxMarginPercent <= 100
        ? maxMarginPercent
        : 10;
    return setNumbers([
      ['withinMinutes', safeWithin],
      ['minTotalVotes', safeMin],
      ['maxMarginPercent', safeMargin],
    ]);
  }

  if (event === 'high_dispute_rate') {
    const windowDays = getNumber('windowDays');
    const minAssertions = getNumber('minAssertions');
    const thresholdPercent = getNumber('thresholdPercent');
    const safeDays = Number.isFinite(windowDays) && windowDays > 0 ? windowDays : 7;
    const safeMin = Number.isFinite(minAssertions) && minAssertions > 0 ? minAssertions : 20;
    const safeThreshold =
      Number.isFinite(thresholdPercent) && thresholdPercent > 0 && thresholdPercent <= 100
        ? thresholdPercent
        : 10;
    return setNumbers([
      ['windowDays', safeDays],
      ['minAssertions', safeMin],
      ['thresholdPercent', safeThreshold],
    ]);
  }

  if (event === 'slow_api_request') {
    const thresholdMs = getNumber('thresholdMs');
    const v = Number.isFinite(thresholdMs) && thresholdMs > 0 ? thresholdMs : 1000;
    return setNumber('thresholdMs', v);
  }

  if (event === 'database_slow_query') {
    const thresholdMs = getNumber('thresholdMs');
    const v = Number.isFinite(thresholdMs) && thresholdMs > 0 ? thresholdMs : 200;
    return setNumber('thresholdMs', v);
  }

  if (event === 'high_error_rate') {
    const thresholdPercent = getNumber('thresholdPercent');
    const windowMinutes = getNumber('windowMinutes');
    const safeThreshold =
      Number.isFinite(thresholdPercent) && thresholdPercent > 0 && thresholdPercent <= 100
        ? thresholdPercent
        : 5;
    const safeWindow = Number.isFinite(windowMinutes) && windowMinutes > 0 ? windowMinutes : 5;
    return { ...p, thresholdPercent: safeThreshold, windowMinutes: safeWindow };
  }

  return params;
}

function normalizeStoredRule(input: unknown): AlertRule | null {
  if (!input || typeof input !== 'object') return null;
  const obj = input as Record<string, unknown>;

  const id = typeof obj.id === 'string' ? obj.id.trim() : '';
  if (!id) return null;

  const event = typeof obj.event === 'string' ? obj.event : '';
  if (!VALID_RULE_EVENTS.includes(event as AlertRuleEvent)) return null;
  const safeEvent = event as AlertRuleEvent;

  const name = typeof obj.name === 'string' && obj.name.trim() ? obj.name.trim() : id;
  const enabled = typeof obj.enabled === 'boolean' ? obj.enabled : true;

  const severityRaw = typeof obj.severity === 'string' ? obj.severity : '';
  const severity = VALID_SEVERITIES.includes(severityRaw as AlertSeverity)
    ? (severityRaw as AlertSeverity)
    : 'warning';

  const recipient =
    typeof obj.recipient === 'string' && obj.recipient.trim() ? obj.recipient.trim() : null;

  const owner = typeof obj.owner === 'string' && obj.owner.trim() ? obj.owner.trim() : null;

  const runbook = typeof obj.runbook === 'string' && obj.runbook.trim() ? obj.runbook.trim() : null;

  const silencedUntilRaw = typeof obj.silencedUntil === 'string' ? obj.silencedUntil.trim() : '';
  const silencedUntilMs = silencedUntilRaw ? Date.parse(silencedUntilRaw) : NaN;
  const silencedUntil = Number.isFinite(silencedUntilMs) ? silencedUntilRaw : null;

  const params =
    obj.params && typeof obj.params === 'object' && !Array.isArray(obj.params)
      ? (obj.params as Record<string, unknown>)
      : undefined;

  const normalizedParams = normalizeRuleParams(safeEvent, params);
  const channels = normalizeRuleChannels(obj.channels, recipient);

  return {
    id,
    name,
    enabled,
    event: safeEvent,
    severity,
    owner,
    runbook,
    silencedUntil,
    params: normalizedParams,
    channels,
    recipient,
  };
}

/**
 * 读取告警规则
 */
export async function readAlertRules(): Promise<AlertRule[]> {
  await ensureDb();
  const stored = await readJsonFile<unknown>(ALERT_RULES_KEY, null);
  if (Array.isArray(stored)) {
    let changed = false;
    const normalized: AlertRule[] = [];
    for (const item of stored) {
      const rule = normalizeStoredRule(item);
      if (!rule) {
        changed = true;
        continue;
      }
      const prev = item as Partial<AlertRule>;
      const prevChannels = Array.isArray(prev.channels) ? prev.channels : undefined;
      const same =
        prev.id === rule.id &&
        prev.name === rule.name &&
        prev.enabled === rule.enabled &&
        prev.event === rule.event &&
        prev.severity === rule.severity &&
        (typeof (prev as { owner?: unknown }).owner === 'string'
          ? ((prev as { owner?: string }).owner ?? '').trim()
          : ((prev as { owner?: null }).owner ?? null)) === (rule.owner ?? null) &&
        (typeof (prev as { runbook?: unknown }).runbook === 'string'
          ? ((prev as { runbook?: string }).runbook ?? '').trim()
          : ((prev as { runbook?: null }).runbook ?? null)) === (rule.runbook ?? null) &&
        (typeof (prev as { silencedUntil?: unknown }).silencedUntil === 'string'
          ? ((prev as { silencedUntil?: string }).silencedUntil ?? '').trim()
          : ((prev as { silencedUntil?: null }).silencedUntil ?? null)) ===
          (rule.silencedUntil ?? null) &&
        JSON.stringify(prev.params ?? undefined) === JSON.stringify(rule.params ?? undefined) &&
        JSON.stringify(prevChannels ?? undefined) === JSON.stringify(rule.channels ?? undefined) &&
        (typeof prev.recipient === 'string' ? prev.recipient.trim() : (prev.recipient ?? null)) ===
          rule.recipient;
      if (!same) changed = true;
      normalized.push(rule);
    }
    if (changed) await writeJsonFile(ALERT_RULES_KEY, normalized);
    return normalized;
  }

  // 返回默认规则
  const defaults: AlertRule[] = [
    {
      id: 'rule_stale_sync',
      name: 'Stale sync detection',
      enabled: true,
      event: 'stale_sync',
      severity: 'warning',
      params: { maxAgeMs: 5 * 60 * 1000 },
      channels: ['webhook'],
      recipient: null,
    },
    {
      id: 'rule_sync_error',
      name: 'Sync error detection',
      enabled: true,
      event: 'sync_error',
      severity: 'critical',
      channels: ['webhook'],
      recipient: null,
    },
    {
      id: 'rule_high_error_rate',
      name: 'High error rate detection',
      enabled: true,
      event: 'high_error_rate',
      severity: 'warning',
      params: { thresholdPercent: 5, windowMinutes: 5 },
      channels: ['webhook'],
      recipient: null,
    },
  ];
  await writeJsonFile(ALERT_RULES_KEY, defaults);
  return defaults;
}

/**
 * 写入告警规则
 */
export async function writeAlertRules(rules: AlertRule[]) {
  await ensureDb();
  const normalized: AlertRule[] = [];
  for (const r of rules) {
    const n = normalizeStoredRule(r);
    if (n) normalized.push(n);
  }
  await writeJsonFile(ALERT_RULES_KEY, normalized);
}
