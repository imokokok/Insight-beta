import { hasDatabase, query } from "@/server/db";
import { ensureSchema } from "@/server/schema";
import { readJsonFile, writeJsonFile } from "@/server/kvStore";
import { getMemoryStore, memoryNowIso } from "@/server/memoryBackend";

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

export type AlertRuleEvent = "dispute_created" | "sync_error" | "stale_sync";

export type AlertRule = {
  id: string;
  name: string;
  enabled: boolean;
  event: AlertRuleEvent;
  severity: AlertSeverity;
  params?: Record<string, unknown>;
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

function pruneMemoryAlerts(mem: ReturnType<typeof getMemoryStore>) {
  const overflow = mem.alerts.size - MEMORY_MAX_ALERTS;
  if (overflow <= 0) return;
  const statusRank = (s: Alert["status"]) => (s === "Open" ? 0 : s === "Acknowledged" ? 1 : 2);
  const candidates = Array.from(mem.alerts.entries()).map(([fingerprint, a]) => ({
    fingerprint,
    statusRank: statusRank(a.status),
    lastSeenAtMs: new Date(a.lastSeenAt).getTime()
  }));
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
  if (Array.isArray(stored)) return stored as AlertRule[];
  const defaults: AlertRule[] = [
    {
      id: "dispute_created",
      name: "Dispute created",
      enabled: true,
      event: "dispute_created",
      severity: "critical"
    },
    {
      id: "sync_error",
      name: "Sync error",
      enabled: true,
      event: "sync_error",
      severity: "warning"
    },
    {
      id: "stale_sync_5m",
      name: "Stale sync > 5m",
      enabled: true,
      event: "stale_sync",
      severity: "warning",
      params: { maxAgeMs: 5 * 60 * 1000 }
    }
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
    acknowledgedAt: row.acknowledged_at ? row.acknowledged_at.toISOString() : null,
    resolvedAt: row.resolved_at ? row.resolved_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
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
              resolvedAt: null
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
              updatedAt: now
            };
      mem.alerts.set(input.fingerprint, next);
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
        updatedAt: now
      };
      mem.alerts.set(input.fingerprint, created);
    }
    pruneMemoryAlerts(mem);
    return;
  }
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
      input.entityId ?? null
    ]
  );
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
      const statusRank = (s: Alert["status"]) => (s === "Open" ? 0 : s === "Acknowledged" ? 1 : 2);
      const r = statusRank(a.status) - statusRank(b.status);
      if (r !== 0) return r;
      return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
    });
    const total = alerts.length;
    const slice = alerts.slice(offset, offset + limit);
    return {
      items: slice,
      total,
      nextCursor: offset + slice.length < total ? offset + limit : null
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

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const countRes = await query(`SELECT COUNT(*) as total FROM alerts ${whereClause}`, values);
  const total = Number(countRes.rows[0]?.total || 0);

  const res = await query(
    `SELECT * FROM alerts ${whereClause} ORDER BY status ASC, last_seen_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    [...values, limit, offset]
  );

  return {
    items: res.rows.map(mapAlertRow),
    total,
    nextCursor: offset + res.rows.length < total ? offset + limit : null
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
        ? { ...found, status: "Acknowledged" as const, acknowledgedAt: now, resolvedAt: null, updatedAt: now }
        : input.status === "Resolved"
          ? { ...found, status: "Resolved" as const, resolvedAt: now, updatedAt: now }
          : { ...found, status: "Open" as const, acknowledgedAt: null, resolvedAt: null, updatedAt: now };
    mem.alerts.set(found.fingerprint, updated);
    await appendAuditLog({
      actor: input.actor ?? null,
      action: "alert_status_updated",
      entityType: "alert",
      entityId: String(input.id),
      details: { status: input.status }
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
    [status, input.id]
  );

  if (res.rows.length === 0) return null;

  await appendAuditLog({
    actor: input.actor ?? null,
    action: "alert_status_updated",
    entityType: "alert",
    entityId: String(input.id),
    details: { status }
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
      details: input.details ?? null
    });
    if (mem.audit.length > MEMORY_MAX_AUDIT) mem.audit.length = MEMORY_MAX_AUDIT;
    return;
  }
  await query(
    `
    INSERT INTO audit_log (actor, action, entity_type, entity_id, details, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    `,
    [input.actor, input.action, input.entityType ?? null, input.entityId ?? null, input.details ?? null]
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
    details: row.details
  };
}

export async function listAuditLog(params: { limit?: number | null; cursor?: number | null }) {
  await ensureDb();
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    const limit = Math.min(100, Math.max(1, params.limit ?? 50));
    const offset = Math.max(0, params.cursor ?? 0);
    const total = mem.audit.length;
    const slice = mem.audit.slice(offset, offset + limit);
    return {
      items: slice,
      total,
      nextCursor: offset + slice.length < total ? offset + limit : null
    };
  }
  const limit = Math.min(100, Math.max(1, params.limit ?? 50));
  const offset = Math.max(0, params.cursor ?? 0);
  const countRes = await query(`SELECT COUNT(*) as total FROM audit_log`);
  const total = Number(countRes.rows[0]?.total || 0);
  const res = await query(
    `SELECT * FROM audit_log ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return {
    items: res.rows.map(mapAuditRow),
    total,
    nextCursor: offset + res.rows.length < total ? offset + limit : null
  };
}
