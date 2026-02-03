import { createOrTouchAlert, readAlertRules, type AlertRule } from '@/server/observability';

type ApiRequestBucket = { total: number; errors: number };

const globalForApiAlerts = globalThis as unknown as {
  oracleMonitorApiAlertRulesCache?: { loadedAtMs: number; rules: AlertRule[] } | null;
  oracleMonitorApiAlertRulesInflight?: Promise<AlertRule[]> | null;
  oracleMonitorApiAlertCooldown?: Map<string, number> | undefined;
  oracleMonitorApiRequestBuckets?: Map<number, ApiRequestBucket> | undefined;
};

const apiAlertCooldown =
  globalForApiAlerts.oracleMonitorApiAlertCooldown ?? new Map<string, number>();
const apiRequestBuckets =
  globalForApiAlerts.oracleMonitorApiRequestBuckets ?? new Map<number, ApiRequestBucket>();
if (process.env.NODE_ENV !== 'production') {
  globalForApiAlerts.oracleMonitorApiAlertCooldown = apiAlertCooldown;
  globalForApiAlerts.oracleMonitorApiRequestBuckets = apiRequestBuckets;
}

async function getAlertRulesCached(): Promise<AlertRule[]> {
  const now = Date.now();
  const cached = globalForApiAlerts.oracleMonitorApiAlertRulesCache;
  if (cached && now - cached.loadedAtMs < 5_000) return cached.rules;
  if (globalForApiAlerts.oracleMonitorApiAlertRulesInflight)
    return globalForApiAlerts.oracleMonitorApiAlertRulesInflight;
  const p = readAlertRules()
    .then((rules) => {
      globalForApiAlerts.oracleMonitorApiAlertRulesCache = { loadedAtMs: now, rules };
      return rules;
    })
    .catch(() => {
      globalForApiAlerts.oracleMonitorApiAlertRulesCache = {
        loadedAtMs: now,
        rules: [],
      };
      return [];
    })
    .finally(() => {
      globalForApiAlerts.oracleMonitorApiAlertRulesInflight = null;
    });
  globalForApiAlerts.oracleMonitorApiAlertRulesInflight = p;
  return p;
}

function shouldRunApiAlerts(path: string | undefined) {
  if (!path) return false;
  if (!path.startsWith('/api/')) return false;
  if (path.startsWith('/api/admin/')) return false;
  return true;
}

function getAlertCooldownKey(event: string, fingerprint: string): string {
  return `${event}:${fingerprint}`;
}

async function createAlertIfNeeded(
  rule: AlertRule,
  fingerprint: string,
  title: string,
  message: string,
  entityId: string | null,
) {
  const now = Date.now();
  const cooldownKey = getAlertCooldownKey(rule.event, fingerprint);
  const lastAt = apiAlertCooldown.get(cooldownKey) ?? 0;

  if (now - lastAt < 30_000) return;

  apiAlertCooldown.set(cooldownKey, now);

  const silencedUntilRaw = (rule.silencedUntil ?? '').trim();
  const silencedUntilMs = silencedUntilRaw ? Date.parse(silencedUntilRaw) : NaN;
  const silenced = Number.isFinite(silencedUntilMs) && silencedUntilMs > now;

  await createOrTouchAlert({
    fingerprint,
    type: rule.event,
    severity: rule.severity,
    title,
    message,
    entityType: 'api',
    entityId,
    notify: silenced
      ? { channels: [] }
      : {
          channels: rule.channels,
          recipient: rule.recipient ?? undefined,
        },
  });
}

function recordApiBucket(nowMs: number, isError: boolean) {
  const minute = Math.floor(nowMs / 60_000);
  const existing = apiRequestBuckets.get(minute) ?? { total: 0, errors: 0 };
  apiRequestBuckets.set(minute, {
    total: existing.total + 1,
    errors: existing.errors + (isError ? 1 : 0),
  });

  const pruneBefore = minute - 120;
  for (const k of apiRequestBuckets.keys()) {
    if (k < pruneBefore) apiRequestBuckets.delete(k);
  }
}

async function maybeAlertSlowApiRequest(input: {
  method: string | undefined;
  path: string | undefined;
  durationMs: number;
}) {
  if (!shouldRunApiAlerts(input.path)) return;

  const rules = await getAlertRulesCached();
  const slowRules = rules.filter((r) => r.enabled && r.event === 'slow_api_request');

  if (slowRules.length === 0) return;

  const method = input.method || 'UNKNOWN';
  const path = input.path;

  if (!path) return;

  for (const rule of slowRules) {
    const thresholdMs = Number(
      (rule.params as { thresholdMs?: unknown } | undefined)?.thresholdMs ?? 1000,
    );

    if (!Number.isFinite(thresholdMs) || thresholdMs <= 0) continue;
    if (input.durationMs < thresholdMs) continue;

    const fingerprint = `${rule.id}:${method}:${path}`;
    const message = `${method} ${path} took ${input.durationMs}ms (threshold ${thresholdMs}ms)`;

    await createAlertIfNeeded(rule, fingerprint, 'Slow API request', message, path);
  }
}

async function maybeAlertHighErrorRate(input: { path: string | undefined }) {
  if (!shouldRunApiAlerts(input.path)) return;

  const rules = await getAlertRulesCached();
  const rateRules = rules.filter((r) => r.enabled && r.event === 'high_error_rate');

  if (rateRules.length === 0) return;

  const nowMs = Date.now();
  const minute = Math.floor(nowMs / 60_000);

  for (const rule of rateRules) {
    const thresholdPercent = Number(
      (rule.params as { thresholdPercent?: unknown } | undefined)?.thresholdPercent ?? 5,
    );
    const windowMinutes = Number(
      (rule.params as { windowMinutes?: unknown } | undefined)?.windowMinutes ?? 5,
    );

    if (!Number.isFinite(thresholdPercent) || thresholdPercent <= 0 || thresholdPercent > 100)
      continue;
    if (!Number.isFinite(windowMinutes) || windowMinutes <= 0) continue;

    const window = Math.floor(windowMinutes);
    const startMinute = minute - window + 1;
    let total = 0;
    let errors = 0;

    for (let m = startMinute; m <= minute; m += 1) {
      const b = apiRequestBuckets.get(m);
      if (!b) continue;
      total += b.total;
      errors += b.errors;
    }

    if (total <= 0) continue;

    const rate = (errors / total) * 100;
    if (rate < thresholdPercent) continue;

    const fingerprint = `${rule.id}:global`;
    const message = `${rate.toFixed(1)}% errors (${errors}/${total}) over ${window}m`;

    await createAlertIfNeeded(rule, fingerprint, 'High API error rate', message, null);
  }
}

export async function runApiAlerts(
  path: string | undefined,
  isError: boolean,
  durationMs: number,
  slowMs: number,
  method: string | undefined,
) {
  if (shouldRunApiAlerts(path)) {
    recordApiBucket(Date.now(), isError);
    if (durationMs >= slowMs) {
      maybeAlertSlowApiRequest({ method, path, durationMs }).catch(() => void 0);
    }
    if (isError) {
      maybeAlertHighErrorRate({ path }).catch(() => void 0);
    }
  }
}
