import { hasDatabase, query } from '@/server/db';
import { cachedJson, handleApi, rateLimit } from '@/server/apiResponse';
import { z } from 'zod';
import { getMemoryStore } from '@/server/memoryBackend';
import { DEFAULT_ORACLE_INSTANCE_ID } from '@/server/oracleConfig';

const marketsParamsSchema = z.object({
  days: z.coerce.number().min(1).max(365).default(30),
  limit: z.coerce.number().min(1).max(50).default(10),
});

interface MarketStat {
  market: string;
  count: number;
  volume: number;
}

type DbMarketRow = {
  market: string;
  count: string | number;
  volume: string | number | null;
};

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: 'markets_analytics',
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    const { days, limit } = marketsParamsSchema.parse(rawParams);
    const instanceId = url.searchParams.get('instanceId')?.trim() || DEFAULT_ORACLE_INSTANCE_ID;

    const compute = async () => {
      if (!hasDatabase()) {
        const mem = getMemoryStore();
        const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
        const buckets = new Map<string, MarketStat>();

        const inst = mem.instances.get(instanceId);
        if (inst) {
          for (const a of inst.assertions.values()) {
            const assertedAtMs = new Date(a.assertedAt).getTime();
            if (!Number.isFinite(assertedAtMs) || assertedAtMs < cutoffMs) continue;

            const prev = buckets.get(a.market) ?? {
              market: a.market,
              count: 0,
              volume: 0,
            };
            buckets.set(a.market, {
              market: a.market,
              count: prev.count + 1,
              volume: prev.volume + (a.bondUsd || 0),
            });
          }
        }

        return Array.from(buckets.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);
      }

      const res = await query<DbMarketRow>(
        `
        SELECT 
          market,
          COUNT(*) as count,
          SUM(bond_usd) as volume
        FROM assertions
        WHERE instance_id = $3 AND asserted_at > NOW() - INTERVAL '1 day' * $1
        GROUP BY market
        ORDER BY count DESC
        LIMIT $2
        `,
        [days, limit, instanceId],
      );

      return res.rows.map((row) => ({
        market: row.market,
        count: Number(row.count),
        volume: Number(row.volume ?? 0),
      }));
    };

    const cacheKey = `oracle_api:${url.pathname}${url.search}`;
    return await cachedJson(cacheKey, 60_000, compute);
  });
}
