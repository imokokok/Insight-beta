/**
 * Incidents Module - 事件管理模块
 *
 * 支持事件的查询、创建、更新
 */

import type { Incident, IncidentStatus, AlertSeverity } from '@/lib/types/oracleTypes';
import { readJsonFile, writeJsonFile } from '@/server/kvStore';
import { memoryNowIso } from '@/server/memoryBackend';
import { INCIDENTS_KEY } from './constants';
import { VALID_SEVERITIES } from './constants';
import { appendAuditLog } from './audit';

type IncidentStoreV1 = {
  version: 1;
  nextId: number;
  items: Incident[];
};

function normalizeIncidentStatus(raw: unknown): IncidentStatus {
  return raw === 'Open' || raw === 'Mitigating' || raw === 'Resolved' ? raw : 'Open';
}

function normalizeIncident(input: unknown, fallbackId: number): Incident | null {
  if (!input || typeof input !== 'object') return null;
  const obj = input as Record<string, unknown>;

  const id = Number(obj.id ?? fallbackId);
  if (!Number.isFinite(id) || id <= 0) return null;

  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  if (!title) return null;

  const status = normalizeIncidentStatus(obj.status);
  const severityRaw = typeof obj.severity === 'string' ? obj.severity : '';
  const severity = VALID_SEVERITIES.includes(severityRaw as AlertSeverity)
    ? (severityRaw as AlertSeverity)
    : 'warning';

  const owner = typeof obj.owner === 'string' && obj.owner.trim() ? obj.owner.trim() : null;

  const rootCause =
    typeof obj.rootCause === 'string' && obj.rootCause.trim() ? obj.rootCause.trim() : null;

  const summary = typeof obj.summary === 'string' && obj.summary.trim() ? obj.summary.trim() : null;

  const runbook = typeof obj.runbook === 'string' && obj.runbook.trim() ? obj.runbook.trim() : null;

  const alertIds = Array.isArray(obj.alertIds)
    ? obj.alertIds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)
    : [];

  const entityType =
    typeof obj.entityType === 'string' && obj.entityType.trim() ? obj.entityType.trim() : null;
  const entityId =
    typeof obj.entityId === 'string' && obj.entityId.trim() ? obj.entityId.trim() : null;

  const createdAtRaw = typeof obj.createdAt === 'string' ? obj.createdAt : '';
  const updatedAtRaw = typeof obj.updatedAt === 'string' ? obj.updatedAt : '';
  const resolvedAtRaw = typeof obj.resolvedAt === 'string' ? obj.resolvedAt : null;

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
  const stored = await readJsonFile<unknown>(INCIDENTS_KEY, null);
  const defaultStore: IncidentStoreV1 = { version: 1, nextId: 1, items: [] };
  if (!stored || typeof stored !== 'object') return defaultStore;
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
  const nextId = Number.isFinite(nextIdRaw) && nextIdRaw > maxId ? nextIdRaw : maxId + 1;
  const store: IncidentStoreV1 = { version: 1, nextId, items: normalized };
  if (JSON.stringify(obj.items ?? null) !== JSON.stringify(normalized) || obj.nextId !== nextId) {
    await writeJsonFile(INCIDENTS_KEY, store);
  }
  return store;
}

async function writeIncidentStore(store: IncidentStoreV1) {
  await writeJsonFile(INCIDENTS_KEY, store);
}

/**
 * 查询事件列表
 */
export async function listIncidents(params?: {
  status?: IncidentStatus | 'All' | null;
  limit?: number | null;
}) {
  const store = await readIncidentStore();
  const limit = Math.min(200, Math.max(1, params?.limit ?? 50));
  let items = store.items.slice();
  if (params?.status && params.status !== 'All') {
    items = items.filter((i) => i.status === params.status);
  }
  const statusRank = (s: IncidentStatus) => (s === 'Open' ? 0 : s === 'Mitigating' ? 1 : 2);
  items.sort((a, b) => {
    const r = statusRank(a.status) - statusRank(b.status);
    if (r !== 0) return r;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
  return items.slice(0, limit);
}

/**
 * 获取单个事件
 */
export async function getIncident(id: number) {
  const store = await readIncidentStore();
  const found = store.items.find((i) => i.id === id);
  return found ?? null;
}

/**
 * 创建事件
 */
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
    status: input.status ?? 'Open',
    severity: input.severity,
    owner: input.owner?.trim() ? input.owner.trim() : null,
    rootCause: input.rootCause?.trim() ? input.rootCause.trim() : null,
    summary: input.summary?.trim() ? input.summary.trim() : null,
    runbook: input.runbook?.trim() ? input.runbook.trim() : null,
    alertIds: Array.isArray(input.alertIds)
      ? input.alertIds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)
      : [],
    entityType: input.entityType?.trim() ? input.entityType.trim() : null,
    entityId: input.entityId?.trim() ? input.entityId.trim() : null,
    createdAt: now,
    updatedAt: now,
    resolvedAt: input.status === 'Resolved' ? now : null,
  };

  const nextStore: IncidentStoreV1 = {
    version: 1,
    nextId: store.nextId + 1,
    items: [created, ...store.items],
  };
  await writeIncidentStore(nextStore);
  await appendAuditLog({
    actor: input.actor ?? null,
    action: 'incident_created',
    entityType: 'incident',
    entityId: String(created.id),
    details: created,
  });
  return created;
}

/**
 * 更新事件
 */
export async function patchIncident(input: {
  id: number;
  patch: Partial<
    Pick<
      Incident,
      | 'title'
      | 'status'
      | 'severity'
      | 'owner'
      | 'rootCause'
      | 'summary'
      | 'runbook'
      | 'alertIds'
      | 'entityType'
      | 'entityId'
    >
  >;
  actor?: string | null;
}) {
  const store = await readIncidentStore();
  const idx = store.items.findIndex((i) => i.id === input.id);
  if (idx < 0) return null;

  const prev = store.items[idx];
  if (!prev) return null;
  const now = memoryNowIso();

  const next: Incident = {
    id: prev.id,
    title: prev.title,
    status: prev.status,
    severity: prev.severity,
    owner: prev.owner,
    rootCause: prev.rootCause,
    summary: prev.summary,
    runbook: prev.runbook,
    alertIds: prev.alertIds,
    entityType: prev.entityType,
    entityId: prev.entityId,
    createdAt: prev.createdAt,
    ...(input.patch.title !== undefined && { title: input.patch.title.trim() }),
    ...(input.patch.status !== undefined && { status: input.patch.status }),
    ...(input.patch.severity !== undefined && { severity: input.patch.severity }),
    ...(input.patch.owner !== undefined && { owner: input.patch.owner?.trim() ?? null }),
    ...(input.patch.rootCause !== undefined && {
      rootCause: input.patch.rootCause?.trim() ?? null,
    }),
    ...(input.patch.summary !== undefined && { summary: input.patch.summary?.trim() ?? null }),
    ...(input.patch.runbook !== undefined && { runbook: input.patch.runbook?.trim() ?? null }),
    ...(input.patch.alertIds !== undefined && {
      alertIds: Array.isArray(input.patch.alertIds)
        ? input.patch.alertIds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)
        : [],
    }),
    ...(input.patch.entityType !== undefined && {
      entityType: input.patch.entityType?.trim() ?? null,
    }),
    ...(input.patch.entityId !== undefined && { entityId: input.patch.entityId?.trim() ?? null }),
    updatedAt: now,
    resolvedAt:
      input.patch.status === 'Resolved'
        ? now
        : input.patch.status === 'Open' || input.patch.status === 'Mitigating'
          ? null
          : prev.resolvedAt,
  };

  if (!next.title) return null;

  const nextItems = store.items.slice();
  nextItems[idx] = next;
  await writeIncidentStore({ version: 1, nextId: store.nextId, items: nextItems });
  await appendAuditLog({
    actor: input.actor ?? null,
    action: 'incident_updated',
    entityType: 'incident',
    entityId: String(next.id),
    details: { before: prev, after: next },
  });
  return next;
}
