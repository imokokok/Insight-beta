import { isAddress } from 'viem';
import { z } from 'zod';

import { handleApi, rateLimit, cachedJson } from '@/server/apiResponse';
import { getUserStats } from '@/server/oracle';

const statsParamsSchema = z.object({
  address: z.string().refine((value) => isAddress(value), { message: 'invalid_address' }),
});

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: 'user_stats_get',
      limit: 120,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    const instanceId = url.searchParams.get('instanceId');

    const params = statsParamsSchema.parse(rawParams);

    const cacheKey = `oracle_api:${url.pathname}${url.search}`;
    return await cachedJson(cacheKey, 30_000, () =>
      instanceId ? getUserStats(params.address, instanceId) : getUserStats(params.address),
    );
  });
}
