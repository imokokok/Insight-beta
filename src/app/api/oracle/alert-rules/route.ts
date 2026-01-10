import { error, getAdminActor, handleApi, rateLimit, requireAdmin } from "@/server/apiResponse";
import { appendAuditLog, readAlertRules, writeAlertRules } from "@/server/observability";
import { z } from "zod";

const ruleSchema = z.object({
  id: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  enabled: z.boolean(),
  event: z.enum(["dispute_created", "sync_error", "stale_sync"]),
  severity: z.enum(["info", "warning", "critical"]),
  params: z.record(z.string(), z.unknown()).optional()
});

const putSchema = z.object({
  rules: z.array(ruleSchema).min(1).max(50)
});

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = rateLimit(request, { key: "alert_rules_get", limit: 240, windowMs: 60_000 });
    if (limited) return limited;
    const rules = await readAlertRules();
    return { rules };
  });
}

export async function PUT(request: Request) {
  return handleApi(request, async () => {
    const limited = rateLimit(request, { key: "alert_rules_put", limit: 30, windowMs: 60_000 });
    if (limited) return limited;

    const auth = await requireAdmin(request, { strict: true, scope: "alert_rules_write" });
    if (auth) return auth;

    const parsed = await request.json().catch(() => null);
    const body = putSchema.safeParse(parsed);
    if (!body.success) return error({ code: "invalid_request_body" }, 400);

    await writeAlertRules(body.data.rules);
    const actor = getAdminActor(request);
    await appendAuditLog({
      actor,
      action: "alert_rules_updated",
      entityType: "alerts",
      entityId: null,
      details: { count: body.data.rules.length }
    });
    return { rules: body.data.rules };
  });
}
