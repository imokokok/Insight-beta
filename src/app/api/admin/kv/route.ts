import {
  error,
  getAdminActor,
  handleApi,
  rateLimit,
  requireAdmin,
} from "@/server/apiResponse";
import {
  deleteJsonKey,
  listJsonKeys,
  readJsonFile,
  writeJsonFile,
} from "@/server/kvStore";
import { appendAuditLog } from "@/server/observability";
import { z } from "zod";

const getKeySchema = z.object({
  key: z.string().trim().max(200).optional(),
  prefix: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const putBodySchema = z.object({
  key: z.string().trim().min(1).max(200),
  value: z.unknown(),
});

const deleteKeySchema = z.object({
  key: z.string().trim().min(1).max(200),
});

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: "admin_kv_get",
      limit: 120,
      windowMs: 60_000,
    });
    if (limited) return limited;
    const auth = await requireAdmin(request, {
      strict: true,
      scope: "admin_kv_read",
    });
    if (auth) return auth;

    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    const params = getKeySchema.parse(rawParams);

    if (params.key) {
      const value = await readJsonFile<unknown>(params.key, null);
      return { key: params.key, value };
    }

    const listed = await listJsonKeys({
      prefix: params.prefix || undefined,
      limit: params.limit,
      offset: params.offset,
    });
    return listed;
  });
}

export async function PUT(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: "admin_kv_put",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;
    const auth = await requireAdmin(request, {
      strict: true,
      scope: "admin_kv_write",
    });
    if (auth) return auth;

    const parsed = await request.json().catch(() => null);
    const body = putBodySchema.safeParse(parsed);

    if (!body.success) {
      return error({ code: "invalid_request_body" }, 400);
    }

    await writeJsonFile(body.data.key, body.data.value);
    const actor = getAdminActor(request);
    await appendAuditLog({
      actor,
      action: "admin_kv_put",
      entityType: "kv",
      entityId: body.data.key,
      details: null,
    });
    return { ok: true, key: body.data.key };
  });
}

export async function DELETE(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: "admin_kv_delete",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;
    const auth = await requireAdmin(request, {
      strict: true,
      scope: "admin_kv_write",
    });
    if (auth) return auth;

    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    const params = deleteKeySchema.safeParse(rawParams);

    if (!params.success) {
      return error({ code: "invalid_request_body" }, 400);
    }

    await deleteJsonKey(params.data.key);
    const actor = getAdminActor(request);
    await appendAuditLog({
      actor,
      action: "admin_kv_delete",
      entityType: "kv",
      entityId: params.data.key,
      details: null,
    });
    return { ok: true, key: params.data.key };
  });
}
