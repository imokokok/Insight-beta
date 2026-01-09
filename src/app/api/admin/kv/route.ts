import { error, handleApi } from "@/server/apiResponse";
import { deleteJsonKey, listJsonKeys, readJsonFile, writeJsonFile } from "@/server/kvStore";
import { env } from "@/lib/env";
import { z } from "zod";

function requireAdminStrict(request: Request) {
  const token = env.INSIGHT_ADMIN_TOKEN;
  if (!token) return error("forbidden", 403);
  const headerToken = request.headers.get("x-admin-token")?.trim() ?? "";
  const auth = request.headers.get("authorization")?.trim() ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (headerToken === token || bearer === token) return null;
  return error("forbidden", 403);
}

const getKeySchema = z.object({
  key: z.string().trim().max(200).optional(),
  prefix: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

const putBodySchema = z.object({
  key: z.string().trim().min(1).max(200),
  value: z.unknown()
});

const deleteKeySchema = z.object({
  key: z.string().trim().min(1).max(200)
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const auth = requireAdminStrict(request);
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
      offset: params.offset
    });
    return listed;
  });
}

export async function PUT(request: Request) {
  return handleApi(async () => {
    const auth = requireAdminStrict(request);
    if (auth) return auth;

    const parsed = await request.json().catch(() => null);
    const body = putBodySchema.safeParse(parsed);
    
    if (!body.success) {
      return error("invalid_request_body", 400);
    }

    await writeJsonFile(body.data.key, body.data.value);
    return { ok: true, key: body.data.key };
  });
}

export async function DELETE(request: Request) {
  return handleApi(async () => {
    const auth = requireAdminStrict(request);
    if (auth) return auth;

    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    const params = deleteKeySchema.safeParse(rawParams);
    
    if (!params.success) {
      return error("invalid_request_body", 400);
    }

    await deleteJsonKey(params.data.key);
    return { ok: true, key: params.data.key };
  });
}

