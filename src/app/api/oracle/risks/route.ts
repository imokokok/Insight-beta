import { z } from 'zod';

import { cachedJson, handleApi, rateLimit } from '@/server/apiResponse';
import { getRiskItems } from '@/server/oracle';

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(200).optional(),
});

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: 'risks_get',
      limit: 240,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const url = new URL(request.url);
    const q = querySchema.parse(Object.fromEntries(url.searchParams));
    const instanceId = url.searchParams.get('instanceId');
    const cacheKey = `oracle_api:${url.pathname}${url.search}`;
    return await cachedJson(cacheKey, 10_000, async () => {
      const items = await getRiskItems({ limit: q.limit ?? 50, instanceId });
      return { items };
    });
  });
}
