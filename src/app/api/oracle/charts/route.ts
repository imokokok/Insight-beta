import { query } from "@/server/db";
import { handleApi } from "@/server/apiResponse";
import { z } from "zod";

const chartsParamsSchema = z.object({
  days: z.coerce.number().min(1).max(365).default(30)
});

interface ChartRow {
  date: Date | string;
  count: string | number;
  volume: string | number;
}

export async function GET(request: Request) {
  return handleApi(async () => {
    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    const { days } = chartsParamsSchema.parse(rawParams);
    
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
