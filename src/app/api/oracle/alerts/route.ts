import { cachedJson, handleApi, rateLimit, requireAdmin } from '@/server/apiResponse';
import { ensureOracleSynced } from '@/server/oracle';
import { listAlerts } from '@/server/observability';
import { z } from 'zod';

const alertParamsSchema = z.object({
  status: z.enum(['Open', 'Acknowledged', 'Resolved']).optional().nullable(),
  severity: z.enum(['info', 'warning', 'critical']).optional().nullable(),
  type: z.string().trim().max(100).optional().nullable(),
  q: z.string().optional().nullable(),
  limit: z.coerce.number().min(1).max(100).default(30),
  cursor: z.coerce.number().min(0).default(0),
  sync: z.enum(['0', '1']).optional(),
});

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: 'alerts_get',
      limit: 120,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const url = new URL(request.url);
    const instanceId = url.searchParams.get('instanceId')?.trim() || null;
    const rawParams = Object.fromEntries(url.searchParams);
    const params = alertParamsSchema.parse(rawParams);

    if (params.sync === '1') {
      const auth = await requireAdmin(request, {
        strict: true,
        scope: 'oracle_sync_trigger',
      });
      if (auth) return auth;
      if (instanceId) await ensureOracleSynced(instanceId);
      else await ensureOracleSynced();
    }

    const compute = async () => {
      const { items, total, nextCursor } = await listAlerts({
        status: params.status ?? 'All',
        severity: params.severity ?? 'All',
        type: params.type ?? 'All',
        q: params.q,
        limit: params.limit,
        cursor: params.cursor,
        instanceId,
      });
      return { items, total, nextCursor };
    };

    if (params.sync === '1') return await compute();
    const cacheKey = `oracle_api:${url.pathname}${url.search}`;
    return await cachedJson(cacheKey, 10_000, compute);
  });
}
