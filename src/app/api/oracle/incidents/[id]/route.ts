import {
  error,
  getAdminActor,
  handleApi,
  invalidateCachedJson,
  rateLimit,
  requireAdmin,
} from "@/server/apiResponse";
import type { Alert } from "@/server/observability";
import {
  getAlertsByIds,
  getIncident,
  patchIncident,
  updateAlertStatus,
} from "@/server/observability";
import { z } from "zod";

const querySchema = z.object({
  includeAlerts: z.enum(["0", "1"]).optional(),
});

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  status: z.enum(["Open", "Mitigating", "Resolved"]).optional(),
  severity: z.enum(["info", "warning", "critical"]).optional(),
  owner: z.string().trim().max(80).optional().nullable(),
  rootCause: z.string().trim().max(120).optional().nullable(),
  summary: z.string().trim().max(5000).optional().nullable(),
  runbook: z.string().trim().max(500).optional().nullable(),
  alertIds: z.array(z.coerce.number().int().positive()).max(200).optional(),
  entityType: z.string().trim().max(40).optional().nullable(),
  entityId: z.string().trim().max(200).optional().nullable(),
  action: z.enum(["ack_alerts", "resolve_alerts"]).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: "incident_get",
      limit: 240,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const { id } = await params;
    const incidentId = Number(id);
    if (!Number.isFinite(incidentId) || incidentId <= 0) {
      return error({ code: "invalid_request_body" }, 400);
    }

    const incident = await getIncident(incidentId);
    if (!incident) return error({ code: "not_found" }, 404);
    const url = new URL(request.url);
    const q = querySchema.parse(Object.fromEntries(url.searchParams));
    const instanceId = url.searchParams.get("instanceId")?.trim() || null;
    if (q.includeAlerts === "1") {
      let alerts = await getAlertsByIds(incident.alertIds ?? []);
      if (instanceId) {
        const marker = `:${instanceId}:`;
        alerts = alerts.filter((a) => a.fingerprint.includes(marker));
      }
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
      return {
        ok: true,
        incident: { ...incident, alerts: alerts.map(toSummary) },
      };
    }
    return { ok: true, incident };
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: "incident_patch",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAdmin(request, {
      strict: true,
      scope: "alerts_update",
    });
    if (auth) return auth;

    const { id } = await params;
    const incidentId = Number(id);
    if (!Number.isFinite(incidentId) || incidentId <= 0) {
      return error({ code: "invalid_request_body" }, 400);
    }

    const bodyRaw = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(bodyRaw);
    if (!parsed.success) return error({ code: "invalid_request_body" }, 400);

    const actor = getAdminActor(request);
    const { action, ...patch } = parsed.data;
    const url = new URL(request.url);
    const instanceId = url.searchParams.get("instanceId")?.trim() || null;

    if (action) {
      const incident = await getIncident(incidentId);
      if (!incident) return error({ code: "not_found" }, 404);

      const ids = incident.alertIds ?? [];
      let allowedIds = ids;
      if (instanceId) {
        const alerts = await getAlertsByIds(ids);
        const marker = `:${instanceId}:`;
        allowedIds = alerts
          .filter((a) => a.fingerprint.includes(marker))
          .map((a) => a.id);
      }

      for (const alertId of allowedIds) {
        await updateAlertStatus({
          id: alertId,
          status: action === "ack_alerts" ? "Acknowledged" : "Resolved",
          actor,
        });
      }
      const updated = await patchIncident({
        id: incidentId,
        patch: {},
        actor,
      });
      if (!updated) return error({ code: "not_found" }, 404);
      await invalidateCachedJson("oracle_api:/api/oracle/alerts");
      await invalidateCachedJson("oracle_api:/api/oracle/incidents");
      return { ok: true, incident: updated };
    }

    const updated = await patchIncident({
      id: incidentId,
      patch,
      actor,
    });
    if (!updated) return error({ code: "not_found" }, 404);
    await invalidateCachedJson("oracle_api:/api/oracle/incidents");
    return { ok: true, incident: updated };
  });
}
