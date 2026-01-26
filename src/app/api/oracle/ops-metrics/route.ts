import { cachedJson, handleApi, rateLimit } from '@/server/apiResponse';
import { getOpsMetrics, getOpsMetricsSeries } from '@/server/observability';
import { z } from 'zod';

const querySchema = z.object({
  windowDays: z.coerce.number().int().min(1).max(90).default(7),
  seriesDays: z.coerce.number().int().min(1).max(90).optional(),
});

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: 'ops_metrics_get',
      limit: 240,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const url = new URL(request.url);
    const q = querySchema.parse(Object.fromEntries(url.searchParams));
    const instanceId = url.searchParams.get('instanceId')?.trim() || null;
    const cacheKey = `oracle_api:${url.pathname}${url.search}`;
    return await cachedJson(cacheKey, 5_000, async () => {
      const metrics = await getOpsMetrics({
        windowDays: q.windowDays,
        instanceId,
      });
      const series =
        q.seriesDays !== undefined
          ? await getOpsMetricsSeries({
              seriesDays: q.seriesDays,
              instanceId,
            })
          : null;
      return { metrics, series };
    });
  });
}
