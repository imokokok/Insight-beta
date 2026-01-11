import { hasDatabase, query } from "@/server/db";
import { cachedJson, handleApi, rateLimit } from "@/server/apiResponse";
import { z } from "zod";
import { getMemoryStore } from "@/server/memoryBackend";

const marketsParamsSchema = z.object({
  days: z.coerce.number().min(1).max(365).default(30),
  limit: z.coerce.number().min(1).max(50).default(10),
});

interface MarketStat {
  market: string;
  count: number;
  volume: number;
}

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: "markets_analytics",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    const { days, limit } = marketsParamsSchema.parse(rawParams);

    const compute = async () => {
      if (!hasDatabase()) {
        const mem = getMemoryStore();
        const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
        const buckets = new Map<string, MarketStat>();

        for (const a of mem.assertions.values()) {
          const assertedAtMs = new Date(a.assertedAt).getTime();
          if (!Number.isFinite(assertedAtMs) || assertedAtMs < cutoffMs)
            continue;

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

        return Array.from(buckets.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);
      }

      const res = await query(
        `
        SELECT 
          market,
          COUNT(*) as count,
          SUM(bond_usd) as volume
        FROM assertions
        WHERE asserted_at > NOW() - INTERVAL '1 day' * $1
        GROUP BY market
        ORDER BY count DESC
        LIMIT $2
        `,
        [days, limit]
      );

      return res.rows.map((row: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = row as any;
        return {
          market: r.market,
          count: Number(r.count),
          volume: Number(r.volume),
        };
      });
    };

    const cacheKey = `oracle_api:markets:${days}:${limit}`;
    return await cachedJson(cacheKey, 60_000, compute);
  });
}
