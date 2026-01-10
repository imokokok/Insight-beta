import { error, getAdminActor, handleApi, rateLimit, requireAdmin } from "@/server/apiResponse";
import { updateAlertStatus } from "@/server/observability";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["Open", "Acknowledged", "Resolved"])
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, { key: "alerts_patch", limit: 60, windowMs: 60_000 });
    if (limited) return limited;

    const auth = await requireAdmin(request, { strict: true, scope: "alerts_update" });
    if (auth) return auth;

    const { id } = await params;
    const alertId = Number(id);
    if (!Number.isFinite(alertId) || alertId <= 0) {
      return error({ code: "invalid_request_body" }, 400);
    }

    const bodyRaw = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(bodyRaw);
    if (!parsed.success) return error({ code: "invalid_request_body" }, 400);

    const actor = getAdminActor(request);
    const updated = await updateAlertStatus({ id: alertId, status: parsed.data.status, actor });
    if (!updated) return error({ code: "not_found" }, 404);
    return updated;
  });
}
