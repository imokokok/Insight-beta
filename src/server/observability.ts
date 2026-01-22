import { hasDatabase, query } from "@/server/db";
import { ensureSchema } from "@/server/schema";
import { readJsonFile, writeJsonFile } from "@/server/kvStore";
import { getMemoryStore, memoryNowIso } from "@/server/memoryBackend";
import { notifyAlert, type NotificationOptions } from "@/server/notifications";
import { getSyncState } from "@/server/oracleState";
import { env } from "@/lib/env";

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "Open" | "Acknowledged" | "Resolved";

export type Alert = {
  id: number;
  fingerprint: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  status: AlertStatus;
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DbAlertRow = {
  id: number | string;
  fingerprint: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  status: AlertStatus;
  occurrences: number | string;
  first_seen_at: Date;
  last_seen_at: Date;
  acknowledged_at: Date | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type DbAuditRow = {
  id: number | string;
  actor: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: unknown;
  created_at: Date;
};

export type AlertRuleEvent =
  | "dispute_created"
  | "liveness_expiring"
  | "sync_error"
  | "stale_sync"
  | "contract_paused"
  | "sync_backlog"
  | "backlog_assertions"
  | "backlog_disputes"
  | "market_stale"
  | "execution_delayed"
  | "low_participation"
  | "high_vote_divergence"
  | "high_dispute_rate"
  | "slow_api_request"
  | "high_error_rate"
  | "database_slow_query"
  | "price_deviation"
  | "low_gas";

export type AlertRule = {
  id: string;
  name: string;
  enabled: boolean;
  event: AlertRuleEvent;
  severity: AlertSeverity;
  owner?: string | null;
  runbook?: string | null;
  silencedUntil?: string | null;
  params?: Record<string, unknown>;
  channels?: Array<"webhook" | "email" | "telegram">;
  recipient?: string | null;
};

export type AuditLogEntry = {
  id: number;
  createdAt: string;
  actor: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: unknown;
};

export type IncidentStatus = "Open" | "Mitigating" | "Resolved";

export type Incident = {
  id: number;
  title: string;
  status: IncidentStatus;
  severity: AlertSeverity;
  owner: string | null;
  rootCause: string | null;
  summary: string | null;
  runbook: string | null;
  alertIds: number[];
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

let schemaEnsured = false;
async function ensureDb() {
  if (!hasDatabase()) return;
  if (!schemaEnsured) {
    await ensureSchema();
    schemaEnsured = true;
  }
}

const ALERT_RULES_KEY = "alert_rules/v1";
const INCIDENTS_KEY = "incidents/v1";
const MEMORY_MAX_ALERTS = 2000;
const MEMORY_MAX_AUDIT = 5000;

const validRuleEvents: AlertRuleEvent[] = [
  "dispute_created",
  "liveness_expiring",
  "sync_error",
  "stale_sync",
  "contract_paused",
  "sync_backlog",
  "backlog_assertions",
  "backlog_disputes",
  "market_stale",
  "execution_delayed",
  "low_participation",
  "high_vote_divergence",
  "high_dispute_rate",
  "slow_api_request",
  "high_error_rate",
  "database_slow_query",
  "price_deviation",
  "low_gas",
];

const validSeverities: AlertSeverity[] = ["info", "warning", "critical"];

function normalizeRuleChannels(
  channels: unknown,
  recipient: string | null,
): Array<"webhook" | "email" | "telegram"> {
  const raw =
    Array.isArray(channels) && channels.length > 0 ? channels : ["webhook"];
  const out: Array<"webhook" | "email" | "telegram"> = [];
  for (const c of raw) {
    if (c !== "webhook" && c !== "email" && c !== "telegram") continue;
    if (!out.includes(c)) out.push(c);
  }
  const safe: Array<"webhook" | "email" | "telegram"> =
    out.length > 0
      ? out
      : (["webhook"] as Array<"webhook" | "email" | "telegram">);
  if (safe.includes("email") && !recipient) {
    const withoutEmail = safe.filter((c) => c !== "email");
    return withoutEmail.length > 0
      ? (withoutEmail as Array<"webhook" | "email" | "telegram">)
      : (["webhook"] as Array<"webhook" | "email" | "telegram">);
  }
  return safe;
}

function normalizeRuleParams(
  event: AlertRuleEvent,
  params: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  const p = params ?? {};
  const getNumber = (key: string) => Number(p[key]);
  const setNumber = (key: string, value: number) => ({ ...p, [key]: value });
  const setNumbers = (pairs: Array<[string, number]>) => {
    let out = { ...p };
    for (const [k, v] of pairs) out = { ...out, [k]: v };
    return out;
  };

  if (event === "stale_sync") {
    const maxAgeMs = getNumber("maxAgeMs");
    const v =
      Number.isFinite(maxAgeMs) && maxAgeMs > 0 ? maxAgeMs : 5 * 60 * 1000;
    return setNumber("maxAgeMs", v);
  }

  if (event === "sync_backlog") {
    const maxLagBlocks = getNumber("maxLagBlocks");
    const v =
      Number.isFinite(maxLagBlocks) && maxLagBlocks > 0 ? maxLagBlocks : 200;
    return setNumber("maxLagBlocks", v);
  }

  if (event === "backlog_assertions") {
    const maxOpenAssertions = getNumber("maxOpenAssertions");
    const v =
      Number.isFinite(maxOpenAssertions) && maxOpenAssertions > 0
        ? maxOpenAssertions
        : 50;
    return setNumber("maxOpenAssertions", v);
  }

  if (event === "backlog_disputes") {
    const maxOpenDisputes = getNumber("maxOpenDisputes");
    const v =
      Number.isFinite(maxOpenDisputes) && maxOpenDisputes > 0
        ? maxOpenDisputes
        : 20;
    return setNumber("maxOpenDisputes", v);
  }

  if (event === "market_stale") {
    const maxAgeMs = getNumber("maxAgeMs");
    const v =
      Number.isFinite(maxAgeMs) && maxAgeMs > 0 ? maxAgeMs : 6 * 60 * 60_000;
    return setNumber("maxAgeMs", v);
  }

  if (event === "execution_delayed") {
    const maxDelayMinutes = getNumber("maxDelayMinutes");
    const v =
      Number.isFinite(maxDelayMinutes) && maxDelayMinutes > 0
        ? maxDelayMinutes
        : 30;
    return setNumber("maxDelayMinutes", v);
  }

  if (event === "low_participation") {
    const withinMinutes = getNumber("withinMinutes");
    const minTotalVotes = getNumber("minTotalVotes");
    const safeWithin =
      Number.isFinite(withinMinutes) && withinMinutes > 0 ? withinMinutes : 60;
    const safeMin =
      Number.isFinite(minTotalVotes) && minTotalVotes >= 0 ? minTotalVotes : 0;
    return setNumbers([
      ["withinMinutes", safeWithin],
      ["minTotalVotes", safeMin],
    ]);
  }

  if (event === "liveness_expiring") {
    const withinMinutes = getNumber("withinMinutes");
    const safeWithin =
      Number.isFinite(withinMinutes) && withinMinutes > 0 ? withinMinutes : 60;
    return setNumber("withinMinutes", safeWithin);
  }

  if (event === "price_deviation") {
    const thresholdPercent = getNumber("thresholdPercent");
    const v =
      Number.isFinite(thresholdPercent) && thresholdPercent > 0
        ? thresholdPercent
        : 2;
    return setNumber("thresholdPercent", v);
  }

  if (event === "low_gas") {
    const minBalanceEth = getNumber("minBalanceEth");
    const v =
      Number.isFinite(minBalanceEth) && minBalanceEth > 0 ? minBalanceEth : 0.1;
    return setNumber("minBalanceEth", v);
  }

  if (event === "high_vote_divergence") {
    const withinMinutes = getNumber("withinMinutes");
    const minTotalVotes = getNumber("minTotalVotes");
    const maxMarginPercent = getNumber("maxMarginPercent");
    const safeWithin =
      Number.isFinite(withinMinutes) && withinMinutes > 0 ? withinMinutes : 60;
    const safeMin =
      Number.isFinite(minTotalVotes) && minTotalVotes > 0 ? minTotalVotes : 1;
    const safeMargin =
      Number.isFinite(maxMarginPercent) &&
      maxMarginPercent > 0 &&
      maxMarginPercent <= 100
        ? maxMarginPercent
        : 10;
    return setNumbers([
      ["withinMinutes", safeWithin],
      ["minTotalVotes", safeMin],
      ["maxMarginPercent", safeMargin],
    ]);
  }

  if (event === "high_dispute_rate") {
    const windowDays = getNumber("windowDays");
    const minAssertions = getNumber("minAssertions");
    const thresholdPercent = getNumber("thresholdPercent");
    const safeDays =
      Number.isFinite(windowDays) && windowDays > 0 ? windowDays : 7;
    const safeMin =
      Number.isFinite(minAssertions) && minAssertions > 0 ? minAssertions : 20;
    const safeThreshold =
      Number.isFinite(thresholdPercent) &&
      thresholdPercent > 0 &&
      thresholdPercent <= 100
        ? thresholdPercent
        : 10;
    return setNumbers([
      ["windowDays", safeDays],
      ["minAssertions", safeMin],
      ["thresholdPercent", safeThreshold],
    ]);
  }

  if (event === "slow_api_request") {
    const thresholdMs = getNumber("thresholdMs");
    const v =
      Number.isFinite(thresholdMs) && thresholdMs > 0 ? thresholdMs : 1000;
    return setNumber("thresholdMs", v);
  }

  if (event === "database_slow_query") {
    const thresholdMs = getNumber("thresholdMs");
    const v =
      Number.isFinite(thresholdMs) && thresholdMs > 0 ? thresholdMs : 200;
    return setNumber("thresholdMs", v);
  }

  if (event === "high_error_rate") {
    const thresholdPercent = getNumber("thresholdPercent");
    const windowMinutes = getNumber("windowMinutes");
    const safeThreshold =
      Number.isFinite(thresholdPercent) &&
      thresholdPercent > 0 &&
      thresholdPercent <= 100
        ? thresholdPercent
        : 5;
    const safeWindow =
      Number.isFinite(windowMinutes) && windowMinutes > 0 ? windowMinutes : 5;
    return { ...p, thresholdPercent: safeThreshold, windowMinutes: safeWindow };
  }

  return params;
}

function normalizeStoredRule(input: unknown): AlertRule | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;

  const id = typeof obj.id === "string" ? obj.id.trim() : "";
  if (!id) return null;

  const event = typeof obj.event === "string" ? obj.event : "";
  if (!validRuleEvents.includes(event as AlertRuleEvent)) return null;
  const safeEvent = event as AlertRuleEvent;

  const name =
    typeof obj.name === "string" && obj.name.trim() ? obj.name.trim() : id;
  const enabled = typeof obj.enabled === "boolean" ? obj.enabled : true;

  const severityRaw = typeof obj.severity === "string" ? obj.severity : "";
  const severity = validSeverities.includes(severityRaw as AlertSeverity)
    ? (severityRaw as AlertSeverity)
    : "warning";

  const recipient =
    typeof obj.recipient === "string" && obj.recipient.trim()
      ? obj.recipient.trim()
      : null;

  const owner =
    typeof obj.owner === "string" && obj.owner.trim() ? obj.owner.trim() : null;

  const runbook =
    typeof obj.runbook === "string" && obj.runbook.trim()
      ? obj.runbook.trim()
      : null;

  const silencedUntilRaw =
    typeof obj.silencedUntil === "string" ? obj.silencedUntil.trim() : "";
  const silencedUntilMs = silencedUntilRaw ? Date.parse(silencedUntilRaw) : NaN;
  const silencedUntil = Number.isFinite(silencedUntilMs)
    ? silencedUntilRaw
    : null;

  const params =
    obj.params && typeof obj.params === "object" && !Array.isArray(obj.params)
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

function pruneMemoryAlerts(mem: ReturnType<typeof getMemoryStore>) {
  const overflow = mem.alerts.size - MEMORY_MAX_ALERTS;
  if (overflow <= 0) return;
  const statusRank = (s: Alert["status"]) =>
    s === "Open" ? 0 : s === "Acknowledged" ? 1 : 2;
  const candidates = Array.from(mem.alerts.entries()).map(
    ([fingerprint, a]) => ({
      fingerprint,
      statusRank: statusRank(a.status),
      lastSeenAtMs: new Date(a.lastSeenAt).getTime(),
    }),
  );
  candidates.sort((a, b) => {
    const r = b.statusRank - a.statusRank;
    if (r !== 0) return r;
    return a.lastSeenAtMs - b.lastSeenAtMs;
  });
  for (let i = 0; i < overflow; i++) {
    const fp = candidates[i]?.fingerprint;
    if (fp) mem.alerts.delete(fp);
  }
}

export async function pruneStaleAlerts() {
  await ensureDb();
  const cutoffMs = Date.now() - 7 * 24 * 60 * 60_000;
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    let resolved = 0;
    for (const [fingerprint, alert] of mem.alerts.entries()) {
      if (alert.status === "Resolved") continue;
      const lastSeenMs = Date.parse(alert.lastSeenAt);
      if (!Number.isFinite(lastSeenMs) || lastSeenMs >= cutoffMs) continue;
      const now = memoryNowIso();
      mem.alerts.set(fingerprint, {
        ...alert,
        status: "Resolved",
        resolvedAt: now,
        updatedAt: now,
      });
      resolved += 1;
    }
    return { resolved };
  }

  const res = await query(
    `
    UPDATE alerts
    SET status = 'Resolved', resolved_at = NOW(), updated_at = NOW()
    WHERE last_seen_at < NOW() - INTERVAL '7 days' AND status != 'Resolved'
    `,
  );
  return { resolved: res.rowCount ?? 0 };
}

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
      const prevChannels = Array.isArray(prev.channels)
        ? prev.channels
        : undefined;
      const same =
        prev.id === rule.id &&
        prev.name === rule.name &&
        prev.enabled === rule.enabled &&
        prev.event === rule.event &&
        prev.severity === rule.severity &&
        (typeof (prev as { owner?: unknown }).owner === "string"
          ? ((prev as { owner?: string }).owner ?? "").trim()
          : ((prev as { owner?: null }).owner ?? null)) ===
          (rule.owner ?? null) &&
        (typeof (prev as { runbook?: unknown }).runbook === "string"
          ? ((prev as { runbook?: string }).runbook ?? "").trim()
          : ((prev as { runbook?: null }).runbook ?? null)) ===
          (rule.runbook ?? null) &&
        (typeof (prev as { silencedUntil?: unknown }).silencedUntil === "string"
          ? ((prev as { silencedUntil?: string }).silencedUntil ?? "").trim()
          : ((prev as { silencedUntil?: null }).silencedUntil ?? null)) ===
          (rule.silencedUntil ?? null) &&
        JSON.stringify(prev.params ?? undefined) ===
          JSON.stringify(rule.params ?? undefined) &&
        JSON.stringify(prevChannels ?? undefined) ===
          JSON.stringify(rule.channels ?? undefined) &&
        (typeof prev.recipient === "string"
          ? prev.recipient.trim()
          : (prev.recipient ?? null)) === rule.recipient;
      if (!same) changed = true;
      normalized.push(rule);
    }
    if (changed) await writeJsonFile(ALERT_RULES_KEY, normalized);
    return normalized;
  }
  const defaults: AlertRule[] = [
    {
      id: "dispute_created",
      name: "Dispute created",
      enabled: true,
      event: "dispute_created",
      severity: "critical",
    },
    {
      id: "contract_paused",
      name: "Contract paused",
      enabled: true,
      event: "contract_paused",
      severity: "critical",
    },
    {
      id: "liveness_expiring_30m",
      name: "Liveness expiring < 30m",
      enabled: true,
      event: "liveness_expiring",
      severity: "warning",
      params: { withinMinutes: 30 },
    },
    {
      id: "execution_delayed_30m",
      name: "Execution delayed > 30m",
      enabled: true,
      event: "execution_delayed",
      severity: "critical",
      params: { maxDelayMinutes: 30 },
    },
    {
      id: "low_participation_60m",
      name: "Low participation after 60m",
      enabled: true,
      event: "low_participation",
      severity: "warning",
      params: { withinMinutes: 60, minTotalVotes: 1 },
    },
    {
      id: "high_vote_divergence_15m",
      name: "High vote divergence near close",
      enabled: true,
      event: "high_vote_divergence",
      severity: "warning",
      params: { withinMinutes: 15, minTotalVotes: 10, maxMarginPercent: 5 },
    },
    {
      id: "high_dispute_rate_7d",
      name: "High dispute rate (7d)",
      enabled: true,
      event: "high_dispute_rate",
      severity: "warning",
      params: { windowDays: 7, minAssertions: 20, thresholdPercent: 10 },
    },
    {
      id: "sync_error",
      name: "Sync error",
      enabled: true,
      event: "sync_error",
      severity: "warning",
    },
    {
      id: "stale_sync_5m",
      name: "Stale sync > 5m",
      enabled: true,
      event: "stale_sync",
      severity: "warning",
      params: { maxAgeMs: 5 * 60 * 1000 },
    },
    {
      id: "sync_backlog_200",
      name: "Sync backlog > 200 blocks",
      enabled: true,
      event: "sync_backlog",
      severity: "warning",
      params: { maxLagBlocks: 200 },
    },
    {
      id: "backlog_assertions_50",
      name: "Open assertions > 50",
      enabled: true,
      event: "backlog_assertions",
      severity: "warning",
      params: { maxOpenAssertions: 50 },
    },
    {
      id: "backlog_disputes_20",
      name: "Open disputes > 20",
      enabled: true,
      event: "backlog_disputes",
      severity: "warning",
      params: { maxOpenDisputes: 20 },
    },
    {
      id: "market_stale_6h",
      name: "Market stale > 6h",
      enabled: true,
      event: "market_stale",
      severity: "warning",
      params: { maxAgeMs: 6 * 60 * 60_000 },
    },
    {
      id: "slow_api_request",
      name: "Slow API request (>1s)",
      enabled: true,
      event: "slow_api_request",
      severity: "warning",
      params: { thresholdMs: 1000 },
    },
    {
      id: "high_error_rate",
      name: "High API error rate (>5%)",
      enabled: true,
      event: "high_error_rate",
      severity: "critical",
      params: { thresholdPercent: 5, windowMinutes: 5 },
    },
    {
      id: "database_slow_query",
      name: "Database slow query (>200ms)",
      enabled: true,
      event: "database_slow_query",
      severity: "warning",
      params: { thresholdMs: 200 },
    },
  ];
  await writeJsonFile(ALERT_RULES_KEY, defaults);
  return defaults;
}

export async function writeAlertRules(rules: AlertRule[]) {
  await ensureDb();
  await writeJsonFile(ALERT_RULES_KEY, rules);
}

type IncidentStoreV1 = {
  version: 1;
  nextId: number;
  items: Incident[];
};

function normalizeIncidentStatus(raw: unknown): IncidentStatus {
  return raw === "Open" || raw === "Mitigating" || raw === "Resolved"
    ? raw
    : "Open";
}

function normalizeIncident(
  input: unknown,
  fallbackId: number,
): Incident | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;

  const id = Number(obj.id ?? fallbackId);
  if (!Number.isFinite(id) || id <= 0) return null;

  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  if (!title) return null;

  const status = normalizeIncidentStatus(obj.status);
  const severityRaw = typeof obj.severity === "string" ? obj.severity : "";
  const severity = validSeverities.includes(severityRaw as AlertSeverity)
    ? (severityRaw as AlertSeverity)
    : "warning";

  const owner =
    typeof obj.owner === "string" && obj.owner.trim() ? obj.owner.trim() : null;

  const rootCause =
    typeof obj.rootCause === "string" && obj.rootCause.trim()
      ? obj.rootCause.trim()
      : null;

  const summary =
    typeof obj.summary === "string" && obj.summary.trim()
      ? obj.summary.trim()
      : null;

  const runbook =
    typeof obj.runbook === "string" && obj.runbook.trim()
      ? obj.runbook.trim()
      : null;

  const alertIds = Array.isArray(obj.alertIds)
    ? obj.alertIds
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n) && n > 0)
    : [];

  const entityType =
    typeof obj.entityType === "string" && obj.entityType.trim()
      ? obj.entityType.trim()
      : null;
  const entityId =
    typeof obj.entityId === "string" && obj.entityId.trim()
      ? obj.entityId.trim()
      : null;

  const createdAtRaw = typeof obj.createdAt === "string" ? obj.createdAt : "";
  const updatedAtRaw = typeof obj.updatedAt === "string" ? obj.updatedAt : "";
  const resolvedAtRaw =
    typeof obj.resolvedAt === "string" ? obj.resolvedAt : null;

  const createdAtMs = createdAtRaw ? Date.parse(createdAtRaw) : NaN;
  const updatedAtMs = updatedAtRaw ? Date.parse(updatedAtRaw) : NaN;
  const resolvedAtMs = resolvedAtRaw ? Date.parse(resolvedAtRaw) : NaN;

  const now = memoryNowIso();
  const createdAt = Number.isFinite(createdAtMs) ? createdAtRaw : now;
  const updatedAt = Number.isFinite(updatedAtMs) ? updatedAtRaw : createdAt;
  const resolvedAt = Number.isFinite(resolvedAtMs) ? resolvedAtRaw : null;

  return {
    id,
    title,
    status,
    severity,
    owner,
    rootCause,
    summary,
    runbook,
    alertIds,
    entityType,
    entityId,
    createdAt,
    updatedAt,
    resolvedAt,
  };
}

async function readIncidentStore(): Promise<IncidentStoreV1> {
  await ensureDb();
  const stored = await readJsonFile<unknown>(INCIDENTS_KEY, null);
  const defaultStore: IncidentStoreV1 = { version: 1, nextId: 1, items: [] };
  if (!stored || typeof stored !== "object") return defaultStore;
  const obj = stored as Record<string, unknown>;
  const version = Number(obj.version);
  if (version !== 1) return defaultStore;
  const rawItems = Array.isArray(obj.items) ? obj.items : [];
  const normalized: Incident[] = [];
  let maxId = 0;
  for (let i = 0; i < rawItems.length; i += 1) {
    const incident = normalizeIncident(rawItems[i], i + 1);
    if (!incident) continue;
    normalized.push(incident);
    if (incident.id > maxId) maxId = incident.id;
  }
  const nextIdRaw = Number(obj.nextId);
  const nextId =
    Number.isFinite(nextIdRaw) && nextIdRaw > maxId ? nextIdRaw : maxId + 1;
  const store: IncidentStoreV1 = { version: 1, nextId, items: normalized };
  if (
    JSON.stringify(obj.items ?? null) !== JSON.stringify(normalized) ||
    obj.nextId !== nextId
  ) {
    await writeJsonFile(INCIDENTS_KEY, store);
  }
  return store;
}

async function writeIncidentStore(store: IncidentStoreV1) {
  await ensureDb();
  await writeJsonFile(INCIDENTS_KEY, store);
}

export async function listIncidents(params?: {
  status?: IncidentStatus | "All" | null;
  limit?: number | null;
}) {
  const store = await readIncidentStore();
  const limit = Math.min(200, Math.max(1, params?.limit ?? 50));
  let items = store.items.slice();
  if (params?.status && params.status !== "All") {
    items = items.filter((i) => i.status === params.status);
  }
  const statusRank = (s: IncidentStatus) =>
    s === "Open" ? 0 : s === "Mitigating" ? 1 : 2;
  items.sort((a, b) => {
    const r = statusRank(a.status) - statusRank(b.status);
    if (r !== 0) return r;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
  return items.slice(0, limit);
}

export async function getIncident(id: number) {
  const store = await readIncidentStore();
  const found = store.items.find((i) => i.id === id);
  return found ?? null;
}

export async function createIncident(input: {
  title: string;
  severity: AlertSeverity;
  status?: IncidentStatus | null;
  owner?: string | null;
  rootCause?: string | null;
  summary?: string | null;
  runbook?: string | null;
  alertIds?: number[] | null;
  entityType?: string | null;
  entityId?: string | null;
  actor?: string | null;
}) {
  const title = input.title.trim();
  if (!title) return null;

  const store = await readIncidentStore();
  const now = memoryNowIso();

  const created: Incident = {
    id: store.nextId,
    title,
    status: input.status ?? "Open",
    severity: input.severity,
    owner: input.owner?.trim() ? input.owner.trim() : null,
    rootCause: input.rootCause?.trim() ? input.rootCause.trim() : null,
    summary: input.summary?.trim() ? input.summary.trim() : null,
    runbook: input.runbook?.trim() ? input.runbook.trim() : null,
    alertIds: Array.isArray(input.alertIds)
      ? input.alertIds
          .map((x) => Number(x))
          .filter((n) => Number.isFinite(n) && n > 0)
      : [],
    entityType: input.entityType?.trim() ? input.entityType.trim() : null,
    entityId: input.entityId?.trim() ? input.entityId.trim() : null,
    createdAt: now,
    updatedAt: now,
    resolvedAt: input.status === "Resolved" ? now : null,
  };

  const nextStore: IncidentStoreV1 = {
    version: 1,
    nextId: store.nextId + 1,
    items: [created, ...store.items],
  };
  await writeIncidentStore(nextStore);
  await appendAuditLog({
    actor: input.actor ?? null,
    action: "incident_created",
    entityType: "incident",
    entityId: String(created.id),
    details: created,
  });
  return created;
}

export async function patchIncident(input: {
  id: number;
  patch: Partial<
    Pick<
      Incident,
      | "title"
      | "status"
      | "severity"
      | "owner"
      | "rootCause"
      | "summary"
      | "runbook"
      | "alertIds"
      | "entityType"
      | "entityId"
    >
  >;
  actor?: string | null;
}) {
  const store = await readIncidentStore();
  const idx = store.items.findIndex((i) => i.id === input.id);
  if (idx < 0) return null;

  const prev = store.items[idx]!;
  const now = memoryNowIso();

  const title =
    typeof input.patch.title === "string"
      ? input.patch.title.trim() || prev.title
      : prev.title;
  const status = input.patch.status ?? prev.status;
  const severity = input.patch.severity ?? prev.severity;
  const owner =
    input.patch.owner === undefined
      ? prev.owner
      : input.patch.owner?.trim()
        ? input.patch.owner.trim()
        : null;
  const rootCause =
    input.patch.rootCause === undefined
      ? prev.rootCause
      : input.patch.rootCause?.trim()
        ? input.patch.rootCause.trim()
        : null;
  const summary =
    input.patch.summary === undefined
      ? prev.summary
      : input.patch.summary?.trim()
        ? input.patch.summary.trim()
        : null;
  const runbook =
    input.patch.runbook === undefined
      ? prev.runbook
      : input.patch.runbook?.trim()
        ? input.patch.runbook.trim()
        : null;

  const alertIds =
    input.patch.alertIds === undefined
      ? prev.alertIds
      : Array.isArray(input.patch.alertIds)
        ? input.patch.alertIds
            .map((x) => Number(x))
            .filter((n) => Number.isFinite(n) && n > 0)
        : [];

  const entityType =
    input.patch.entityType === undefined
      ? prev.entityType
      : input.patch.entityType?.trim()
        ? input.patch.entityType.trim()
        : null;

  const entityId =
    input.patch.entityId === undefined
      ? prev.entityId
      : input.patch.entityId?.trim()
        ? input.patch.entityId.trim()
        : null;

  const resolvedAt =
    status === "Resolved"
      ? (prev.resolvedAt ?? now)
      : status === prev.status
        ? prev.resolvedAt
        : null;

  const next: Incident = {
    ...prev,
    title,
    status,
    severity,
    owner,
    rootCause,
    summary,
    runbook,
    alertIds,
    entityType,
    entityId,
    updatedAt: now,
    resolvedAt,
  };

  const items = store.items.slice();
  items[idx] = next;

  const nextStore: IncidentStoreV1 = {
    version: 1,
    nextId: store.nextId,
    items,
  };
  await writeIncidentStore(nextStore);
  await appendAuditLog({
    actor: input.actor ?? null,
    action: "incident_updated",
    entityType: "incident",
    entityId: String(next.id),
    details: { before: prev, after: next },
  });
  return next;
}

function mapAlertRow(row: DbAlertRow): Alert {
  return {
    id: Number(row.id),
    fingerprint: row.fingerprint,
    type: row.type,
    severity: row.severity,
    title: row.title,
    message: row.message,
    entityType: row.entity_type,
    entityId: row.entity_id,
    status: row.status,
    occurrences: Number(row.occurrences),
    firstSeenAt: row.first_seen_at.toISOString(),
    lastSeenAt: row.last_seen_at.toISOString(),
    acknowledgedAt: row.acknowledged_at
      ? row.acknowledged_at.toISOString()
      : null,
    resolvedAt: row.resolved_at ? row.resolved_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function createOrTouchAlert(input: {
  fingerprint: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  notify?: NotificationOptions;
}) {
  await ensureDb();
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    const now = memoryNowIso();
    const existing = mem.alerts.get(input.fingerprint);
    if (existing) {
      const next =
        existing.status === "Resolved"
          ? {
              ...existing,
              severity: input.severity,
              title: input.title,
              message: input.message,
              entityType: input.entityType ?? null,
              entityId: input.entityId ?? null,
              occurrences: existing.occurrences + 1,
              lastSeenAt: now,
              updatedAt: now,
              status: "Open" as const,
              resolvedAt: null,
            }
          : {
              ...existing,
              severity: input.severity,
              title: input.title,
              message: input.message,
              entityType: input.entityType ?? null,
              entityId: input.entityId ?? null,
              occurrences: existing.occurrences + 1,
              lastSeenAt: now,
              updatedAt: now,
            };
      mem.alerts.set(input.fingerprint, next);
      if (next.status === "Open" && existing.status === "Resolved") {
        notifyAlert(
          {
            title: next.title,
            message: next.message,
            severity: next.severity,
            fingerprint: next.fingerprint,
          },
          input.notify,
        ).catch(() => void 0);
      }
    } else {
      const created = {
        id: mem.nextAlertId++,
        fingerprint: input.fingerprint,
        type: input.type,
        severity: input.severity,
        title: input.title,
        message: input.message,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        status: "Open" as const,
        occurrences: 1,
        firstSeenAt: now,
        lastSeenAt: now,
        acknowledgedAt: null,
        resolvedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      mem.alerts.set(input.fingerprint, created);
      pruneMemoryAlerts(mem);
      notifyAlert(
        {
          title: created.title,
          message: created.message,
          severity: created.severity,
          fingerprint: created.fingerprint,
        },
        input.notify,
      ).catch(() => void 0);
    }
    return;
  }

  // Database path
  const result = await query<{ status: AlertStatus }>(
    `
    SELECT status FROM alerts WHERE fingerprint = $1
    `,
    [input.fingerprint],
  );
  const existingDb = result.rows[0];

  await query(
    `
    INSERT INTO alerts (
      fingerprint, type, severity, title, message, entity_type, entity_id,
      status, occurrences, first_seen_at, last_seen_at, created_at, updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      'Open', 1, NOW(), NOW(), NOW(), NOW()
    )
    ON CONFLICT (fingerprint) DO UPDATE SET
      severity = excluded.severity,
      title = excluded.title,
      message = excluded.message,
      entity_type = excluded.entity_type,
      entity_id = excluded.entity_id,
      occurrences = alerts.occurrences + 1,
      last_seen_at = NOW(),
      updated_at = NOW(),
      status = CASE
        WHEN alerts.status = 'Resolved' THEN 'Open'
        ELSE alerts.status
      END,
      resolved_at = CASE
        WHEN alerts.status = 'Resolved' THEN NULL
        ELSE alerts.resolved_at
      END
    `,
    [
      input.fingerprint,
      input.type,
      input.severity,
      input.title,
      input.message,
      input.entityType ?? null,
      input.entityId ?? null,
    ],
  );

  if (!existingDb || existingDb.status === "Resolved") {
    notifyAlert(
      {
        title: input.title,
        message: input.message,
        severity: input.severity,
        fingerprint: input.fingerprint,
      },
      input.notify,
    ).catch(() => void 0);
  }
}

export async function listAlerts(params: {
  status?: AlertStatus | "All" | null;
  severity?: AlertSeverity | "All" | null;
  type?: string | "All" | null;
  q?: string | null;
  limit?: number | null;
  cursor?: number | null;
  instanceId?: string | null;
}) {
  await ensureDb();
  const instanceId =
    typeof params.instanceId === "string" ? params.instanceId.trim() : "";
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    const limit = Math.min(100, Math.max(1, params.limit ?? 30));
    const offset = Math.max(0, params.cursor ?? 0);
    let alerts = Array.from(mem.alerts.values());
    if (instanceId) {
      const marker = `:${instanceId}:`;
      alerts = alerts.filter((a) => a.fingerprint.includes(marker));
    }
    if (params.status && params.status !== "All") {
      alerts = alerts.filter((a) => a.status === params.status);
    }
    if (params.severity && params.severity !== "All") {
      alerts = alerts.filter((a) => a.severity === params.severity);
    }
    if (params.type && params.type !== "All") {
      alerts = alerts.filter((a) => a.type === params.type);
    }
    if (params.q?.trim()) {
      const q = params.q.trim().toLowerCase();
      alerts = alerts.filter((a) => {
        return (
          a.title.toLowerCase().includes(q) ||
          a.message.toLowerCase().includes(q) ||
          (a.entityId ?? "").toLowerCase().includes(q)
        );
      });
    }
    alerts.sort((a, b) => {
      const statusRank = (s: Alert["status"]) =>
        s === "Open" ? 0 : s === "Acknowledged" ? 1 : 2;
      const r = statusRank(a.status) - statusRank(b.status);
      if (r !== 0) return r;
      return (
        new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
      );
    });
    const total = alerts.length;
    const slice = alerts.slice(offset, offset + limit);
    return {
      items: slice,
      total,
      nextCursor: offset + slice.length < total ? offset + limit : null,
    };
  }
  const limit = Math.min(100, Math.max(1, params.limit ?? 30));
  const offset = Math.max(0, params.cursor ?? 0);

  const conditions: string[] = [];
  const values: (string | number)[] = [];
  let idx = 1;

  if (instanceId) {
    conditions.push(`fingerprint LIKE $${idx++}`);
    values.push(`%:${instanceId}:%`);
  }

  if (params.status && params.status !== "All") {
    conditions.push(`status = $${idx++}`);
    values.push(params.status);
  }

  if (params.severity && params.severity !== "All") {
    conditions.push(`severity = $${idx++}`);
    values.push(params.severity);
  }

  if (params.type && params.type !== "All") {
    conditions.push(`type = $${idx++}`);
    values.push(params.type);
  }

  if (params.q?.trim()) {
    const q = `%${params.q.trim().toLowerCase()}%`;
    conditions.push(`(
      LOWER(title) LIKE $${idx} OR
      LOWER(message) LIKE $${idx} OR
      LOWER(COALESCE(entity_id, '')) LIKE $${idx}
    )`);
    values.push(q);
    idx++;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const countRes = await query(
    `SELECT COUNT(*) as total FROM alerts ${whereClause}`,
    values,
  );
  const total = Number(countRes.rows[0]?.total || 0);

  const res = await query<DbAlertRow>(
    `SELECT * FROM alerts ${whereClause} ORDER BY status ASC, last_seen_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    [...values, limit, offset],
  );

  return {
    items: res.rows.map(mapAlertRow),
    total,
    nextCursor: offset + res.rows.length < total ? offset + limit : null,
  };
}

export async function getAlertsByIds(inputIds: number[]) {
  await ensureDb();
  const ids = Array.from(new Set(inputIds))
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (ids.length === 0) return [];
  const limited = ids.slice(0, 200);

  if (!hasDatabase()) {
    const mem = getMemoryStore();
    const byId = new Map<number, Alert>();
    for (const a of mem.alerts.values()) byId.set(a.id, a);
    const out: Alert[] = [];
    for (const id of limited) {
      const found = byId.get(id);
      if (found) out.push(found);
    }
    return out;
  }

  const res = await query<DbAlertRow>(
    `
    SELECT * FROM alerts WHERE id = ANY($1::int[])
    `,
    [limited],
  );

  const byId = new Map<number, Alert>();
  for (const row of res.rows) {
    const a = mapAlertRow(row);
    byId.set(a.id, a);
  }

  const out: Alert[] = [];
  for (const id of limited) {
    const found = byId.get(id);
    if (found) out.push(found);
  }
  return out;
}

export async function updateAlertStatus(input: {
  id: number;
  status: AlertStatus;
  actor?: string | null;
}) {
  await ensureDb();
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    const now = memoryNowIso();
    const list = Array.from(mem.alerts.values());
    const found = list.find((a) => a.id === input.id);
    if (!found) return null;
    const updated =
      input.status === "Acknowledged"
        ? {
            ...found,
            status: "Acknowledged" as const,
            acknowledgedAt: now,
            resolvedAt: null,
            updatedAt: now,
          }
        : input.status === "Resolved"
          ? {
              ...found,
              status: "Resolved" as const,
              resolvedAt: now,
              updatedAt: now,
            }
          : {
              ...found,
              status: "Open" as const,
              acknowledgedAt: null,
              resolvedAt: null,
              updatedAt: now,
            };
    mem.alerts.set(found.fingerprint, updated);
    await appendAuditLog({
      actor: input.actor ?? null,
      action: "alert_status_updated",
      entityType: "alert",
      entityId: String(input.id),
      details: { status: input.status },
    });
    return updated;
  }
  const status = input.status;
  const nowFields =
    status === "Acknowledged"
      ? "acknowledged_at = NOW(), resolved_at = NULL"
      : status === "Resolved"
        ? "resolved_at = NOW()"
        : "acknowledged_at = NULL, resolved_at = NULL";

  const res = await query<DbAlertRow>(
    `
    UPDATE alerts
    SET status = $1, ${nowFields}, updated_at = NOW()
    WHERE id = $2
    RETURNING *
    `,
    [status, input.id],
  );

  const row = res.rows[0];
  if (!row) return null;

  await appendAuditLog({
    actor: input.actor ?? null,
    action: "alert_status_updated",
    entityType: "alert",
    entityId: String(input.id),
    details: { status },
  });

  return mapAlertRow(row);
}

export async function appendAuditLog(input: {
  actor: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  details?: unknown;
}) {
  await ensureDb();
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    const createdAt = memoryNowIso();
    mem.audit.unshift({
      id: mem.nextAuditId++,
      createdAt,
      actor: input.actor,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      details: input.details ?? null,
    });
    if (mem.audit.length > MEMORY_MAX_AUDIT)
      mem.audit.length = MEMORY_MAX_AUDIT;
    return;
  }
  await query(
    `
    INSERT INTO audit_log (actor, action, entity_type, entity_id, details, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    `,
    [
      input.actor,
      input.action,
      input.entityType ?? null,
      input.entityId ?? null,
      input.details ? JSON.stringify(input.details) : null,
    ],
  );
}

function mapAuditRow(row: DbAuditRow): AuditLogEntry {
  return {
    id: Number(row.id),
    createdAt: row.created_at.toISOString(),
    actor: row.actor,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    details: row.details,
  };
}

export async function listAuditLog(params: {
  limit?: number | null;
  cursor?: number | null;
  actor?: string | null;
  action?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  q?: string | null;
}) {
  await ensureDb();
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    const limit = Math.min(100, Math.max(1, params.limit ?? 50));
    const offset = Math.max(0, params.cursor ?? 0);
    let list = mem.audit;
    const actorQ = params.actor?.trim().toLowerCase();
    const actionQ = params.action?.trim().toLowerCase();
    const entityTypeQ = params.entityType?.trim().toLowerCase();
    const entityIdQ = params.entityId?.trim().toLowerCase();
    const q = params.q?.trim().toLowerCase();

    if (actorQ)
      list = list.filter((e) => (e.actor ?? "").toLowerCase().includes(actorQ));
    if (actionQ)
      list = list.filter((e) => e.action.toLowerCase().includes(actionQ));
    if (entityTypeQ)
      list = list.filter((e) =>
        (e.entityType ?? "").toLowerCase().includes(entityTypeQ),
      );
    if (entityIdQ)
      list = list.filter((e) =>
        (e.entityId ?? "").toLowerCase().includes(entityIdQ),
      );
    if (q) {
      list = list.filter((e) => {
        const details = e.details ? JSON.stringify(e.details) : "";
        return (
          e.action.toLowerCase().includes(q) ||
          (e.actor ?? "").toLowerCase().includes(q) ||
          (e.entityType ?? "").toLowerCase().includes(q) ||
          (e.entityId ?? "").toLowerCase().includes(q) ||
          details.toLowerCase().includes(q)
        );
      });
    }

    const total = list.length;
    const slice = list.slice(offset, offset + limit);
    return {
      items: slice,
      total,
      nextCursor: offset + slice.length < total ? offset + limit : null,
    };
  }
  const limit = Math.min(100, Math.max(1, params.limit ?? 50));
  const offset = Math.max(0, params.cursor ?? 0);

  const conditions: string[] = [];
  const values: (string | number)[] = [];
  let idx = 1;

  if (params.actor?.trim()) {
    conditions.push(`LOWER(COALESCE(actor, '')) LIKE $${idx++}`);
    values.push(`%${params.actor.trim().toLowerCase()}%`);
  }

  if (params.action?.trim()) {
    conditions.push(`LOWER(action) LIKE $${idx++}`);
    values.push(`%${params.action.trim().toLowerCase()}%`);
  }

  if (params.entityType?.trim()) {
    conditions.push(`LOWER(COALESCE(entity_type, '')) LIKE $${idx++}`);
    values.push(`%${params.entityType.trim().toLowerCase()}%`);
  }

  if (params.entityId?.trim()) {
    conditions.push(`LOWER(COALESCE(entity_id, '')) LIKE $${idx++}`);
    values.push(`%${params.entityId.trim().toLowerCase()}%`);
  }

  if (params.q?.trim()) {
    conditions.push(`(
      LOWER(action) LIKE $${idx} OR
      LOWER(COALESCE(actor, '')) LIKE $${idx} OR
      LOWER(COALESCE(entity_type, '')) LIKE $${idx} OR
      LOWER(COALESCE(entity_id, '')) LIKE $${idx} OR
      LOWER(COALESCE(details::text, '')) LIKE $${idx}
    )`);
    values.push(`%${params.q.trim().toLowerCase()}%`);
    idx += 1;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRes = await query<{ total: string | number }>(
    `SELECT COUNT(*) as total FROM audit_log ${whereClause}`,
    values,
  );
  const total = Number(countRes.rows[0]?.total || 0);
  const res = await query<DbAuditRow>(
    `SELECT * FROM audit_log ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    [...values, limit, offset],
  );
  return {
    items: res.rows.map(mapAuditRow),
    total,
    nextCursor: offset + res.rows.length < total ? offset + limit : null,
  };
}

export type OpsMetrics = {
  generatedAt: string;
  windowDays: number;
  alerts: {
    open: number;
    acknowledged: number;
    resolved: number;
    mttaMs: number | null;
    mttrMs: number | null;
  };
  incidents: {
    open: number;
    mitigating: number;
    resolved: number;
    mttrMs: number | null;
  };
  slo?: OpsSloStatus;
};

export type OpsMetricsSeriesPoint = {
  date: string;
  alertsCreated: number;
  alertsResolved: number;
  incidentsCreated: number;
  incidentsResolved: number;
};

export type OpsSloStatus = {
  status: "met" | "degraded" | "breached";
  targets: {
    maxLagBlocks: number;
    maxSyncStalenessMinutes: number;
    maxAlertMttaMinutes: number;
    maxAlertMttrMinutes: number;
    maxIncidentMttrMinutes: number;
    maxOpenAlerts: number;
    maxOpenCriticalAlerts: number;
  };
  current: {
    lagBlocks: number | null;
    syncStalenessMinutes: number | null;
    alertMttaMinutes: number | null;
    alertMttrMinutes: number | null;
    incidentMttrMinutes: number | null;
    openAlerts: number | null;
    openCriticalAlerts: number | null;
  };
  breaches: Array<{ key: string; target: number; actual: number }>;
};

function readSloNumber(raw: string, fallback: number, opts?: { min?: number }) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  const min = opts?.min ?? 0;
  return Math.max(min, n);
}

function getSloTargets() {
  return {
    maxLagBlocks: readSloNumber(env.INSIGHT_SLO_MAX_LAG_BLOCKS, 200, {
      min: 0,
    }),
    maxSyncStalenessMinutes: readSloNumber(
      env.INSIGHT_SLO_MAX_SYNC_STALENESS_MINUTES,
      30,
      { min: 1 },
    ),
    maxAlertMttaMinutes: readSloNumber(
      env.INSIGHT_SLO_MAX_ALERT_MTTA_MINUTES,
      30,
      { min: 1 },
    ),
    maxAlertMttrMinutes: readSloNumber(
      env.INSIGHT_SLO_MAX_ALERT_MTTR_MINUTES,
      240,
      { min: 1 },
    ),
    maxIncidentMttrMinutes: readSloNumber(
      env.INSIGHT_SLO_MAX_INCIDENT_MTTR_MINUTES,
      720,
      { min: 1 },
    ),
    maxOpenAlerts: readSloNumber(env.INSIGHT_SLO_MAX_OPEN_ALERTS, 50, {
      min: 0,
    }),
    maxOpenCriticalAlerts: readSloNumber(
      env.INSIGHT_SLO_MAX_OPEN_CRITICAL_ALERTS,
      3,
      { min: 0 },
    ),
  };
}

function minutesSince(iso: string | null) {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const diff = Date.now() - ms;
  if (!Number.isFinite(diff) || diff < 0) return null;
  return Math.round(diff / 60_000);
}

function buildSloStatus(input: {
  lagBlocks: number | null;
  syncStalenessMinutes: number | null;
  alertMttaMinutes: number | null;
  alertMttrMinutes: number | null;
  incidentMttrMinutes: number | null;
  openAlerts: number | null;
  openCriticalAlerts: number | null;
}): OpsSloStatus {
  const targets = getSloTargets();
  const breaches: Array<{ key: string; target: number; actual: number }> = [];
  let missing = 0;

  const check = (
    key: keyof OpsSloStatus["current"],
    value: number | null,
    target: number,
  ) => {
    if (value === null || !Number.isFinite(value)) {
      missing += 1;
      return;
    }
    if (value > target) breaches.push({ key, target, actual: value });
  };

  check("lagBlocks", input.lagBlocks, targets.maxLagBlocks);
  check(
    "syncStalenessMinutes",
    input.syncStalenessMinutes,
    targets.maxSyncStalenessMinutes,
  );
  check(
    "alertMttaMinutes",
    input.alertMttaMinutes,
    targets.maxAlertMttaMinutes,
  );
  check(
    "alertMttrMinutes",
    input.alertMttrMinutes,
    targets.maxAlertMttrMinutes,
  );
  check(
    "incidentMttrMinutes",
    input.incidentMttrMinutes,
    targets.maxIncidentMttrMinutes,
  );
  check("openAlerts", input.openAlerts, targets.maxOpenAlerts);
  check(
    "openCriticalAlerts",
    input.openCriticalAlerts,
    targets.maxOpenCriticalAlerts,
  );

  const status =
    breaches.length > 0 ? "breached" : missing > 0 ? "degraded" : "met";

  return {
    status,
    targets,
    current: input,
    breaches,
  };
}

function safeAvgMs(
  samples: number[],
  opts?: { min?: number; max?: number },
): number | null {
  if (samples.length === 0) return null;
  const sum = samples.reduce((a, b) => a + b, 0);
  const avg = sum / samples.length;
  if (!Number.isFinite(avg)) return null;
  const min = opts?.min ?? 0;
  const max = opts?.max ?? 365 * 24 * 60 * 60_000;
  const clamped = Math.max(min, Math.min(max, avg));
  return Math.round(clamped);
}

async function filterIncidentsByInstanceId(
  items: Incident[],
  instanceId: string,
) {
  if (!instanceId) return items;
  const allIds: number[] = [];
  for (const i of items) allIds.push(...(i.alertIds ?? []));
  const alerts = await getAlertsByIds(allIds);
  const marker = `:${instanceId}:`;
  const byId = new Set(
    alerts.filter((a) => a.fingerprint.includes(marker)).map((a) => a.id),
  );
  return items.filter((i) => {
    const ids = i.alertIds ?? [];
    if (ids.length === 0) return true;
    return ids.some((id) => byId.has(id));
  });
}

export async function getOpsMetrics(params?: {
  windowDays?: number | null;
  instanceId?: string | null;
}): Promise<OpsMetrics> {
  await ensureDb();
  const windowDaysRaw = Number(params?.windowDays ?? 7);
  const windowDays = Number.isFinite(windowDaysRaw)
    ? Math.min(90, Math.max(1, Math.round(windowDaysRaw)))
    : 7;
  const instanceId =
    typeof params?.instanceId === "string" ? params.instanceId.trim() : "";
  const nowIso = memoryNowIso();
  const cutoffMs = Date.now() - windowDays * 24 * 60 * 60_000;
  const syncState = instanceId
    ? await getSyncState(instanceId)
    : await getSyncState();
  const lagBlocks =
    syncState.latestBlock === null || syncState.latestBlock === undefined
      ? null
      : Number(
          syncState.latestBlock >= syncState.lastProcessedBlock
            ? syncState.latestBlock - syncState.lastProcessedBlock
            : 0n,
        );
  const syncStalenessMinutes = minutesSince(
    syncState.sync?.lastSuccessAt ?? null,
  );
  const toMinutes = (ms: number | null) =>
    ms !== null && Number.isFinite(ms) ? Math.round(ms / 60_000) : null;

  const filterIncidents = async (items: Incident[]) =>
    filterIncidentsByInstanceId(items, instanceId);

  if (!hasDatabase()) {
    const mem = getMemoryStore();
    const alerts = Array.from(mem.alerts.values());
    const filteredAlerts = instanceId
      ? alerts.filter((a) => a.fingerprint.includes(`:${instanceId}:`))
      : alerts;
    const open = filteredAlerts.filter((a) => a.status === "Open").length;
    const acknowledged = filteredAlerts.filter(
      (a) => a.status === "Acknowledged",
    ).length;
    const resolved = filteredAlerts.filter(
      (a) => a.status === "Resolved",
    ).length;
    const openCritical = filteredAlerts.filter(
      (a) => a.status === "Open" && a.severity === "critical",
    ).length;

    const mttaSamples: number[] = [];
    const mttrSamples: number[] = [];
    for (const a of filteredAlerts) {
      const firstSeenMs = Date.parse(a.firstSeenAt);
      if (!Number.isFinite(firstSeenMs)) continue;
      if (a.acknowledgedAt) {
        const ackMs = Date.parse(a.acknowledgedAt);
        if (Number.isFinite(ackMs) && ackMs >= cutoffMs) {
          const d = ackMs - firstSeenMs;
          if (Number.isFinite(d) && d >= 0) mttaSamples.push(d);
        }
      }
      if (a.resolvedAt) {
        const resolvedMs = Date.parse(a.resolvedAt);
        if (Number.isFinite(resolvedMs) && resolvedMs >= cutoffMs) {
          const d = resolvedMs - firstSeenMs;
          if (Number.isFinite(d) && d >= 0) mttrSamples.push(d);
        }
      }
    }

    const allIncidents = await filterIncidents(
      await listIncidents({ status: "All", limit: 200 }),
    );
    const incOpen = allIncidents.filter((i) => i.status === "Open").length;
    const incMitigating = allIncidents.filter(
      (i) => i.status === "Mitigating",
    ).length;
    const incResolved = allIncidents.filter(
      (i) => i.status === "Resolved",
    ).length;
    const incMttrSamples: number[] = [];
    for (const i of allIncidents) {
      if (i.status !== "Resolved" || !i.resolvedAt) continue;
      const resolvedMs = Date.parse(i.resolvedAt);
      const createdMs = Date.parse(i.createdAt);
      if (!Number.isFinite(resolvedMs) || !Number.isFinite(createdMs)) continue;
      if (resolvedMs < cutoffMs) continue;
      const d = resolvedMs - createdMs;
      if (Number.isFinite(d) && d >= 0) incMttrSamples.push(d);
    }

    const slo = buildSloStatus({
      lagBlocks,
      syncStalenessMinutes,
      alertMttaMinutes: toMinutes(safeAvgMs(mttaSamples)),
      alertMttrMinutes: toMinutes(safeAvgMs(mttrSamples)),
      incidentMttrMinutes: toMinutes(safeAvgMs(incMttrSamples)),
      openAlerts: open,
      openCriticalAlerts: openCritical,
    });

    return {
      generatedAt: nowIso,
      windowDays,
      alerts: {
        open,
        acknowledged,
        resolved,
        mttaMs: safeAvgMs(mttaSamples),
        mttrMs: safeAvgMs(mttrSamples),
      },
      incidents: {
        open: incOpen,
        mitigating: incMitigating,
        resolved: incResolved,
        mttrMs: safeAvgMs(incMttrSamples),
      },
      slo,
    };
  }

  const alertWhere = instanceId ? "WHERE fingerprint LIKE $1" : "";
  const alertWhereArgs = instanceId ? [`%:${instanceId}:%`] : [];

  const alertStatusRes = await query<{
    open: string | number;
    acknowledged: string | number;
    resolved: string | number;
    open_critical: string | number;
  }>(
    `
    SELECT
      COUNT(*) FILTER (WHERE status = 'Open') as open,
      COUNT(*) FILTER (WHERE status = 'Acknowledged') as acknowledged,
      COUNT(*) FILTER (WHERE status = 'Resolved') as resolved,
      COUNT(*) FILTER (WHERE status = 'Open' AND severity = 'critical') as open_critical
    FROM alerts
    ${alertWhere}
    `,
    alertWhereArgs,
  );

  const open = Number(alertStatusRes.rows[0]?.open ?? 0);
  const acknowledged = Number(alertStatusRes.rows[0]?.acknowledged ?? 0);
  const resolved = Number(alertStatusRes.rows[0]?.resolved ?? 0);
  const openCritical = Number(alertStatusRes.rows[0]?.open_critical ?? 0);

  const cutoffSeconds = Math.floor(cutoffMs / 1000);
  const mttaRes = await query<{ ms: number | string | null }>(
    instanceId
      ? `
        SELECT AVG(EXTRACT(EPOCH FROM (acknowledged_at - first_seen_at)) * 1000) as ms
        FROM alerts
        WHERE fingerprint LIKE $1 AND acknowledged_at IS NOT NULL AND acknowledged_at >= to_timestamp($2)
        `
      : `
        SELECT AVG(EXTRACT(EPOCH FROM (acknowledged_at - first_seen_at)) * 1000) as ms
        FROM alerts
        WHERE acknowledged_at IS NOT NULL AND acknowledged_at >= to_timestamp($1)
        `,
    instanceId ? [`%:${instanceId}:%`, cutoffSeconds] : [cutoffSeconds],
  );
  const mttrRes = await query<{ ms: number | string | null }>(
    instanceId
      ? `
        SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - first_seen_at)) * 1000) as ms
        FROM alerts
        WHERE fingerprint LIKE $1 AND resolved_at IS NOT NULL AND resolved_at >= to_timestamp($2)
        `
      : `
        SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - first_seen_at)) * 1000) as ms
        FROM alerts
        WHERE resolved_at IS NOT NULL AND resolved_at >= to_timestamp($1)
        `,
    instanceId ? [`%:${instanceId}:%`, cutoffSeconds] : [cutoffSeconds],
  );
  const mttaMsRaw = Number(mttaRes.rows[0]?.ms ?? NaN);
  const mttrMsRaw = Number(mttrRes.rows[0]?.ms ?? NaN);

  const allIncidents = await filterIncidents(
    await listIncidents({ status: "All", limit: 200 }),
  );
  const incOpen = allIncidents.filter((i) => i.status === "Open").length;
  const incMitigating = allIncidents.filter(
    (i) => i.status === "Mitigating",
  ).length;
  const incResolved = allIncidents.filter(
    (i) => i.status === "Resolved",
  ).length;
  const incMttrSamples: number[] = [];
  for (const i of allIncidents) {
    if (i.status !== "Resolved" || !i.resolvedAt) continue;
    const resolvedMs = Date.parse(i.resolvedAt);
    const createdMs = Date.parse(i.createdAt);
    if (!Number.isFinite(resolvedMs) || !Number.isFinite(createdMs)) continue;
    if (resolvedMs < cutoffMs) continue;
    const d = resolvedMs - createdMs;
    if (Number.isFinite(d) && d >= 0) incMttrSamples.push(d);
  }

  const slo = buildSloStatus({
    lagBlocks,
    syncStalenessMinutes,
    alertMttaMinutes: toMinutes(
      Number.isFinite(mttaMsRaw) ? Math.round(mttaMsRaw) : null,
    ),
    alertMttrMinutes: toMinutes(
      Number.isFinite(mttrMsRaw) ? Math.round(mttrMsRaw) : null,
    ),
    incidentMttrMinutes: toMinutes(safeAvgMs(incMttrSamples)),
    openAlerts: open,
    openCriticalAlerts: openCritical,
  });

  return {
    generatedAt: nowIso,
    windowDays,
    alerts: {
      open: Number.isFinite(open) ? open : 0,
      acknowledged: Number.isFinite(acknowledged) ? acknowledged : 0,
      resolved: Number.isFinite(resolved) ? resolved : 0,
      mttaMs: Number.isFinite(mttaMsRaw) ? Math.round(mttaMsRaw) : null,
      mttrMs: Number.isFinite(mttrMsRaw) ? Math.round(mttrMsRaw) : null,
    },
    incidents: {
      open: incOpen,
      mitigating: incMitigating,
      resolved: incResolved,
      mttrMs: safeAvgMs(incMttrSamples),
    },
    slo,
  };
}

export async function getOpsMetricsSeries(params?: {
  seriesDays?: number | null;
  instanceId?: string | null;
}): Promise<OpsMetricsSeriesPoint[]> {
  await ensureDb();
  const seriesDaysRaw = Number(params?.seriesDays ?? 7);
  const seriesDays = Number.isFinite(seriesDaysRaw)
    ? Math.min(90, Math.max(1, Math.round(seriesDaysRaw)))
    : 7;
  const instanceId =
    typeof params?.instanceId === "string" ? params.instanceId.trim() : "";
  const cutoffMs = Date.now() - seriesDays * 24 * 60 * 60_000;
  const dayMs = 24 * 60 * 60_000;
  const end = new Date();
  const endUtc = Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate(),
  );
  const series: OpsMetricsSeriesPoint[] = [];
  for (let i = seriesDays - 1; i >= 0; i -= 1) {
    const date = new Date(endUtc - i * dayMs).toISOString().slice(0, 10);
    series.push({
      date,
      alertsCreated: 0,
      alertsResolved: 0,
      incidentsCreated: 0,
      incidentsResolved: 0,
    });
  }
  const byDate = new Map(series.map((point) => [point.date, point]));

  type NumericField =
    | "alertsCreated"
    | "alertsResolved"
    | "incidentsCreated"
    | "incidentsResolved";

  const addPoint = (
    map: Map<string, OpsMetricsSeriesPoint>,
    date: string,
    field: NumericField,
    value: number,
  ) => {
    const item = map.get(date);
    if (!item) return;
    item[field] += value;
  };

  if (!hasDatabase()) {
    const mem = getMemoryStore();
    const alerts = Array.from(mem.alerts.values());
    const filteredAlerts = instanceId
      ? alerts.filter((a) => a.fingerprint.includes(`:${instanceId}:`))
      : alerts;
    for (const a of filteredAlerts) {
      const created = Date.parse(a.createdAt || a.firstSeenAt);
      if (Number.isFinite(created) && created >= cutoffMs) {
        addPoint(
          byDate,
          new Date(created).toISOString().slice(0, 10),
          "alertsCreated",
          1,
        );
      }
      const resolved = a.resolvedAt ? Date.parse(a.resolvedAt) : NaN;
      if (Number.isFinite(resolved) && resolved >= cutoffMs) {
        addPoint(
          byDate,
          new Date(resolved).toISOString().slice(0, 10),
          "alertsResolved",
          1,
        );
      }
    }
    const incidents = await filterIncidentsByInstanceId(
      await listIncidents({ status: "All", limit: 200 }),
      instanceId,
    );
    for (const i of incidents) {
      const created = Date.parse(i.createdAt);
      if (Number.isFinite(created) && created >= cutoffMs) {
        addPoint(
          byDate,
          new Date(created).toISOString().slice(0, 10),
          "incidentsCreated",
          1,
        );
      }
      const resolved = i.resolvedAt ? Date.parse(i.resolvedAt) : NaN;
      if (Number.isFinite(resolved) && resolved >= cutoffMs) {
        addPoint(
          byDate,
          new Date(resolved).toISOString().slice(0, 10),
          "incidentsResolved",
          1,
        );
      }
    }
    return series;
  }

  const cutoffIso = new Date(cutoffMs).toISOString();
  const alertWhere = instanceId ? "AND fingerprint LIKE $2" : "";
  const alertArgs = instanceId ? [cutoffIso, `%:${instanceId}:%`] : [cutoffIso];

  const createdRes = await query<{ day: string; count: number | string }>(
    `
    SELECT
      to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') as day,
      COUNT(*) as count
    FROM alerts
    WHERE created_at >= $1
    ${alertWhere}
    GROUP BY day
    `,
    alertArgs,
  );
  for (const row of createdRes.rows) {
    const count = Number(row.count ?? 0);
    if (!Number.isFinite(count)) continue;
    addPoint(byDate, row.day, "alertsCreated", count);
  }

  const resolvedRes = await query<{ day: string; count: number | string }>(
    `
    SELECT
      to_char(date_trunc('day', resolved_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') as day,
      COUNT(*) as count
    FROM alerts
    WHERE resolved_at IS NOT NULL AND resolved_at >= $1
    ${alertWhere}
    GROUP BY day
    `,
    alertArgs,
  );
  for (const row of resolvedRes.rows) {
    const count = Number(row.count ?? 0);
    if (!Number.isFinite(count)) continue;
    addPoint(byDate, row.day, "alertsResolved", count);
  }

  const incidents = await filterIncidentsByInstanceId(
    await listIncidents({ status: "All", limit: 200 }),
    instanceId,
  );
  for (const i of incidents) {
    const created = Date.parse(i.createdAt);
    if (Number.isFinite(created) && created >= cutoffMs) {
      addPoint(
        byDate,
        new Date(created).toISOString().slice(0, 10),
        "incidentsCreated",
        1,
      );
    }
    const resolved = i.resolvedAt ? Date.parse(i.resolvedAt) : NaN;
    if (Number.isFinite(resolved) && resolved >= cutoffMs) {
      addPoint(
        byDate,
        new Date(resolved).toISOString().slice(0, 10),
        "incidentsResolved",
        1,
      );
    }
  }

  return series;
}
