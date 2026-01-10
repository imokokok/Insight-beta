import { hasDatabase, query } from "@/server/db";
import { handleApi, rateLimit } from "@/server/apiResponse";
import { z } from "zod";
import { getMemoryStore } from "@/server/memoryBackend";

const chartsParamsSchema = z.object({
  days: z.coerce.number().min(1).max(365).default(30)
});

interface ChartRow {
  date: Date | string;
  count: string | number;
  volume: string | number;
}

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = rateLimit(request, { key: "charts_get", limit: 60, windowMs: 60_000 });
    if (limited) return limited;

    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    const { days } = chartsParamsSchema.parse(rawParams);
    
    if (!hasDatabase()) {
      const mem = getMemoryStore();
      const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
      const buckets = new Map<string, { date: string; count: number; volume: number }>();

      for (const a of mem.assertions.values()) {
        const assertedAtMs = new Date(a.assertedAt).getTime();
        if (!Number.isFinite(assertedAtMs) || assertedAtMs < cutoffMs) continue;
        const date = new Date(assertedAtMs).toISOString().slice(0, 10);
        const prev = buckets.get(date) ?? { date, count: 0, volume: 0 };
        buckets.set(date, { date, count: prev.count + 1, volume: prev.volume + (a.bondUsd || 0) });
      }

      return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
    }

    // Group by date
    const res = await query(`
      SELECT 
        DATE(asserted_at) as date,
        COUNT(*) as count,
        SUM(bond_usd) as volume
      FROM assertions
      WHERE asserted_at > NOW() - INTERVAL '1 day' * $1
      GROUP BY DATE(asserted_at)
      ORDER BY DATE(asserted_at) ASC
    `, [days]);

    return res.rows.map((row: unknown) => {
      const r = row as ChartRow;
      return {
        date: r.date, 
        count: Number(r.count),
        volume: Number(r.volume)
      };
    });
  });
}
