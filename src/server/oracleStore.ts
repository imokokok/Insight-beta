import { hasDatabase, query } from './db';
import { ensureSchema } from './schema';
import type {
  Assertion,
  Dispute,
  OracleStats,
  LeaderboardStats,
  UserStats,
  RiskItem,
  DbAssertionRow,
  DbDisputeRow,
} from '@/lib/types/oracleTypes';
import { mockAssertions, mockDisputes } from '@/lib/mockData';
import { unstable_cache } from 'next/cache';
import { readOracleState } from '@/server/oracleState';
import { DEFAULT_ORACLE_INSTANCE_ID } from '@/server/oracleConfig';
import { env } from '@/lib/config/env';

export type { Assertion, Dispute } from '@/lib/types/oracleTypes';

let schemaEnsured = false;
async function ensureDb() {
  if (!hasDatabase()) return;
  if (!schemaEnsured) {
    await ensureSchema();
    schemaEnsured = true;
  }
}

function normalizeInstanceId(instanceId?: string | null) {
  const trimmed = (instanceId ?? DEFAULT_ORACLE_INSTANCE_ID).trim();
  return trimmed || DEFAULT_ORACLE_INSTANCE_ID;
}

function isDemoModeEnabled() {
  return ['1', 'true'].includes(env.INSIGHT_DEMO_MODE.toLowerCase());
}

export function isDemoMode() {
  return !hasDatabase() || isDemoModeEnabled();
}

export async function isTableEmpty(
  table: 'assertions' | 'disputes',
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
) {
  await ensureDb();
  if (isDemoModeEnabled()) return true;
  if (!hasDatabase()) return true;
  const normalizedInstanceId = normalizeInstanceId(instanceId);
  const sql =
    table === 'assertions'
      ? 'SELECT EXISTS (SELECT 1 FROM assertions WHERE instance_id = $1) as has_rows'
      : 'SELECT EXISTS (SELECT 1 FROM disputes WHERE instance_id = $1) as has_rows';
  const res = await query<{ has_rows: boolean }>(sql, [normalizedInstanceId]);
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
  const blockNumber =
    row.block_number === null || row.block_number === undefined
      ? undefined
      : typeof row.block_number === 'number'
        ? String(Math.trunc(row.block_number))
        : String(row.block_number);
  return {
    id: row.id,
    chain: row.chain,
    asserter: row.asserter,
    protocol: row.protocol,
    market: row.market,
    assertion: row.assertion_data,
    assertedAt: row.asserted_at.toISOString(),
    livenessEndsAt: row.liveness_ends_at.toISOString(),
    blockNumber,
    logIndex: typeof row.log_index === 'number' ? row.log_index : (row.log_index ?? undefined),
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
  const votingEndsAt = row.voting_ends_at ? row.voting_ends_at.toISOString() : undefined;
  const statusFromDb = row.status as Dispute['status'];
  const computedStatus: Dispute['status'] =
    statusFromDb === 'Executed'
      ? 'Executed'
      : votingEndsAt && new Date(votingEndsAt).getTime() <= now
        ? 'Pending Execution'
        : 'Voting';

  return {
    id: row.id,
    chain: row.chain,
    assertionId: row.assertion_id,
    market: row.market,
    disputeReason: row.reason,
    disputer: row.disputer,
    disputedAt: row.disputed_at.toISOString(),
    votingEndsAt: votingEndsAt || '', // Fallback empty string if undefined, ensuring string type
    txHash: row.tx_hash ?? undefined,
    blockNumber:
      row.block_number === null || row.block_number === undefined
        ? undefined
        : typeof row.block_number === 'number'
          ? String(Math.trunc(row.block_number))
          : String(row.block_number),
    logIndex: typeof row.log_index === 'number' ? row.log_index : (row.log_index ?? undefined),
    status: computedStatus,
    currentVotesFor: Number(row.votes_for),
    currentVotesAgainst: Number(row.votes_against),
    totalVotes: Number(row.total_votes),
  };
}

export function parseListParams(url: URL): ListParams {
  return {
    status: url.searchParams.get('status'),
    chain: url.searchParams.get('chain'),
    q: url.searchParams.get('q'),
    limit: Number(url.searchParams.get('limit')) || 30,
    cursor: Number(url.searchParams.get('cursor')) || 0,
    asserter: url.searchParams.get('asserter'),
    disputer: url.searchParams.get('disputer'),
    ids: url.searchParams.get('ids')?.split(',').filter(Boolean),
  };
}

export async function listAssertions(
  params: ListParams,
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
) {
  await ensureDb();
  if (!hasDatabase()) {
    let items = mockAssertions.slice();
    const limit = Math.min(100, Math.max(1, params.limit ?? 30));
    const offset = Math.max(0, params.cursor ?? 0);
    if (params.status && ['Pending', 'Disputed', 'Resolved'].includes(params.status)) {
      items = items.filter((a) => a.status === params.status);
    }
    if (
      params.chain &&
      ['Polygon', 'PolygonAmoy', 'Arbitrum', 'Optimism', 'Local'].includes(params.chain)
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
      items = items.filter((a) => a.asserter.toLowerCase() === params.asserter?.toLowerCase());
    }
    if (params.ids && params.ids.length > 0) {
      const ids = params.ids;
      items = items.filter((a) => ids.includes(a.id));
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
  const normalizedInstanceId = normalizeInstanceId(instanceId);

  if (isDemoModeEnabled() && (await isTableEmpty('assertions', normalizedInstanceId))) {
    let items = mockAssertions.slice();
    if (params.status && ['Pending', 'Disputed', 'Resolved'].includes(params.status)) {
      items = items.filter((a) => a.status === params.status);
    }
    if (
      params.chain &&
      ['Polygon', 'PolygonAmoy', 'Arbitrum', 'Optimism', 'Local'].includes(params.chain)
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
      items = items.filter((a) => a.asserter.toLowerCase() === params.asserter?.toLowerCase());
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

  conditions.push(`instance_id = $${idx++}`);
  values.push(normalizedInstanceId);

  if (params.status && ['Pending', 'Disputed', 'Resolved'].includes(params.status)) {
    conditions.push(`status = $${idx++}`);
    values.push(params.status);
  }

  if (
    params.chain &&
    ['Polygon', 'PolygonAmoy', 'Arbitrum', 'Optimism', 'Local'].includes(params.chain)
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

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const res = await query<DbAssertionRow>(
    `SELECT * FROM assertions ${whereClause} ORDER BY asserted_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    [...values, limit, offset],
  );

  const { rows: countRows } = await query<{ count: string }>(
    `SELECT COUNT(*)::bigint as count FROM assertions ${whereClause}`,
    values,
  );
  const total = Number(countRows[0]?.count || 0);

  return {
    items: res.rows.map(mapAssertionRow),
    total,
    nextCursor: offset + res.rows.length < total ? offset + limit : null,
  };
}

export async function getAssertion(
  id: string,
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<Assertion | null> {
  await ensureDb();
  if (!hasDatabase()) {
    const mock = mockAssertions.find((a) => a.id === id);
    return mock || null;
  }
  const normalizedInstanceId = normalizeInstanceId(instanceId);
  const res = await query<DbAssertionRow>(
    'SELECT * FROM assertions WHERE id = $1 AND instance_id = $2',
    [id, normalizedInstanceId],
  );
  if (res.rows.length === 0) {
    if (isDemoModeEnabled()) {
      const mock = mockAssertions.find((a) => a.id === id);
      return mock || null;
    }
    return null;
  }
  const row = res.rows[0];
  return row ? mapAssertionRow(row) : null;
}

export async function getDispute(
  id: string,
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<Dispute | null> {
  await ensureDb();
  if (!hasDatabase()) {
    const mock = mockDisputes.find((d) => d.id === id);
    return mock || null;
  }
  const normalizedInstanceId = normalizeInstanceId(instanceId);
  const res = await query<DbDisputeRow>(
    'SELECT * FROM disputes WHERE id = $1 AND instance_id = $2',
    [id, normalizedInstanceId],
  );
  if (res.rows.length === 0) {
    if (isDemoModeEnabled()) {
      const mock = mockDisputes.find((d) => d.id === id);
      return mock || null;
    }
    return null;
  }
  const row = res.rows[0];
  return row ? mapDisputeRow(row) : null;
}

export async function getDisputeByAssertionId(
  assertionId: string,
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<Dispute | null> {
  await ensureDb();
  if (!hasDatabase()) {
    const mock = mockDisputes.find((d) => d.assertionId === assertionId);
    return mock || null;
  }
  const normalizedInstanceId = normalizeInstanceId(instanceId);
  const res = await query<DbDisputeRow>(
    'SELECT * FROM disputes WHERE assertion_id = $1 AND instance_id = $2',
    [assertionId, normalizedInstanceId],
  );
  if (res.rows.length === 0) {
    if (isDemoModeEnabled()) {
      const mock = mockDisputes.find((d) => d.assertionId === assertionId);
      return mock || null;
    }
    return null;
  }
  const row = res.rows[0];
  return row ? mapDisputeRow(row) : null;
}

export async function listDisputes(
  params: ListParams,
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
) {
  await ensureDb();
  if (!hasDatabase()) {
    let items = mockDisputes.slice();
    const limit = Math.min(100, Math.max(1, params.limit ?? 30));
    const offset = Math.max(0, params.cursor ?? 0);
    if (params.status && ['Voting', 'Pending Execution', 'Executed'].includes(params.status)) {
      items = items.filter((d) => d.status === params.status);
    }
    if (
      params.chain &&
      ['Polygon', 'PolygonAmoy', 'Arbitrum', 'Optimism', 'Local'].includes(params.chain)
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
      items = items.filter((d) => d.disputer?.toLowerCase() === params.disputer?.toLowerCase());
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
  const normalizedInstanceId = normalizeInstanceId(instanceId);

  if (isDemoModeEnabled() && (await isTableEmpty('disputes', normalizedInstanceId))) {
    let items = mockDisputes.slice();
    if (params.status && ['Voting', 'Pending Execution', 'Executed'].includes(params.status)) {
      items = items.filter((d) => d.status === params.status);
    }
    if (
      params.chain &&
      ['Polygon', 'PolygonAmoy', 'Arbitrum', 'Optimism', 'Local'].includes(params.chain)
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
      items = items.filter((d) => d.disputer?.toLowerCase() === params.disputer?.toLowerCase());
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

  conditions.push(`instance_id = $${idx++}`);
  values.push(normalizedInstanceId);

  if (params.status && ['Voting', 'Pending Execution', 'Executed'].includes(params.status)) {
    if (params.status === 'Executed') {
      conditions.push(`status = $${idx++}`);
      values.push('Executed');
    } else if (params.status === 'Pending Execution') {
      conditions.push(
        `status <> 'Executed' AND voting_ends_at IS NOT NULL AND voting_ends_at <= NOW()`,
      );
    } else {
      conditions.push(
        `status <> 'Executed' AND (voting_ends_at IS NULL OR voting_ends_at > NOW())`,
      );
    }
  }

  if (
    params.chain &&
    ['Polygon', 'PolygonAmoy', 'Arbitrum', 'Optimism', 'Local'].includes(params.chain)
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

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const res = await query<DbDisputeRow>(
    `SELECT * FROM disputes ${whereClause} ORDER BY disputed_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    [...values, limit, offset],
  );

  const { rows: countRows } = await query<{ count: string }>(
    `SELECT COUNT(*)::bigint as count FROM disputes ${whereClause}`,
    values,
  );
  const total = Number(countRows[0]?.count || 0);

  return {
    items: res.rows.map(mapDisputeRow),
    total,
    nextCursor: offset + res.rows.length < total ? offset + limit : null,
  };
}

export function getOracleStats(
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<OracleStats> {
  const normalizedInstanceId = normalizeInstanceId(instanceId);
  return unstable_cache(
    async (): Promise<OracleStats> => {
      await ensureDb();
      if (!hasDatabase()) {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const resolved24hMock = mockAssertions.filter((a) => {
          if (a.status !== 'Resolved') return false;
          const resolvedAt = a.resolvedAt ?? a.livenessEndsAt;
          return new Date(resolvedAt).getTime() > oneDayAgo.getTime();
        }).length;
        const avgResolutionMinutesMock = (() => {
          const resolved = mockAssertions.filter((a) => a.status === 'Resolved');
          if (resolved.length === 0) return 0;
          const sum = resolved.reduce((acc, a) => {
            const resolvedAt = a.resolvedAt ?? a.livenessEndsAt;
            return (
              acc + (new Date(resolvedAt).getTime() - new Date(a.assertedAt).getTime()) / 60_000
            );
          }, 0);
          return sum / resolved.length;
        })();
        return {
          tvsUsd: mockAssertions.reduce((acc, a) => acc + a.bondUsd, 0),
          activeDisputes: mockDisputes.filter((d) => d.status !== 'Executed').length,
          resolved24h: resolved24hMock,
          avgResolutionMinutes: avgResolutionMinutesMock,
        };
      }
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      if (isDemoModeEnabled() && (await isTableEmpty('assertions', normalizedInstanceId))) {
        const resolved24hMock = mockAssertions.filter((a) => {
          if (a.status !== 'Resolved') return false;
          const resolvedAt = a.resolvedAt ?? a.livenessEndsAt;
          return new Date(resolvedAt).getTime() > oneDayAgo.getTime();
        }).length;
        const avgResolutionMinutesMock = (() => {
          const resolved = mockAssertions.filter((a) => a.status === 'Resolved');
          if (resolved.length === 0) return 0;
          const sum = resolved.reduce((acc, a) => {
            const resolvedAt = a.resolvedAt ?? a.livenessEndsAt;
            return (
              acc + (new Date(resolvedAt).getTime() - new Date(a.assertedAt).getTime()) / 60_000
            );
          }, 0);
          return sum / resolved.length;
        })();
        return {
          tvsUsd: mockAssertions.reduce((acc, a) => acc + a.bondUsd, 0),
          activeDisputes: mockDisputes.filter((d) => d.status !== 'Executed').length,
          resolved24h: resolved24hMock,
          avgResolutionMinutes: avgResolutionMinutesMock,
        };
      }

      const statsRes = await query(
        `
        WITH tvs AS (
          SELECT COALESCE(SUM(bond_usd), 0) as tvs
          FROM assertions
          WHERE instance_id = $1 AND status IN ('Pending', 'Disputed')
        ),
        active_disputes AS (
          SELECT COUNT(*)::int as count
          FROM disputes
          WHERE instance_id = $1 AND status <> 'Executed'
        ),
        resolved_24h AS (
          SELECT COUNT(*)::int as count
          FROM assertions
          WHERE instance_id = $2 AND status = 'Resolved' AND COALESCE(resolved_at, liveness_ends_at) > $3
        ),
        avg_res AS (
          SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, liveness_ends_at) - asserted_at))/60), 0)::numeric as avg_min
          FROM assertions
          WHERE instance_id = $1 AND status = 'Resolved'
        )
        SELECT
          (SELECT tvs FROM tvs) as tvs,
          (SELECT count FROM active_disputes) as active_disputes,
          (SELECT count FROM resolved_24h) as resolved_24h,
          (SELECT avg_min FROM avg_res) as avg_resolution_minutes
      `,
        [normalizedInstanceId, normalizedInstanceId, oneDayAgo],
      );
      const row = statsRes.rows[0];
      return {
        tvsUsd: Number(row?.tvs || 0),
        activeDisputes: Number(row?.active_disputes || 0),
        resolved24h: Number(row?.resolved_24h || 0),
        avgResolutionMinutes: Number(row?.avg_resolution_minutes || 0),
      };
    },
    ['oracle-stats', normalizedInstanceId],
    {
      revalidate: 60,
      tags: ['oracle-stats', `oracle-stats:${normalizedInstanceId}`],
    },
  )();
}

export function getLeaderboardStats(
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<LeaderboardStats> {
  const normalizedInstanceId = normalizeInstanceId(instanceId);
  return unstable_cache(
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

      if (isDemoModeEnabled() && (await isTableEmpty('assertions', normalizedInstanceId))) {
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

      const assertersRes = await query(
        `
      SELECT asserter as address, COUNT(*) as count, SUM(bond_usd) as value
      FROM assertions
      WHERE instance_id = $1
      GROUP BY asserter
      ORDER BY count DESC
      LIMIT 10
    `,
        [normalizedInstanceId],
      );

      const disputersRes = await query(
        `
      SELECT disputer as address, COUNT(*) as count
      FROM disputes
      WHERE instance_id = $1
      GROUP BY disputer
      ORDER BY count DESC
      LIMIT 10
    `,
        [normalizedInstanceId],
      );

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
    ['oracle-leaderboard', normalizedInstanceId],
    {
      revalidate: 300,
      tags: ['oracle-leaderboard', `oracle-leaderboard:${normalizedInstanceId}`],
    },
  )();
}

export function getUserStats(
  address: string,
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<UserStats> {
  const addressLower = address.toLowerCase();
  const normalizedInstanceId = normalizeInstanceId(instanceId);

  return unstable_cache(
    async (): Promise<UserStats> => {
      await ensureDb();
      if (!hasDatabase()) {
        const assertions = mockAssertions.filter((a) => a.asserter.toLowerCase() === addressLower);
        const disputes = mockDisputes.filter((d) => d.disputer.toLowerCase() === addressLower);
        const totalBondedUsd = assertions.reduce((acc, a) => acc + a.bondUsd, 0);
        const resolvedAssertions = assertions.filter((a) => a.status === 'Resolved');
        const wonAssertions = resolvedAssertions.filter(() => true);
        const winRate =
          resolvedAssertions.length > 0
            ? Math.round((wonAssertions.length / resolvedAssertions.length) * 100)
            : 0;
        return {
          totalAssertions: assertions.length,
          totalDisputes: disputes.length,
          totalBondedUsd,
          winRate,
        };
      }

      if (isDemoModeEnabled() && (await isTableEmpty('assertions', normalizedInstanceId))) {
        const assertions = mockAssertions.filter((a) => a.asserter.toLowerCase() === addressLower);
        const disputes = mockDisputes.filter((d) => d.disputer.toLowerCase() === addressLower);

        const totalBondedUsd = assertions.reduce((acc, a) => acc + a.bondUsd, 0);

        const resolvedAssertions = assertions.filter((a) => a.status === 'Resolved');
        const wonAssertions = resolvedAssertions.filter(() => true);

        const winRate =
          resolvedAssertions.length > 0
            ? Math.round((wonAssertions.length / resolvedAssertions.length) * 100)
            : 0;

        return {
          totalAssertions: assertions.length,
          totalDisputes: disputes.length,
          totalBondedUsd,
          winRate,
        };
      }

      const statsRes = await query(
        `
        WITH assertions_stats AS (
          SELECT
            COUNT(*)::int as total_assertions,
            COALESCE(SUM(bond_usd), 0)::numeric as bonded
          FROM assertions
          WHERE instance_id = $2 AND LOWER(asserter) = $1
        ),
        disputes_count AS (
          SELECT COUNT(*)::int as total_disputes
          FROM disputes
          WHERE instance_id = $3 AND LOWER(disputer) = $1
        ),
        resolved_count AS (
          SELECT COUNT(*)::int as count
          FROM assertions
          WHERE instance_id = $4 AND LOWER(asserter) = $1 AND status = 'Resolved'
        ),
        won_count AS (
          SELECT COUNT(*)::int as count
          FROM assertions
          WHERE instance_id = $5 AND LOWER(asserter) = $1 AND status = 'Resolved' AND (settlement_resolution IS TRUE OR settlement_resolution IS NULL)
        )
        SELECT
          (SELECT total_assertions FROM assertions_stats) as total_assertions,
          (SELECT bonded FROM assertions_stats) as total_bonded_usd,
          (SELECT total_disputes FROM disputes_count) as total_disputes,
          (SELECT count FROM resolved_count) as resolved_count,
          (SELECT count FROM won_count) as won_count
      `,
        [
          addressLower,
          normalizedInstanceId,
          normalizedInstanceId,
          normalizedInstanceId,
          normalizedInstanceId,
        ],
      );

      const row = statsRes.rows[0];
      const totalAssertions = Number(row?.total_assertions || 0);
      const totalBondedUsd = Number(row?.total_bonded_usd || 0);
      const totalDisputes = Number(row?.total_disputes || 0);
      const resolvedCount = Number(row?.resolved_count || 0);
      const wonCount = Number(row?.won_count || 0);

      const winRate = resolvedCount > 0 ? Math.round((wonCount / resolvedCount) * 100) : 0;

      return {
        totalAssertions,
        totalDisputes,
        totalBondedUsd,
        winRate,
      };
    },
    ['user-stats', normalizedInstanceId, addressLower],
    {
      revalidate: 60,
      tags: [
        'user-stats',
        `user-stats:${normalizedInstanceId}`,
        `user-stats:${normalizedInstanceId}:${addressLower}`,
      ],
    },
  )();
}

export async function getRiskItems(params?: { limit?: number | null; instanceId?: string | null }) {
  const limit = Math.min(200, Math.max(1, params?.limit ?? 50));
  const nowMs = Date.now();
  const normalizedInstanceId = normalizeInstanceId(params?.instanceId);
  const state = await readOracleState(normalizedInstanceId);
  const disputes = Object.values(state.disputes);

  const out: RiskItem[] = [];

  const pushRisk = (r: RiskItem) => {
    if (!Number.isFinite(r.score)) return;
    r.score = Math.max(0, Math.min(100, Math.round(r.score)));
    out.push(r);
  };

  const computeBondBoost = (bondUsd: number) => {
    if (!Number.isFinite(bondUsd) || bondUsd <= 0) return 0;
    if (bondUsd >= 250_000) return 15;
    if (bondUsd >= 100_000) return 12;
    if (bondUsd >= 50_000) return 9;
    if (bondUsd >= 10_000) return 6;
    return 0;
  };

  for (const dispute of disputes) {
    const assertion = state.assertions[dispute.assertionId];
    const bondUsd = assertion?.bondUsd ?? 0;
    const bondBoost = computeBondBoost(bondUsd);

    const votingEndsAtMs = Date.parse(dispute.votingEndsAt);
    const disputedAtMs = Date.parse(dispute.disputedAt);
    const totalVotes = Number(dispute.totalVotes);
    const votesFor = Number(dispute.currentVotesFor);
    const votesAgainst = Number(dispute.currentVotesAgainst);
    const marginPercent =
      totalVotes > 0 ? (Math.abs(votesFor - votesAgainst) / totalVotes) * 100 : 100;

    if (dispute.status === 'Pending Execution') {
      const delayMinutes = Number.isFinite(votingEndsAtMs)
        ? Math.max(0, (nowMs - votingEndsAtMs) / 60_000)
        : 0;
      if (delayMinutes >= 30) {
        const base = 88 + Math.min(12, delayMinutes / 30);
        const score = base + bondBoost;
        pushRisk({
          entityType: 'assertion',
          entityId: dispute.assertionId,
          chain: dispute.chain,
          market: dispute.market,
          score,
          severity: score >= 85 ? 'critical' : 'warning',
          reasons: [
            `Execution delayed ${Math.round(delayMinutes)}m past voting end`,
            bondBoost > 0 ? `High bond $${Math.round(bondUsd).toLocaleString()}` : '',
          ].filter(Boolean),
          assertionId: dispute.assertionId,
          disputeId: dispute.id,
        });
      }
    }

    if (dispute.status === 'Voting') {
      if (Number.isFinite(disputedAtMs) && nowMs - disputedAtMs >= 60 * 60_000) {
        if (!Number.isFinite(totalVotes) || totalVotes <= 1) {
          const hours = Math.max(1, Math.round((nowMs - disputedAtMs) / 3_600_000));
          const base = 72 + Math.min(10, hours);
          const score = base + bondBoost;
          pushRisk({
            entityType: 'assertion',
            entityId: dispute.assertionId,
            chain: dispute.chain,
            market: dispute.market,
            score,
            severity: score >= 85 ? 'critical' : 'warning',
            reasons: [
              `Low dispute participation after ${hours}h (${Number.isFinite(totalVotes) ? totalVotes : 0} votes)`,
              bondBoost > 0 ? `High bond $${Math.round(bondUsd).toLocaleString()}` : '',
            ].filter(Boolean),
            assertionId: dispute.assertionId,
            disputeId: dispute.id,
          });
        }
      }

      if (Number.isFinite(votingEndsAtMs)) {
        const minsToEnd = (votingEndsAtMs - nowMs) / 60_000;
        if (
          minsToEnd >= 0 &&
          minsToEnd <= 15 &&
          Number.isFinite(totalVotes) &&
          totalVotes >= 10 &&
          Number.isFinite(marginPercent) &&
          marginPercent <= 5
        ) {
          const base = 78 + Math.min(7, (5 - marginPercent) * 1.4);
          const score = base + bondBoost;
          pushRisk({
            entityType: 'assertion',
            entityId: dispute.assertionId,
            chain: dispute.chain,
            market: dispute.market,
            score,
            severity: score >= 85 ? 'critical' : 'warning',
            reasons: [
              `Vote divergence risk: margin ${marginPercent.toFixed(1)}% with ${Math.round(
                minsToEnd,
              )}m to end`,
              bondBoost > 0 ? `High bond $${Math.round(bondUsd).toLocaleString()}` : '',
            ].filter(Boolean),
            assertionId: dispute.assertionId,
            disputeId: dispute.id,
          });
        }
      }
    }
  }

  const cutoffMs = nowMs - 7 * 24 * 60 * 60_000;
  const assertions = Object.values(state.assertions);
  const assertions7d = assertions.filter((a) => Date.parse(a.assertedAt) >= cutoffMs);
  const disputedSet = new Set(
    Object.values(state.disputes)
      .filter((d) => Date.parse(d.disputedAt) >= cutoffMs)
      .map((d) => d.assertionId),
  );
  const totalAssertions = assertions7d.length;
  const disputedAssertions = Array.from(disputedSet).length;
  if (totalAssertions >= 20) {
    const rate = (disputedAssertions / totalAssertions) * 100;
    if (rate >= 10) {
      const score = 70 + Math.min(20, rate);
      pushRisk({
        entityType: 'market',
        entityId: state.contractAddress ?? 'oracle',
        chain: state.chain,
        market: 'global',
        score,
        severity: score >= 85 ? 'critical' : 'warning',
        reasons: [
          `High dispute rate: ${rate.toFixed(1)}% (${disputedAssertions}/${totalAssertions}) over 7d`,
        ],
      });
    }
  }

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit);
}
