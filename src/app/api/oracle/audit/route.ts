import { error, handleApi, rateLimit, requireAdmin } from '@/server/apiResponse';
import { listAuditLog } from '@/server/observability';
import { z } from 'zod';

const paramsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  cursor: z.coerce.number().min(0).default(0),
  actor: z.string().trim().max(80).optional().nullable(),
  action: z.string().trim().max(120).optional().nullable(),
  entityType: z.string().trim().max(80).optional().nullable(),
  entityId: z.string().trim().max(200).optional().nullable(),
  q: z.string().trim().max(200).optional().nullable(),
});

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: 'audit_get',
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAdmin(request, {
      strict: true,
      scope: 'audit_read',
    });
    if (auth) return auth;

    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    const parsed = paramsSchema.safeParse(rawParams);
    if (!parsed.success) return error({ code: 'invalid_request_body' }, 400);

    return listAuditLog({
      limit: parsed.data.limit,
      cursor: parsed.data.cursor,
      actor: parsed.data.actor,
      action: parsed.data.action,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      q: parsed.data.q,
    });
  });
}
