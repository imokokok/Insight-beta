import { z } from 'zod';

import { cachedJson, handleApi, rateLimit } from '@/server/apiResponse';
import { getOracleEnv, readOracleConfig } from '@/server/oracle';
import { fetchReferencePriceHistory } from '@/server/oracle/priceFetcher';

const paramsSchema = z.object({
  symbol: z.string().default('ETH'),
  days: z.coerce.number().min(1).max(90).default(30),
});

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: 'accuracy_get',
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    const { symbol, days } = paramsSchema.parse(rawParams);
    const instanceId = url.searchParams.get('instanceId');

    const compute = async () => {
      if (instanceId) {
        const [cfg, envCfg] = await Promise.all([
          readOracleConfig(instanceId),
          getOracleEnv(instanceId),
        ]);
        const rpcUrl = (envCfg.rpcUrl || cfg.rpcUrl || '').trim() || null;
        return await fetchReferencePriceHistory(symbol, days, { rpcUrl });
      }
      return await fetchReferencePriceHistory(symbol, days);
    };

    // Cache for 5 minutes as accuracy data doesn't change every second
    const cacheKey = `oracle_api:${url.pathname}${url.search}`;
    return await cachedJson(cacheKey, 300_000, compute);
  });
}
