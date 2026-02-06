import { z } from 'zod';

import {
  cachedJson,
  error,
  getAdminActor,
  handleApi,
  invalidateCachedJson,
  rateLimit,
  requireAdmin,
} from '@/server/apiResponse';
import { createIncident, getAlertsByIds, listIncidents } from '@/server/observability';
import type { Alert } from '@/server/observability';

const querySchema = z.object({
  status: z.enum(['Open', 'Mitigating', 'Resolved']).optional().nullable(),
  limit: z.coerce.number().min(1).max(200).optional().nullable(),
  includeAlerts: z.enum(['0', '1']).optional(),
});

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  severity: z.enum(['info', 'warning', 'critical']),
  status: z.enum(['Open', 'Mitigating', 'Resolved']).optional(),
  owner: z.string().trim().max(80).optional().nullable(),
  rootCause: z.string().trim().max(120).optional().nullable(),
  summary: z.string().trim().max(5000).optional().nullable(),
  runbook: z.string().trim().max(500).optional().nullable(),
  alertIds: z.array(z.coerce.number().int().positive()).max(200).optional(),
  entityType: z.string().trim().max(40).optional().nullable(),
  entityId: z.string().trim().max(200).optional().nullable(),
});

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: 'incidents_get',
      limit: 240,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const url = new URL(request.url);
    const q = querySchema.parse(Object.fromEntries(url.searchParams));
    const instanceId = url.searchParams.get('instanceId')?.trim() || null;
    const cacheKey = `oracle_api:${url.pathname}${url.search}`;
    return await cachedJson(cacheKey, 5_000, async () => {
      let items = await listIncidents({
        status: q.status ?? 'All',
        limit: q.limit ?? 50,
      });
      const toSummary = (a: Alert) => ({
        id: a.id,
        type: a.type,
        severity: a.severity,
        title: a.title,
        message: a.message,
        entityType: a.entityType,
        entityId: a.entityId,
        status: a.status,
        occurrences: a.occurrences,
        firstSeenAt: a.firstSeenAt,
        lastSeenAt: a.lastSeenAt,
        acknowledgedAt: a.acknowledgedAt,
        resolvedAt: a.resolvedAt,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      });

      let byId: Map<number, Alert> | null = null;
      if (instanceId) {
        const allIds: number[] = [];
        for (const i of items) allIds.push(...(i.alertIds ?? []));
        const alerts = await getAlertsByIds(allIds);
        const marker = `:${instanceId}:`;
        const filtered = alerts.filter((a) => a.fingerprint.includes(marker));
        byId = new Map(filtered.map((a) => [a.id, a]));
        const byIdMap = byId;
        items = items.filter((i) => {
          const ids = i.alertIds ?? [];
          if (ids.length > 0) return ids.some((id) => byIdMap.has(id));
          const entityId = i.entityId?.trim() || '';
          if (!entityId) return true;
          return entityId === instanceId;
        });
      }

      if (q.includeAlerts === '1') {
        if (!byId) {
          const allIds: number[] = [];
          for (const i of items) allIds.push(...(i.alertIds ?? []));
          const alerts = await getAlertsByIds(allIds);
          byId = new Map(alerts.map((a) => [a.id, a]));
        }

        const byIdMap = byId;
        return {
          items: items.map((i) => ({
            ...i,
            alerts: (i.alertIds ?? [])
              .map((id) => byIdMap.get(id))
              .filter((a): a is Alert => Boolean(a))
              .map(toSummary),
          })),
        };
      }

      return { items };
    });
  });
}

export async function POST(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: 'incidents_post',
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAdmin(request, {
      strict: true,
      scope: 'alerts_update',
    });
    if (auth) return auth;

    const bodyRaw = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(bodyRaw);
    if (!parsed.success) return error({ code: 'invalid_request_body' }, 400);

    const actor = getAdminActor(request);
    const created = await createIncident({ ...parsed.data, actor });
    if (!created) return error({ code: 'invalid_request_body' }, 400);
    await invalidateCachedJson('oracle_api:/api/oracle/incidents');
    return { ok: true, incident: created };
  });
}
