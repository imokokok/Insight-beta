import { query } from "./db";
import type { LeaderboardStats, LeaderboardEntry } from "@/lib/oracleTypes";

export async function getLeaderboardStats(): Promise<LeaderboardStats> {
  const [assertersRes, disputersRes] = await Promise.all([
    query(`
      SELECT asserter as address, COUNT(*) as count, SUM(bond_usd) as value
      FROM assertions
      GROUP BY asserter
      ORDER BY value DESC
      LIMIT 10
    `),
    query(`
      SELECT disputer as address, COUNT(*) as count
      FROM disputes
      GROUP BY disputer
      ORDER BY count DESC
      LIMIT 10
    `)
  ]);

  const topAsserters: LeaderboardEntry[] = assertersRes.rows.map((row, i) => ({
    address: row.address,
    count: Number(row.count),
    value: Number(row.value),
    rank: i + 1
  }));

  const topDisputers: LeaderboardEntry[] = disputersRes.rows.map((row, i) => ({
    address: row.address,
    count: Number(row.count),
    rank: i + 1
  }));

  return { topAsserters, topDisputers };
}
