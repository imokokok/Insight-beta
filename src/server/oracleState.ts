import { hasDatabase, query } from "./db";
import { ensureSchema } from "./schema";
import type { Assertion, Dispute, OracleChain } from "@/lib/oracleTypes";
import { getMemoryStore } from "@/server/memoryBackend";

export type SyncMeta = {
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastDurationMs: number | null;
  lastError: string | null;
};

export type StoredState = {
  version: 2;
  chain: OracleChain;
  contractAddress: string | null;
  lastProcessedBlock: bigint;
  sync: SyncMeta;
  assertions: Record<string, Assertion>;
  disputes: Record<string, Dispute>;
};

let schemaEnsured = false;
async function ensureDb() {
  if (!hasDatabase()) return;
  if (!schemaEnsured) {
    await ensureSchema();
    schemaEnsured = true;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAssertionRow(row: any): Assertion {
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
    settlementResolution: row.settlement_resolution,
    status: row.status,
    bondUsd: Number(row.bond_usd),
    disputer: row.disputer,
    txHash: row.tx_hash
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDisputeRow(row: any): Dispute {
  const now = Date.now();
  const votingEndsAt = row.voting_ends_at ? row.voting_ends_at.toISOString() : undefined;
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
    votingEndsAt,
    status: computedStatus,
    currentVotesFor: Number(row.votes_for),
    currentVotesAgainst: Number(row.votes_against),
    totalVotes: Number(row.total_votes)
  };
}

export async function readOracleState(): Promise<StoredState> {
  await ensureDb();
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    const assertions: Record<string, Assertion> = {};
    for (const [id, a] of mem.assertions.entries()) assertions[id] = a;
    const disputes: Record<string, Dispute> = {};
    for (const [id, d] of mem.disputes.entries()) disputes[id] = d;
    return {
      version: 2,
      chain: mem.oracleConfig.chain,
      contractAddress: mem.oracleConfig.contractAddress || null,
      lastProcessedBlock: mem.sync.lastProcessedBlock,
      sync: mem.sync.meta,
      assertions,
      disputes
    };
  }

  const [syncRes, configRes, assertionsRes, disputesRes] = await Promise.all([
    query("SELECT * FROM sync_state WHERE id = 1"),
    query("SELECT * FROM oracle_config WHERE id = 1"),
    query("SELECT * FROM assertions"),
    query("SELECT * FROM disputes")
  ]);

  const syncRow = syncRes.rows[0] || {};
  const configRow = configRes.rows[0] || {};

  const assertions: Record<string, Assertion> = {};
  for (const row of assertionsRes.rows) {
    assertions[row.id] = mapAssertionRow(row);
  }

  const disputes: Record<string, Dispute> = {};
  for (const row of disputesRes.rows) {
    disputes[row.id] = mapDisputeRow(row);
  }

  return {
    version: 2,
    chain: (configRow.chain as OracleChain) || "Local",
    contractAddress: configRow.contract_address || null,
    lastProcessedBlock: BigInt(syncRow.last_processed_block || 0),
    sync: {
      lastAttemptAt: syncRow.last_attempt_at ? syncRow.last_attempt_at.toISOString() : null,
      lastSuccessAt: syncRow.last_success_at ? syncRow.last_success_at.toISOString() : null,
      lastDurationMs: syncRow.last_duration_ms || null,
      lastError: syncRow.last_error || null
    },
    assertions,
    disputes
  };
}

export async function getSyncState() {
  await ensureDb();
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    return {
      lastProcessedBlock: mem.sync.lastProcessedBlock,
      latestBlock: mem.sync.latestBlock ?? null,
      safeBlock: mem.sync.safeBlock ?? null,
      lastSuccessProcessedBlock: mem.sync.lastSuccessProcessedBlock ?? null,
      consecutiveFailures: mem.sync.consecutiveFailures ?? 0,
      rpcActiveUrl: mem.sync.rpcActiveUrl ?? null,
      rpcStats: mem.sync.rpcStats ?? null,
      sync: mem.sync.meta,
      chain: mem.oracleConfig.chain,
      contractAddress: mem.oracleConfig.contractAddress || null
    };
  }
  const [syncRes, configRes] = await Promise.all([
    query("SELECT * FROM sync_state WHERE id = 1"),
    query("SELECT * FROM oracle_config WHERE id = 1")
  ]);
  
  const syncRow = syncRes.rows[0] || {};
  const configRow = configRes.rows[0] || {};
  
  return {
    lastProcessedBlock: BigInt(syncRow.last_processed_block || 0),
    latestBlock: syncRow.latest_block !== null && syncRow.latest_block !== undefined ? BigInt(syncRow.latest_block) : null,
    safeBlock: syncRow.safe_block !== null && syncRow.safe_block !== undefined ? BigInt(syncRow.safe_block) : null,
    lastSuccessProcessedBlock:
      syncRow.last_success_processed_block !== null && syncRow.last_success_processed_block !== undefined
        ? BigInt(syncRow.last_success_processed_block)
        : null,
    consecutiveFailures: Number(syncRow.consecutive_failures ?? 0),
    rpcActiveUrl: (syncRow.rpc_active_url as string | null | undefined) ?? null,
    rpcStats: (syncRow.rpc_stats as unknown) ?? null,
    sync: {
      lastAttemptAt: syncRow.last_attempt_at ? syncRow.last_attempt_at.toISOString() : null,
      lastSuccessAt: syncRow.last_success_at ? syncRow.last_success_at.toISOString() : null,
      lastDurationMs: syncRow.last_duration_ms || null,
      lastError: syncRow.last_error || null
    },
    chain: (configRow.chain as OracleChain) || "Local",
    contractAddress: configRow.contract_address || null
  };
}

export async function fetchAssertion(id: string): Promise<Assertion | null> {
  await ensureDb();
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    return mem.assertions.get(id) ?? null;
  }
  const res = await query("SELECT * FROM assertions WHERE id = $1", [id]);
  if (res.rows.length === 0) return null;
  return mapAssertionRow(res.rows[0]);
}

export async function fetchDispute(id: string): Promise<Dispute | null> {
  await ensureDb();
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    return mem.disputes.get(id) ?? null;
  }
  const res = await query("SELECT * FROM disputes WHERE id = $1", [id]);
  if (res.rows.length === 0) return null;
  return mapDisputeRow(res.rows[0]);
}

export async function writeOracleState(state: StoredState) {
  // Deprecated usage, but kept for compatibility
  await ensureDb();
  await updateSyncState(
    state.lastProcessedBlock,
    state.sync.lastAttemptAt || new Date().toISOString(),
    state.sync.lastSuccessAt,
    state.sync.lastDurationMs,
    state.sync.lastError
  );
}

export async function upsertAssertion(a: Assertion) {
  await ensureDb();
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    mem.assertions.set(a.id, a);
    return;
  }
  await query(
    `INSERT INTO assertions (
      id, chain, asserter, protocol, market, assertion_data, asserted_at, liveness_ends_at, resolved_at, settlement_resolution, status, bond_usd, disputer, tx_hash
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    ON CONFLICT (id) DO UPDATE SET
      status = excluded.status,
      disputer = excluded.disputer,
      bond_usd = excluded.bond_usd,
      resolved_at = excluded.resolved_at,
      settlement_resolution = excluded.settlement_resolution
    `,
    [
      a.id,
      a.chain,
      a.asserter,
      a.protocol,
      a.market,
      a.assertion,
      a.assertedAt,
      a.livenessEndsAt,
      a.resolvedAt ?? null,
      a.settlementResolution ?? null,
      a.status,
      a.bondUsd,
      a.disputer || null,
      a.txHash
    ]
  );
}

export async function upsertDispute(d: Dispute) {
  await ensureDb();
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    mem.disputes.set(d.id, d);
    return;
  }
  await query(
    `INSERT INTO disputes (
      id, chain, assertion_id, market, reason, disputer, disputed_at, voting_ends_at, status, votes_for, votes_against, total_votes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (id) DO UPDATE SET
      status = excluded.status,
      votes_for = excluded.votes_for,
      votes_against = excluded.votes_against,
      total_votes = excluded.total_votes,
      voting_ends_at = excluded.voting_ends_at
    `,
    [
      d.id,
      d.chain,
      d.assertionId,
      d.market,
      d.disputeReason,
      d.disputer,
      d.disputedAt,
      d.votingEndsAt,
      d.status,
      d.currentVotesFor,
      d.currentVotesAgainst,
      d.totalVotes
    ]
  );
}

export async function updateSyncState(
  block: bigint, 
  attemptAt: string, 
  successAt: string | null, 
  duration: number | null, 
  error: string | null,
  extra?: {
    latestBlock?: bigint;
    safeBlock?: bigint;
    lastSuccessProcessedBlock?: bigint;
    consecutiveFailures?: number;
    rpcActiveUrl?: string | null;
    rpcStats?: unknown;
  }
) {
  await ensureDb();
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    mem.sync.lastProcessedBlock = block;
    if (extra?.latestBlock !== undefined) mem.sync.latestBlock = extra.latestBlock;
    if (extra?.safeBlock !== undefined) mem.sync.safeBlock = extra.safeBlock;
    if (extra?.lastSuccessProcessedBlock !== undefined) mem.sync.lastSuccessProcessedBlock = extra.lastSuccessProcessedBlock;
    if (extra?.consecutiveFailures !== undefined) mem.sync.consecutiveFailures = extra.consecutiveFailures;
    if (extra?.rpcActiveUrl !== undefined) mem.sync.rpcActiveUrl = extra.rpcActiveUrl;
    if (extra?.rpcStats !== undefined) mem.sync.rpcStats = extra.rpcStats;
    mem.sync.meta = {
      lastAttemptAt: attemptAt,
      lastSuccessAt: successAt,
      lastDurationMs: duration,
      lastError: error
    };
    return;
  }
  const latest = extra?.latestBlock;
  const safe = extra?.safeBlock;
  const lastSuccessProcessed = extra?.lastSuccessProcessedBlock;
  const consecutiveFailures = extra?.consecutiveFailures;
  const rpcActiveUrl = extra?.rpcActiveUrl;
  const rpcStats = extra?.rpcStats;
  await query(
    `UPDATE sync_state SET 
      last_processed_block = $1,
      latest_block = COALESCE($6, latest_block),
      safe_block = COALESCE($7, safe_block),
      last_success_processed_block = COALESCE($8, last_success_processed_block),
      consecutive_failures = COALESCE($9, consecutive_failures),
      rpc_active_url = COALESCE($10, rpc_active_url),
      rpc_stats = COALESCE($11, rpc_stats),
      last_attempt_at = $2,
      last_success_at = $3,
      last_duration_ms = $4,
      last_error = $5
     WHERE id = 1`,
    [
      block.toString(),
      attemptAt,
      successAt,
      duration,
      error,
      latest !== undefined ? latest.toString() : null,
      safe !== undefined ? safe.toString() : null,
      lastSuccessProcessed !== undefined ? lastSuccessProcessed.toString() : null,
      consecutiveFailures !== undefined ? consecutiveFailures : null,
      rpcActiveUrl !== undefined ? rpcActiveUrl : null,
      rpcStats !== undefined ? rpcStats : null
    ]
  );
}

export async function insertSyncMetric(input: {
  lastProcessedBlock: bigint;
  latestBlock: bigint | null;
  safeBlock: bigint | null;
  lagBlocks: bigint | null;
  durationMs: number | null;
  error: string | null;
}) {
  await ensureDb();
  const recordedAt = new Date().toISOString();
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    const list = mem.sync.metrics ?? [];
    list.push({ recordedAt, lagBlocks: input.lagBlocks, durationMs: input.durationMs, error: input.error });
    while (list.length > 2000) list.shift();
    mem.sync.metrics = list;
    return;
  }
  await query(
    `
    INSERT INTO sync_metrics (recorded_at, last_processed_block, latest_block, safe_block, lag_blocks, duration_ms, error)
    VALUES (NOW(), $1, $2, $3, $4, $5, $6)
    `,
    [
      input.lastProcessedBlock.toString(10),
      input.latestBlock !== null && input.latestBlock !== undefined ? input.latestBlock.toString(10) : null,
      input.safeBlock !== null && input.safeBlock !== undefined ? input.safeBlock.toString(10) : null,
      input.lagBlocks !== null && input.lagBlocks !== undefined ? input.lagBlocks.toString(10) : null,
      input.durationMs,
      input.error
    ]
  );
}

export async function listSyncMetrics(params: { minutes: number; limit?: number }) {
  await ensureDb();
  const minutes = Math.min(24 * 60, Math.max(1, Math.floor(params.minutes)));
  const limit = Math.min(5000, Math.max(1, Math.floor(params.limit ?? 600)));
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    const list = mem.sync.metrics ?? [];
    const cutoffMs = Date.now() - minutes * 60 * 1000;
    return list
      .filter((m) => new Date(m.recordedAt).getTime() >= cutoffMs)
      .slice(-limit)
      .map((m) => ({
        recordedAt: m.recordedAt,
        lagBlocks: m.lagBlocks !== null ? m.lagBlocks.toString(10) : null,
        durationMs: m.durationMs,
        error: m.error
      }));
  }
  const res = await query(
    `
    SELECT recorded_at, lag_blocks, duration_ms, error
    FROM sync_metrics
    WHERE recorded_at > NOW() - INTERVAL '1 minute' * $1
    ORDER BY recorded_at ASC
    LIMIT $2
    `,
    [minutes, limit]
  );
  return res.rows.map((row) => {
    const r = row as unknown as { recorded_at: unknown; lag_blocks: unknown; duration_ms: unknown; error: unknown };
    const recordedAtDate = r.recorded_at instanceof Date ? r.recorded_at : new Date(String(r.recorded_at));
    const lagBlocks = r.lag_blocks !== null && r.lag_blocks !== undefined ? String(r.lag_blocks) : null;
    const durationMs =
      r.duration_ms === null || r.duration_ms === undefined ? null : (typeof r.duration_ms === "number" ? r.duration_ms : Number(r.duration_ms));
    const error = typeof r.error === "string" ? r.error : null;
    return { recordedAt: recordedAtDate.toISOString(), lagBlocks, durationMs, error };
  });
}

function bigintToSafeNumber(value: bigint) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) return Number.MAX_SAFE_INTEGER;
  if (value < BigInt(Number.MIN_SAFE_INTEGER)) return Number.MIN_SAFE_INTEGER;
  return Number(value);
}

export async function insertVoteEvent(input: {
  chain: OracleChain;
  assertionId: string;
  voter: string;
  support: boolean;
  weight: bigint;
  txHash: string;
  blockNumber: bigint;
  logIndex: number;
}) {
  await ensureDb();
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    const key = `${input.txHash}:${input.logIndex}`;
    if (mem.votes.has(key)) return false;
    mem.votes.set(key, { assertionId: input.assertionId, support: input.support, weight: input.weight });
    return true;
  }
  const res = await query(
    `
    INSERT INTO votes (chain, assertion_id, voter, support, weight, tx_hash, block_number, log_index)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (tx_hash, log_index) DO NOTHING
    RETURNING 1
    `,
    [
      input.chain,
      input.assertionId,
      input.voter,
      input.support,
      input.weight.toString(10),
      input.txHash,
      input.blockNumber.toString(10),
      input.logIndex
    ]
  );
  return res.rows.length > 0;
}

export async function recomputeDisputeVotes(assertionId: string) {
  await ensureDb();
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    const dispute = mem.disputes.get(`D:${assertionId}`);
    if (!dispute) return;
    let votesFor = 0n;
    let votesAgainst = 0n;
    for (const v of mem.votes.values()) {
      if (v.assertionId !== assertionId) continue;
      if (v.support) votesFor += v.weight;
      else votesAgainst += v.weight;
    }
    dispute.currentVotesFor = bigintToSafeNumber(votesFor);
    dispute.currentVotesAgainst = bigintToSafeNumber(votesAgainst);
    dispute.totalVotes = bigintToSafeNumber(votesFor + votesAgainst);
    mem.disputes.set(dispute.id, dispute);
    return;
  }
  const sums = await query(
    `
    SELECT
      COALESCE(SUM(CASE WHEN support THEN weight ELSE 0 END), 0) AS votes_for,
      COALESCE(SUM(CASE WHEN NOT support THEN weight ELSE 0 END), 0) AS votes_against,
      COALESCE(SUM(weight), 0) AS total_votes
    FROM votes
    WHERE assertion_id = $1
    `,
    [assertionId]
  );
  const row = (sums.rows[0] ?? {}) as unknown as { votes_for?: unknown; votes_against?: unknown; total_votes?: unknown };
  const votesFor = row.votes_for !== undefined && row.votes_for !== null ? String(row.votes_for) : "0";
  const votesAgainst = row.votes_against !== undefined && row.votes_against !== null ? String(row.votes_against) : "0";
  const totalVotes = row.total_votes !== undefined && row.total_votes !== null ? String(row.total_votes) : "0";
  await query(
    `
    UPDATE disputes
    SET votes_for = $2, votes_against = $3, total_votes = $4
    WHERE assertion_id = $1
    `,
    [assertionId, votesFor, votesAgainst, totalVotes]
  );
}
