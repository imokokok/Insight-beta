import { hasDatabase, query } from "./db";
import { ensureSchema } from "./schema";
import type {
  Assertion,
  Dispute,
  OracleStats,
  LeaderboardStats,
  UserStats,
  DbAssertionRow,
  DbDisputeRow,
} from "@/lib/oracleTypes";
import { mockAssertions, mockDisputes } from "@/lib/mockData";
import { unstable_cache } from "next/cache";

export type { Assertion, Dispute } from "@/lib/oracleTypes";

let schemaEnsured = false;
async function ensureDb() {
  if (!hasDatabase()) return;
  if (!schemaEnsured) {
    await ensureSchema();
    schemaEnsured = true;
  }
}

export async function isTableEmpty(table: "assertions" | "disputes") {
  await ensureDb();
  if (!hasDatabase()) return true;
  const sql =
    table === "assertions"
      ? "SELECT EXISTS (SELECT 1 FROM assertions) as has_rows"
      : "SELECT EXISTS (SELECT 1 FROM disputes) as has_rows";
  const res = await query<{ has_rows: boolean }>(sql);
  return !res.rows[0]?.has_rows;
}

type ListParams = {
  status?: string | null;
  chain?: string | null;
  q?: string | null;
  limit?: number | null;
  cursor?: number | null;
  asserter?: string | null;
  disputer?: string | null;
  ids?: string[] | null;
};

// Helper to map DB row to Assertion
function mapAssertionRow(row: DbAssertionRow): Assertion {
  return {
    id: row.id,
    chain: row.chain,
    asserter: row.asserter,
    protocol: row.protocol,
    market: row.market,
    assertion: row.assertion_data,
    assertedAt: row.asserted_at.toISOString(),
    livenessEndsAt: row.liveness_ends_at.toISOString(),
    resolvedAt: row.resolved_at ? row.resolved_at.toISOString() : undefined,
    status: row.status,
    bondUsd: Number(row.bond_usd),
    disputer: row.disputer || undefined,
    txHash: row.tx_hash,
  };
}

// Helper to map DB row to Dispute
function mapDisputeRow(row: DbDisputeRow): Dispute {
  const now = Date.now();
  const votingEndsAt = row.voting_ends_at
    ? row.voting_ends_at.toISOString()
    : undefined;
  const statusFromDb = row.status as Dispute["status"];
  const computedStatus: Dispute["status"] =
    statusFromDb === "Executed"
      ? "Executed"
      : votingEndsAt && new Date(votingEndsAt).getTime() <= now
      ? "Pending Execution"
      : "Voting";

  return {
    id: row.id,
    chain: row.chain,
    assertionId: row.assertion_id,
    market: row.market,
    disputeReason: row.reason,
    disputer: row.disputer,
    disputedAt: row.disputed_at.toISOString(),
    votingEndsAt: votingEndsAt || "", // Fallback empty string if undefined, ensuring string type
    status: computedStatus,
    currentVotesFor: Number(row.votes_for),
    currentVotesAgainst: Number(row.votes_against),
    totalVotes: Number(row.total_votes),
  };
}

export function parseListParams(url: URL): ListParams {
  return {
    status: url.searchParams.get("status"),
    chain: url.searchParams.get("chain"),
    q: url.searchParams.get("q"),
    limit: Number(url.searchParams.get("limit")) || 30,
    cursor: Number(url.searchParams.get("cursor")) || 0,
    asserter: url.searchParams.get("asserter"),
    disputer: url.searchParams.get("disputer"),
    ids: url.searchParams.get("ids")?.split(",").filter(Boolean),
  };
}

export async function listAssertions(params: ListParams) {
  await ensureDb();
  if (!hasDatabase()) {
    let items = mockAssertions.slice();
    const limit = Math.min(100, Math.max(1, params.limit ?? 30));
    const offset = Math.max(0, params.cursor ?? 0);
    if (
      params.status &&
      ["Pending", "Disputed", "Resolved"].includes(params.status)
    ) {
      items = items.filter((a) => a.status === params.status);
    }
    if (
      params.chain &&
      ["Polygon", "Arbitrum", "Optimism", "Local"].includes(params.chain)
    ) {
      items = items.filter((a) => a.chain === params.chain);
    }
    if (params.q?.trim()) {
      const q = params.q.trim().toLowerCase();
      items = items.filter((a) => {
        return (
          a.id.toLowerCase().includes(q) ||
          a.protocol.toLowerCase().includes(q) ||
          a.market.toLowerCase().includes(q) ||
          a.txHash.toLowerCase().includes(q)
        );
      });
    }
    if (params.asserter) {
      items = items.filter(
        (a) => a.asserter.toLowerCase() === params.asserter?.toLowerCase()
      );
    }
    if (params.ids && params.ids.length > 0) {
      items = items.filter((a) => params.ids!.includes(a.id));
    }
    const start = offset;
    const end = offset + limit;
    return {
      items: items.slice(start, end),
      total: items.length,
      nextCursor: end < items.length ? end : null,
    };
  }
  const limit = Math.min(100, Math.max(1, params.limit ?? 30));
  const offset = Math.max(0, params.cursor ?? 0);

  if (await isTableEmpty("assertions")) {
    let items = mockAssertions.slice();
    if (
      params.status &&
      ["Pending", "Disputed", "Resolved"].includes(params.status)
    ) {
      items = items.filter((a) => a.status === params.status);
    }
    if (
      params.chain &&
      ["Polygon", "Arbitrum", "Optimism", "Local"].includes(params.chain)
    ) {
      items = items.filter((a) => a.chain === params.chain);
    }
    if (params.q?.trim()) {
      const q = params.q.trim().toLowerCase();
      items = items.filter((a) => {
        return (
          a.id.toLowerCase().includes(q) ||
          a.protocol.toLowerCase().includes(q) ||
          a.market.toLowerCase().includes(q) ||
          a.txHash.toLowerCase().includes(q)
        );
      });
    }
    if (params.asserter) {
      items = items.filter(
        (a) => a.asserter.toLowerCase() === params.asserter?.toLowerCase()
      );
    }
    const start = offset;
    const end = offset + limit;
    return {
      items: items.slice(start, end),
      total: items.length,
      nextCursor: end < items.length ? end : null,
    };
  }

  const conditions: string[] = [];
  const values: (string | number | string[])[] = [];
  let idx = 1;

  if (
    params.status &&
    ["Pending", "Disputed", "Resolved"].includes(params.status)
  ) {
    conditions.push(`status = $${idx++}`);
    values.push(params.status);
  }

  if (
    params.chain &&
    ["Polygon", "Arbitrum", "Optimism", "Local"].includes(params.chain)
  ) {
    conditions.push(`chain = $${idx++}`);
    values.push(params.chain);
  }

  if (params.q) {
    const q = `%${params.q.trim().toLowerCase()}%`;
    conditions.push(`(
      LOWER(id) LIKE $${idx} OR 
      LOWER(protocol) LIKE $${idx} OR 
      LOWER(market) LIKE $${idx} OR 
      LOWER(tx_hash) LIKE $${idx} OR
      LOWER(asserter) LIKE $${idx}
    )`);
    values.push(q);
    idx++;
  }

  if (params.asserter) {
    conditions.push(`LOWER(asserter) = $${idx++}`);
    values.push(params.asserter.toLowerCase());
  }

  if (params.ids && params.ids.length > 0) {
    conditions.push(`id = ANY($${idx++})`);
    values.push(params.ids);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRes = await query<{ total: string | number }>(
    `SELECT COUNT(*) as total FROM assertions ${whereClause}`,
    values
  );
  const total = Number(countRes.rows[0]?.total || 0);

  const res = await query<DbAssertionRow>(
    `SELECT * FROM assertions ${whereClause} ORDER BY asserted_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    [...values, limit, offset]
  );

  return {
    items: res.rows.map(mapAssertionRow),
    total,
    nextCursor: offset + res.rows.length < total ? offset + limit : null,
  };
}

export async function getAssertion(id: string): Promise<Assertion | null> {
  await ensureDb();
  if (!hasDatabase()) {
    const mock = mockAssertions.find((a) => a.id === id);
    return mock || null;
  }
  const res = await query<DbAssertionRow>(
    "SELECT * FROM assertions WHERE id = $1",
    [id]
  );
  if (res.rows.length === 0) {
    // Check mocks
    const mock = mockAssertions.find((a) => a.id === id);
    return mock || null;
  }
  const row = res.rows[0];
  return row ? mapAssertionRow(row) : null;
}

export async function getDispute(id: string): Promise<Dispute | null> {
  await ensureDb();
  if (!hasDatabase()) {
    const mock = mockDisputes.find((d) => d.id === id);
    return mock || null;
  }
  const res = await query<DbDisputeRow>(
    "SELECT * FROM disputes WHERE id = $1",
    [id]
  );
  if (res.rows.length === 0) {
    const mock = mockDisputes.find((d) => d.id === id);
    return mock || null;
  }
  const row = res.rows[0];
  return row ? mapDisputeRow(row) : null;
}

export async function getDisputeByAssertionId(
  assertionId: string
): Promise<Dispute | null> {
  await ensureDb();
  if (!hasDatabase()) {
    const mock = mockDisputes.find((d) => d.assertionId === assertionId);
    return mock || null;
  }
  const res = await query<DbDisputeRow>(
    "SELECT * FROM disputes WHERE assertion_id = $1",
    [assertionId]
  );
  if (res.rows.length === 0) {
    const mock = mockDisputes.find((d) => d.assertionId === assertionId);
    return mock || null;
  }
  const row = res.rows[0];
  return row ? mapDisputeRow(row) : null;
}

export async function listDisputes(params: ListParams) {
  await ensureDb();
  if (!hasDatabase()) {
    let items = mockDisputes.slice();
    const limit = Math.min(100, Math.max(1, params.limit ?? 30));
    const offset = Math.max(0, params.cursor ?? 0);
    if (
      params.status &&
      ["Voting", "Pending Execution", "Executed"].includes(params.status)
    ) {
      items = items.filter((d) => d.status === params.status);
    }
    if (
      params.chain &&
      ["Polygon", "Arbitrum", "Optimism", "Local"].includes(params.chain)
    ) {
      items = items.filter((d) => d.chain === params.chain);
    }
    if (params.q?.trim()) {
      const q = params.q.trim().toLowerCase();
      items = items.filter((d) => {
        return (
          d.id.toLowerCase().includes(q) ||
          d.assertionId.toLowerCase().includes(q) ||
          d.market.toLowerCase().includes(q) ||
          d.disputeReason.toLowerCase().includes(q)
        );
      });
    }
    if (params.disputer) {
      items = items.filter(
        (d) => d.disputer?.toLowerCase() === params.disputer?.toLowerCase()
      );
    }
    const start = offset;
    const end = offset + limit;
    return {
      items: items.slice(start, end),
      total: items.length,
      nextCursor: end < items.length ? end : null,
    };
  }
  const limit = Math.min(100, Math.max(1, params.limit ?? 30));
  const offset = Math.max(0, params.cursor ?? 0);

  if (await isTableEmpty("disputes")) {
    let items = mockDisputes.slice();
    if (
      params.status &&
      ["Voting", "Pending Execution", "Executed"].includes(params.status)
    ) {
      items = items.filter((d) => d.status === params.status);
    }
    if (
      params.chain &&
      ["Polygon", "Arbitrum", "Optimism", "Local"].includes(params.chain)
    ) {
      items = items.filter((d) => d.chain === params.chain);
    }
    if (params.q?.trim()) {
      const q = params.q.trim().toLowerCase();
      items = items.filter((d) => {
        return (
          d.id.toLowerCase().includes(q) ||
          d.assertionId.toLowerCase().includes(q) ||
          d.market.toLowerCase().includes(q) ||
          d.disputeReason.toLowerCase().includes(q)
        );
      });
    }
    if (params.disputer) {
      items = items.filter(
        (d) => d.disputer?.toLowerCase() === params.disputer?.toLowerCase()
      );
    }
    const start = offset;
    const end = offset + limit;
    return {
      items: items.slice(start, end),
      total: items.length,
      nextCursor: end < items.length ? end : null,
    };
  }

  const conditions: string[] = [];
  const values: (string | number)[] = [];
  let idx = 1;

  if (
    params.status &&
    ["Voting", "Pending Execution", "Executed"].includes(params.status)
  ) {
    if (params.status === "Executed") {
      conditions.push(`status = $${idx++}`);
      values.push("Executed");
    } else if (params.status === "Pending Execution") {
      conditions.push(
        `status <> 'Executed' AND voting_ends_at IS NOT NULL AND voting_ends_at <= NOW()`
      );
    } else {
      conditions.push(
        `status <> 'Executed' AND (voting_ends_at IS NULL OR voting_ends_at > NOW())`
      );
    }
  }

  if (
    params.chain &&
    ["Polygon", "Arbitrum", "Optimism", "Local"].includes(params.chain)
  ) {
    conditions.push(`chain = $${idx++}`);
    values.push(params.chain);
  }

  if (params.q) {
    const q = `%${params.q.trim().toLowerCase()}%`;
    conditions.push(`(
      LOWER(id) LIKE $${idx} OR 
      LOWER(assertion_id) LIKE $${idx} OR 
      LOWER(market) LIKE $${idx} OR
      LOWER(reason) LIKE $${idx}
    )`);
    values.push(q);
    idx++;
  }

  if (params.disputer) {
    conditions.push(`LOWER(disputer) = $${idx++}`);
    values.push(params.disputer.toLowerCase());
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRes = await query<{ total: string | number }>(
    `SELECT COUNT(*) as total FROM disputes ${whereClause}`,
    values
  );
  const total = Number(countRes.rows[0]?.total || 0);

  const res = await query<DbDisputeRow>(
    `SELECT * FROM disputes ${whereClause} ORDER BY disputed_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    [...values, limit, offset]
  );

  return {
    items: res.rows.map(mapDisputeRow),
    total,
    nextCursor: offset + res.rows.length < total ? offset + limit : null,
  };
}

export const getOracleStats = unstable_cache(
  async (): Promise<OracleStats> => {
    await ensureDb();
    if (!hasDatabase()) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const resolved24hMock = mockAssertions.filter((a) => {
        if (a.status !== "Resolved") return false;
        const resolvedAt = a.resolvedAt ?? a.livenessEndsAt;
        return new Date(resolvedAt).getTime() > oneDayAgo.getTime();
      }).length;
      const avgResolutionMinutesMock = (() => {
        const resolved = mockAssertions.filter((a) => a.status === "Resolved");
        if (resolved.length === 0) return 0;
        const sum = resolved.reduce((acc, a) => {
          const resolvedAt = a.resolvedAt ?? a.livenessEndsAt;
          return (
            acc +
            (new Date(resolvedAt).getTime() -
              new Date(a.assertedAt).getTime()) /
              60_000
          );
        }, 0);
        return sum / resolved.length;
      })();
      return {
        tvsUsd: mockAssertions.reduce((acc, a) => acc + a.bondUsd, 0),
        activeDisputes: mockDisputes.filter((d) => d.status !== "Executed")
          .length,
        resolved24h: resolved24hMock,
        avgResolutionMinutes: avgResolutionMinutesMock,
      };
    }
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    if (await isTableEmpty("assertions")) {
      const resolved24hMock = mockAssertions.filter((a) => {
        if (a.status !== "Resolved") return false;
        const resolvedAt = a.resolvedAt ?? a.livenessEndsAt;
        return new Date(resolvedAt).getTime() > oneDayAgo.getTime();
      }).length;
      const avgResolutionMinutesMock = (() => {
        const resolved = mockAssertions.filter((a) => a.status === "Resolved");
        if (resolved.length === 0) return 0;
        const sum = resolved.reduce((acc, a) => {
          const resolvedAt = a.resolvedAt ?? a.livenessEndsAt;
          return (
            acc +
            (new Date(resolvedAt).getTime() -
              new Date(a.assertedAt).getTime()) /
              60_000
          );
        }, 0);
        return sum / resolved.length;
      })();
      return {
        tvsUsd: mockAssertions.reduce((acc, a) => acc + a.bondUsd, 0),
        activeDisputes: mockDisputes.filter((d) => d.status !== "Executed")
          .length,
        resolved24h: resolved24hMock,
        avgResolutionMinutes: avgResolutionMinutesMock,
      };
    }

    // 1. TVS: Sum of bond_usd for all assertions (or just active ones? Let's do all for "Total Value Secured")
    // Usually TVS implies current active value. Let's do active (Pending/Disputed).
    const tvsRes = await query(`
      SELECT SUM(bond_usd) AS tvs
      FROM assertions
      WHERE status IN ('Pending', 'Disputed')
    `);
    const tvsRow = tvsRes.rows[0];
    const tvsUsd = Number(tvsRow?.tvs || 0);

    // 2. Active Disputes
    const activeDisputesRes = await query(`
      SELECT COUNT(*) as count 
      FROM disputes
      WHERE status <> 'Executed'
    `);
    const activeDisputesRow = activeDisputesRes.rows[0];
    const activeDisputes = Number(activeDisputesRow?.count || 0);

    // 3. Resolved in last 24h
    const resolvedRes = await query(
      `
      SELECT COUNT(*) as count 
      FROM assertions 
      WHERE status = 'Resolved' AND COALESCE(resolved_at, liveness_ends_at) > $1
    `,
      [oneDayAgo]
    );
    const resolvedRow = resolvedRes.rows[0];
    const resolved24h = Number(resolvedRow?.count || 0);

    // 4. Avg Resolution Time (minutes)
    // For assertions that are Resolved, avg difference between liveness_ends_at and asserted_at
    const avgRes = await query(`
      SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, liveness_ends_at) - asserted_at))/60) as avg_min
      FROM assertions 
      WHERE status = 'Resolved'
    `);
    const avgRow = avgRes.rows[0];
    const avgResolutionMinutes = Number(avgRow?.avg_min || 0);

    return {
      tvsUsd,
      activeDisputes,
      resolved24h,
      avgResolutionMinutes,
    };
  },
  ["oracle-stats"],
  { revalidate: 60, tags: ["oracle-stats"] }
);

export const getLeaderboardStats = unstable_cache(
  async (): Promise<LeaderboardStats> => {
    await ensureDb();
    if (!hasDatabase()) {
      const asserterMap = new Map<string, { count: number; value: number }>();
      mockAssertions.forEach((a) => {
        const curr = asserterMap.get(a.asserter) || { count: 0, value: 0 };
        asserterMap.set(a.asserter, {
          count: curr.count + 1,
          value: curr.value + a.bondUsd,
        });
      });
      const topAsserters = Array.from(asserterMap.entries())
        .map(([address, { count, value }]) => ({
          address,
          count,
          value,
          rank: 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((item, i) => ({ ...item, rank: i + 1 }));

      const disputerMap = new Map<string, number>();
      mockDisputes.forEach((d) => {
        const curr = disputerMap.get(d.disputer) || 0;
        disputerMap.set(d.disputer, curr + 1);
      });
      const topDisputers = Array.from(disputerMap.entries())
        .map(([address, count]) => ({ address, count, rank: 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((item, i) => ({ ...item, rank: i + 1 }));

      return { topAsserters, topDisputers };
    }

    if (await isTableEmpty("assertions")) {
      // Mock data logic
      const asserterMap = new Map<string, { count: number; value: number }>();
      mockAssertions.forEach((a) => {
        const curr = asserterMap.get(a.asserter) || { count: 0, value: 0 };
        asserterMap.set(a.asserter, {
          count: curr.count + 1,
          value: curr.value + a.bondUsd,
        });
      });

      const topAsserters = Array.from(asserterMap.entries())
        .map(([address, { count, value }]) => ({
          address,
          count,
          value,
          rank: 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((item, i) => ({ ...item, rank: i + 1 }));

      const disputerMap = new Map<string, number>();
      mockDisputes.forEach((d) => {
        const curr = disputerMap.get(d.disputer) || 0;
        disputerMap.set(d.disputer, curr + 1);
      });

      const topDisputers = Array.from(disputerMap.entries())
        .map(([address, count]) => ({ address, count, rank: 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((item, i) => ({ ...item, rank: i + 1 }));

      return { topAsserters, topDisputers };
    }

    const assertersRes = await query(`
      SELECT asserter as address, COUNT(*) as count, SUM(bond_usd) as value
      FROM assertions
      GROUP BY asserter
      ORDER BY count DESC
      LIMIT 10
    `);

    const disputersRes = await query(`
      SELECT disputer as address, COUNT(*) as count
      FROM disputes
      GROUP BY disputer
      ORDER BY count DESC
      LIMIT 10
    `);

    return {
      topAsserters: assertersRes.rows.map((r, i) => ({
        address: r.address,
        count: Number(r.count),
        value: Number(r.value),
        rank: i + 1,
      })),
      topDisputers: disputersRes.rows.map((r, i) => ({
        address: r.address,
        count: Number(r.count),
        rank: i + 1,
      })),
    };
  },
  ["oracle-leaderboard"],
  { revalidate: 300, tags: ["oracle-leaderboard"] }
);

export function getUserStats(address: string): Promise<UserStats> {
  const addressLower = address.toLowerCase();

  return unstable_cache(
    async (): Promise<UserStats> => {
      await ensureDb();
      if (!hasDatabase()) {
        const assertions = mockAssertions.filter(
          (a) => a.asserter.toLowerCase() === addressLower
        );
        const disputes = mockDisputes.filter(
          (d) => d.disputer.toLowerCase() === addressLower
        );
        const totalBondedUsd = assertions.reduce(
          (acc, a) => acc + a.bondUsd,
          0
        );
        const resolvedAssertions = assertions.filter(
          (a) => a.status === "Resolved"
        );
        const wonAssertions = resolvedAssertions.filter(() => true);
        const winRate =
          resolvedAssertions.length > 0
            ? Math.round(
                (wonAssertions.length / resolvedAssertions.length) * 100
              )
            : 0;
        return {
          totalAssertions: assertions.length,
          totalDisputes: disputes.length,
          totalBondedUsd,
          winRate,
        };
      }

      // Check if DB is empty to use mocks
      if (await isTableEmpty("assertions")) {
        // Mock stats
        const assertions = mockAssertions.filter(
          (a) => a.asserter.toLowerCase() === addressLower
        );
        const disputes = mockDisputes.filter(
          (d) => d.disputer.toLowerCase() === addressLower
        );

        const totalBondedUsd = assertions.reduce(
          (acc, a) => acc + a.bondUsd,
          0
        );

        const resolvedAssertions = assertions.filter(
          (a) => a.status === "Resolved"
        );
        const wonAssertions = resolvedAssertions.filter(() => true);

        const winRate =
          resolvedAssertions.length > 0
            ? Math.round(
                (wonAssertions.length / resolvedAssertions.length) * 100
              )
            : 0;

        return {
          totalAssertions: assertions.length,
          totalDisputes: disputes.length,
          totalBondedUsd,
          winRate,
        };
      }

      // Real DB stats
      const assertionsRes = await query(
        `
        SELECT COUNT(*) as count, COALESCE(SUM(bond_usd), 0) as bonded
        FROM assertions
        WHERE LOWER(asserter) = $1
      `,
        [addressLower]
      );

      const disputesRes = await query(
        `
        SELECT COUNT(*) as count
        FROM disputes
        WHERE LOWER(disputer) = $1
      `,
        [addressLower]
      );

      const resolvedRes = await query(
        `
        SELECT COUNT(*) as count
        FROM assertions
        WHERE LOWER(asserter) = $1 AND status = 'Resolved'
      `,
        [addressLower]
      );

      const wonRes = await query(
        `
        SELECT COUNT(*) as count
        FROM assertions
        WHERE LOWER(asserter) = $1 AND status = 'Resolved' AND (settlement_resolution IS TRUE OR settlement_resolution IS NULL)
      `,
        [addressLower]
      );

      const assertionsRow = assertionsRes.rows[0];
      const disputesRow = disputesRes.rows[0];
      const resolvedRow = resolvedRes.rows[0];
      const wonRow = wonRes.rows[0];

      const totalAssertions = Number(assertionsRow?.count || 0);
      const totalBondedUsd = Number(assertionsRow?.bonded || 0);
      const totalDisputes = Number(disputesRow?.count || 0);
      const resolvedCount = Number(resolvedRow?.count || 0);
      const wonCount = Number(wonRow?.count || 0);

      const winRate =
        resolvedCount > 0 ? Math.round((wonCount / resolvedCount) * 100) : 0;

      return {
        totalAssertions,
        totalDisputes,
        totalBondedUsd,
        winRate,
      };
    },
    ["user-stats", addressLower],
    { revalidate: 60, tags: ["user-stats", `user-stats:${addressLower}`] }
  )();
}
