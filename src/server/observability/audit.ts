/**
 * Audit Module - 审计日志模块
 *
 * 支持审计日志的追加和查询
 */

import type { AuditLogEntry } from '@/lib/types/oracleTypes';
import { hasDatabase, query } from '@/server/db';
import { getMemoryStore, memoryNowIso } from '@/server/memoryBackend';
import { ensureSchema } from '@/server/schema';
import { MEMORY_MAX_AUDIT } from './constants';
import type { DbAuditRow } from './types';

let schemaEnsured = false;
async function ensureDb() {
  if (!hasDatabase()) return;
  if (!schemaEnsured) {
    await ensureSchema();
    schemaEnsured = true;
  }
}

function mapAuditRow(row: DbAuditRow): AuditLogEntry {
  return {
    id: Number(row.id),
    actor: row.actor,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    details: row.details,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * 追加审计日志
 */
export async function appendAuditLog(input: {
  actor: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details?: unknown;
}) {
  await ensureDb();
  const now = memoryNowIso();
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    const entry: AuditLogEntry = {
      id: mem.audit.length + 1,
      actor: input.actor ?? null,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      details: input.details ?? null,
      createdAt: now,
    };
    mem.audit.push(entry);
    if (mem.audit.length > MEMORY_MAX_AUDIT) {
      mem.audit.length = MEMORY_MAX_AUDIT;
    }
    return entry;
  }

  const res = await query<DbAuditRow>(
    `INSERT INTO audit_log (actor, action, entity_type, entity_id, details, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING *`,
    [
      input.actor ?? null,
      input.action,
      input.entityType ?? null,
      input.entityId ?? null,
      JSON.stringify(input.details ?? null),
    ],
  );
  const row = res.rows[0];
  if (!row) throw new Error('Failed to insert audit log');
  return mapAuditRow(row);
}

/**
 * 查询审计日志
 */
export async function listAuditLog(params: {
  entityType?: string | null;
  entityId?: string | null;
  action?: string | null;
  actor?: string | null;
  limit?: number | null;
  cursor?: number | null;
}) {
  await ensureDb();
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    const limit = Math.min(200, Math.max(1, params.limit ?? 50));
    const offset = Math.max(0, params.cursor ?? 0);
    let logs = mem.audit.slice();
    if (params.entityType) {
      logs = logs.filter((l) => l.entityType === params.entityType);
    }
    if (params.entityId) {
      logs = logs.filter((l) => l.entityId === params.entityId);
    }
    if (params.action) {
      logs = logs.filter((l) => l.action === params.action);
    }
    if (params.actor) {
      logs = logs.filter((l) => l.actor === params.actor);
    }
    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = logs.length;
    const slice = logs.slice(offset, offset + limit);
    return {
      items: slice,
      total,
      nextCursor: offset + slice.length < total ? offset + limit : null,
    };
  }

  const limit = Math.min(200, Math.max(1, params.limit ?? 50));
  const offset = Math.max(0, params.cursor ?? 0);

  const conditions: string[] = [];
  const values: (string | number | null)[] = [];
  let idx = 1;

  if (params.entityType) {
    conditions.push(`entity_type = $${idx++}`);
    values.push(params.entityType);
  }
  if (params.entityId) {
    conditions.push(`entity_id = $${idx++}`);
    values.push(params.entityId);
  }
  if (params.action) {
    conditions.push(`action = $${idx++}`);
    values.push(params.action);
  }
  if (params.actor) {
    conditions.push(`actor = $${idx++}`);
    values.push(params.actor);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countRes = await query(`SELECT COUNT(*) as total FROM audit_log ${whereClause}`, values);
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
