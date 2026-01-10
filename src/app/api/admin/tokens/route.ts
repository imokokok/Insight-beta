import { error, getAdminActor, handleApi, rateLimit, requireAdmin } from "@/server/apiResponse";
import { appendAuditLog } from "@/server/observability";
import { createAdminToken, listAdminTokens, revokeAdminToken } from "@/server/adminAuth";
import { z } from "zod";

const createSchema = z.object({
  label: z.string().trim().min(1).max(80),
  role: z.enum(["root", "ops", "alerts", "viewer"])
});

const revokeSchema = z.object({
  id: z.string().trim().min(1)
});

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, { key: "admin_tokens_get", limit: 60, windowMs: 60_000 });
    if (limited) return limited;
    const auth = await requireAdmin(request, { strict: true, scope: "admin_tokens_manage" });
    if (auth) return auth;
    const items = await listAdminTokens();
    return { items };
  });
}

export async function POST(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, { key: "admin_tokens_post", limit: 30, windowMs: 60_000 });
    if (limited) return limited;
    const auth = await requireAdmin(request, { strict: true, scope: "admin_tokens_manage" });
    if (auth) return auth;
    const parsed = await request.json().catch(() => null);
    const body = createSchema.safeParse(parsed);
    if (!body.success) return error({ code: "invalid_request_body" }, 400);
    const actor = getAdminActor(request);
    const created = await createAdminToken({ label: body.data.label, role: body.data.role, createdByActor: actor });
    await appendAuditLog({
      actor,
      action: "admin_token_created",
      entityType: "admin_token",
      entityId: created.record.id,
      details: { label: created.record.label, role: created.record.role }
    });
    return created;
  });
}

export async function DELETE(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, { key: "admin_tokens_delete", limit: 30, windowMs: 60_000 });
    if (limited) return limited;
    const auth = await requireAdmin(request, { strict: true, scope: "admin_tokens_manage" });
    if (auth) return auth;
    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    const parsed = revokeSchema.safeParse(rawParams);
    if (!parsed.success) return error({ code: "invalid_request_body" }, 400);
    const actor = getAdminActor(request);
    const ok = await revokeAdminToken({ id: parsed.data.id });
    if (!ok) return error({ code: "not_found" }, 404);
    await appendAuditLog({
      actor,
      action: "admin_token_revoked",
      entityType: "admin_token",
      entityId: parsed.data.id,
      details: null
    });
    return { ok: true };
  });
}
