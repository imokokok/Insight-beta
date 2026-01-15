import { hasDatabase, query } from "@/server/db";
import { ensureSchema } from "@/server/schema";
import { readJsonFile, writeJsonFile } from "@/server/kvStore";
import { getMemoryStore, memoryNowIso } from "@/server/memoryBackend";
import { notifyAlert, type NotificationOptions } from "@/server/notifications";

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

export type AlertRuleEvent =
  | "dispute_created"
  | "sync_error"
  | "stale_sync"
  | "slow_api_request"
  | "high_error_rate"
  | "database_slow_query";

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
  channels?: Array<"webhook" | "email">;
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

let schemaEnsured = false;
async function ensureDb() {
  if (!hasDatabase()) return;
  if (!schemaEnsured) {
    await ensureSchema();
    schemaEnsured = true;
  }
}

const ALERT_RULES_KEY = "alert_rules/v1";
const MEMORY_MAX_ALERTS = 2000;
const MEMORY_MAX_AUDIT = 5000;

const validRuleEvents: AlertRuleEvent[] = [
  "dispute_created",
  "sync_error",
  "stale_sync",
  "slow_api_request",
  "high_error_rate",
  "database_slow_query",
];

const validSeverities: AlertSeverity[] = ["info", "warning", "critical"];

function normalizeRuleChannels(
  channels: unknown,
  recipient: string | null,
): Array<"webhook" | "email"> {
  const raw =
    Array.isArray(channels) && channels.length > 0 ? channels : ["webhook"];
  const out: Array<"webhook" | "email"> = [];
  for (const c of raw) {
    if (c !== "webhook" && c !== "email") continue;
    if (!out.includes(c)) out.push(c);
  }
  const safe: Array<"webhook" | "email"> =
    out.length > 0 ? out : (["webhook"] as Array<"webhook" | "email">);
  if (safe.includes("email") && !recipient) {
    const withoutEmail = safe.filter((c) => c !== "email");
    return withoutEmail.length > 0
      ? (withoutEmail as Array<"webhook" | "email">)
      : (["webhook"] as Array<"webhook" | "email">);
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

  if (event === "stale_sync") {
    const maxAgeMs = getNumber("maxAgeMs");
    const v =
      Number.isFinite(maxAgeMs) && maxAgeMs > 0 ? maxAgeMs : 5 * 60 * 1000;
    return setNumber("maxAgeMs", v);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAlertRow(row: any): Alert {
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
  const result = await query(
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
}) {
  await ensureDb();
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    const limit = Math.min(100, Math.max(1, params.limit ?? 30));
    const offset = Math.max(0, params.cursor ?? 0);
    let alerts = Array.from(mem.alerts.values());
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

  const res = await query(
    `SELECT * FROM alerts ${whereClause} ORDER BY status ASC, last_seen_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    [...values, limit, offset],
  );

  return {
    items: res.rows.map(mapAlertRow),
    total,
    nextCursor: offset + res.rows.length < total ? offset + limit : null,
  };
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

  const res = await query(
    `
    UPDATE alerts
    SET status = $1, ${nowFields}, updated_at = NOW()
    WHERE id = $2
    RETURNING *
    `,
    [status, input.id],
  );

  if (res.rows.length === 0) return null;

  await appendAuditLog({
    actor: input.actor ?? null,
    action: "alert_status_updated",
    entityType: "alert",
    entityId: String(input.id),
    details: { status },
  });

  return mapAlertRow(res.rows[0]);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAuditRow(row: any): AuditLogEntry {
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

  const countRes = await query(
    `SELECT COUNT(*) as total FROM audit_log ${whereClause}`,
    values,
  );
  const total = Number(countRes.rows[0]?.total || 0);
  const res = await query(
    `SELECT * FROM audit_log ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    [...values, limit, offset],
  );
  return {
    items: res.rows.map(mapAuditRow),
    total,
    nextCursor: offset + res.rows.length < total ? offset + limit : null,
  };
}
