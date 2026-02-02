/**
 * Alerts Module - 告警管理模块
 *
 * 支持告警的创建、查询、更新、清理
 */

import type { Alert, AlertSeverity, AlertStatus } from '@/lib/types/oracleTypes';
import type { NotificationOptions } from '@/server/notifications';
import { hasDatabase, query } from '@/server/db';
import { getMemoryStore, memoryNowIso } from '@/server/memoryBackend';
import { notifyAlert } from '@/server/notifications';
import { ensureSchema } from '@/server/schema';
import { MEMORY_MAX_ALERTS } from './constants';
import type { DbAlertRow } from './types';

let schemaEnsured = false;
async function ensureDb() {
  if (!hasDatabase()) return;
  if (!schemaEnsured) {
    await ensureSchema();
    schemaEnsured = true;
  }
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
    acknowledgedAt: row.acknowledged_at ? row.acknowledged_at.toISOString() : null,
    resolvedAt: row.resolved_at ? row.resolved_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function pruneMemoryAlerts(mem: ReturnType<typeof getMemoryStore>) {
  const overflow = mem.alerts.size - MEMORY_MAX_ALERTS;
  if (overflow <= 0) return;
  const statusRank = (s: Alert['status']) => (s === 'Open' ? 0 : s === 'Acknowledged' ? 1 : 2);
  const candidates = Array.from(mem.alerts.entries()).map(([fingerprint, a]) => ({
    fingerprint,
    statusRank: statusRank(a.status),
    lastSeenAtMs: new Date(a.lastSeenAt).getTime(),
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

/**
 * 创建或更新告警
 */
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
        existing.status === 'Resolved'
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
              status: 'Open' as const,
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
      if (next.status === 'Open' && existing.status === 'Resolved') {
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
        status: 'Open' as const,
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

  // Database mode
  const now = new Date();
  const existingRes = await query<DbAlertRow>('SELECT * FROM alerts WHERE fingerprint = $1', [
    input.fingerprint,
  ]);
  const existing = existingRes.rows[0];

  if (existing) {
    const isResolved = existing.status === 'Resolved';
    const nextStatus: AlertStatus = isResolved ? 'Open' : existing.status;
    const nextResolvedAt = isResolved ? null : existing.resolved_at;

    await query(
      `UPDATE alerts SET
        severity = $1,
        title = $2,
        message = $3,
        entity_type = $4,
        entity_id = $5,
        occurrences = occurrences + 1,
        last_seen_at = $6,
        updated_at = $6,
        status = $7,
        resolved_at = $8
      WHERE fingerprint = $9`,
      [
        input.severity,
        input.title,
        input.message,
        input.entityType ?? null,
        input.entityId ?? null,
        now,
        nextStatus,
        nextResolvedAt,
        input.fingerprint,
      ],
    );

    if (isResolved) {
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
  } else {
    await query(
      `INSERT INTO alerts (
        fingerprint, type, severity, title, message,
        entity_type, entity_id, status, occurrences,
        first_seen_at, last_seen_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, $10, $10)`,
      [
        input.fingerprint,
        input.type,
        input.severity,
        input.title,
        input.message,
        input.entityType ?? null,
        input.entityId ?? null,
        'Open',
        1,
        now,
      ],
    );
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

/**
 * 查询告警列表
 */
export async function listAlerts(params: {
  status?: AlertStatus | 'All' | null;
  severity?: AlertSeverity | 'All' | null;
  type?: string | 'All' | null;
  q?: string | null;
  limit?: number | null;
  cursor?: number | null;
  instanceId?: string | null;
}) {
  await ensureDb();
  const instanceId = typeof params.instanceId === 'string' ? params.instanceId.trim() : '';
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    const limit = Math.min(100, Math.max(1, params.limit ?? 30));
    const offset = Math.max(0, params.cursor ?? 0);
    let alerts = Array.from(mem.alerts.values());
    if (instanceId) {
      const marker = `:${instanceId}:`;
      alerts = alerts.filter((a) => a.fingerprint.includes(marker));
    }
    if (params.status && params.status !== 'All') {
      alerts = alerts.filter((a) => a.status === params.status);
    }
    if (params.severity && params.severity !== 'All') {
      alerts = alerts.filter((a) => a.severity === params.severity);
    }
    if (params.type && params.type !== 'All') {
      alerts = alerts.filter((a) => a.type === params.type);
    }
    if (params.q?.trim()) {
      const q = params.q.trim().toLowerCase();
      alerts = alerts.filter((a) => {
        return (
          a.title.toLowerCase().includes(q) ||
          a.message.toLowerCase().includes(q) ||
          (a.entityId ?? '').toLowerCase().includes(q)
        );
      });
    }
    alerts.sort((a, b) => {
      const statusRank = (s: Alert['status']) => (s === 'Open' ? 0 : s === 'Acknowledged' ? 1 : 2);
      const r = statusRank(a.status) - statusRank(b.status);
      if (r !== 0) return r;
      return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
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

  if (params.status && params.status !== 'All') {
    conditions.push(`status = $${idx++}`);
    values.push(params.status);
  }

  if (params.severity && params.severity !== 'All') {
    conditions.push(`severity = $${idx++}`);
    values.push(params.severity);
  }

  if (params.type && params.type !== 'All') {
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

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countRes = await query(`SELECT COUNT(*) as total FROM alerts ${whereClause}`, values);
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

/**
 * 清理过期告警
 */
export async function pruneStaleAlerts() {
  await ensureDb();
  const cutoffMs = Date.now() - 7 * 24 * 60 * 60_000;
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    let resolved = 0;
    for (const [fingerprint, alert] of mem.alerts.entries()) {
      if (alert.status === 'Resolved') continue;
      const lastSeenMs = Date.parse(alert.lastSeenAt);
      if (!Number.isFinite(lastSeenMs) || lastSeenMs >= cutoffMs) continue;
      const now = memoryNowIso();
      mem.alerts.set(fingerprint, {
        ...alert,
        status: 'Resolved',
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
