import { hasDatabase, query } from "./db";
import { ensureSchema } from "./schema";
import type {
  Assertion,
  Dispute,
  OracleChain,
  DbAssertionRow,
  DbDisputeRow,
} from "@/lib/oracleTypes";
import { env } from "@/lib/env";
import { getMemoryInstance } from "./memoryBackend";
import { DEFAULT_ORACLE_INSTANCE_ID } from "./oracleConfig";
import crypto from "node:crypto";
import { logger } from "@/lib/logger";

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

const DEFAULT_MEMORY_MAX_VOTE_KEYS = 200_000;
const DEFAULT_MEMORY_VOTE_BLOCK_WINDOW = 50_000n;
const DEFAULT_MEMORY_MAX_ASSERTIONS = 10_000;
const DEFAULT_MEMORY_MAX_DISPUTES = 10_000;

function memoryMaxVoteKeys() {
  const raw = env.INSIGHT_MEMORY_MAX_VOTE_KEYS;
  if (!raw) return DEFAULT_MEMORY_MAX_VOTE_KEYS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0)
    return DEFAULT_MEMORY_MAX_VOTE_KEYS;
  return parsed;
}

function memoryMaxAssertions() {
  const raw = env.INSIGHT_MEMORY_MAX_ASSERTIONS;
  if (!raw) return DEFAULT_MEMORY_MAX_ASSERTIONS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0)
    return DEFAULT_MEMORY_MAX_ASSERTIONS;
  return parsed;
}

function memoryMaxDisputes() {
  const raw = env.INSIGHT_MEMORY_MAX_DISPUTES;
  if (!raw) return DEFAULT_MEMORY_MAX_DISPUTES;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0)
    return DEFAULT_MEMORY_MAX_DISPUTES;
  return parsed;
}

function memoryVoteBlockWindow() {
  const raw = env.INSIGHT_MEMORY_VOTE_BLOCK_WINDOW;
  if (!raw) return DEFAULT_MEMORY_VOTE_BLOCK_WINDOW;
  try {
    const parsed = BigInt(raw);
    return parsed >= 0n ? parsed : DEFAULT_MEMORY_VOTE_BLOCK_WINDOW;
  } catch {
    return DEFAULT_MEMORY_VOTE_BLOCK_WINDOW;
  }
}

function toTimeMs(value: string | undefined) {
  const ms = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(ms) ? ms : 0;
}

function deleteVotesForAssertion(
  mem: ReturnType<typeof getMemoryInstance>,
  assertionId: string,
) {
  for (const [key, v] of mem.votes.entries()) {
    if (v.assertionId === assertionId) mem.votes.delete(key);
  }
}

function pruneMemoryAssertions(mem: ReturnType<typeof getMemoryInstance>) {
  const overflow = mem.assertions.size - memoryMaxAssertions();
  if (overflow <= 0) return;
  const candidates = Array.from(mem.assertions.entries()).map(([id, a]) => ({
    id,
    rank: a.status === "Resolved" ? 1 : 0,
    timeMs:
      a.status === "Resolved" ? toTimeMs(a.resolvedAt) : toTimeMs(a.assertedAt),
  }));
  candidates.sort((a, b) => {
    const r = b.rank - a.rank;
    if (r !== 0) return r;
    return a.timeMs - b.timeMs;
  });
  for (let i = 0; i < overflow; i++) {
    const id = candidates[i]?.id;
    if (!id) continue;
    mem.assertions.delete(id);
    mem.disputes.delete(`D:${id}`);
    mem.voteSums.delete(id);
    deleteVotesForAssertion(mem, id);
  }
}

function pruneMemoryDisputes(mem: ReturnType<typeof getMemoryInstance>) {
  const overflow = mem.disputes.size - memoryMaxDisputes();
  if (overflow <= 0) return;
  const candidates = Array.from(mem.disputes.entries()).map(([id, d]) => ({
    id,
    rank: d.status === "Executed" ? 1 : 0,
    timeMs: toTimeMs(d.votingEndsAt ?? d.disputedAt),
  }));
  candidates.sort((a, b) => {
    const r = b.rank - a.rank;
    if (r !== 0) return r;
    return a.timeMs - b.timeMs;
  });
  for (let i = 0; i < overflow; i++) {
    const id = candidates[i]?.id;
    if (!id) continue;
    const d = mem.disputes.get(id);
    mem.disputes.delete(id);
    if (d) {
      mem.voteSums.delete(d.assertionId);
      deleteVotesForAssertion(mem, d.assertionId);
    }
  }
}

function mapAssertionRow(row: DbAssertionRow): Assertion {
  const blockNumber =
    row.block_number === null || row.block_number === undefined
      ? undefined
      : typeof row.block_number === "number"
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
    logIndex:
      typeof row.log_index === "number"
        ? row.log_index
        : (row.log_index ?? undefined),
    resolvedAt: row.resolved_at ? row.resolved_at.toISOString() : undefined,
    settlementResolution: row.settlement_resolution ?? undefined,
    status: row.status,
    bondUsd: Number(row.bond_usd),
    disputer: row.disputer || undefined,
    txHash: row.tx_hash,
  };
}

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
    votingEndsAt: votingEndsAt || "",
    txHash: row.tx_hash ?? undefined,
    blockNumber:
      row.block_number === null || row.block_number === undefined
        ? undefined
        : typeof row.block_number === "number"
          ? String(Math.trunc(row.block_number))
          : String(row.block_number),
    logIndex:
      typeof row.log_index === "number"
        ? row.log_index
        : (row.log_index ?? undefined),
    status: computedStatus,
    currentVotesFor: Number(row.votes_for),
    currentVotesAgainst: Number(row.votes_against),
    totalVotes: Number(row.total_votes),
  };
}

function normalizeInstanceId(instanceId: string | undefined) {
  const trimmed = (instanceId ?? DEFAULT_ORACLE_INSTANCE_ID).trim();
  return trimmed || DEFAULT_ORACLE_INSTANCE_ID;
}

function toBigIntOr(value: unknown, fallback: bigint) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value))
    return BigInt(Math.trunc(value));
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    try {
      return BigInt(trimmed);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function toIsoOrNull(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }
  return null;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toNullableString(value: unknown) {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : null;
}

export async function readOracleState(
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<StoredState> {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId);
  if (!hasDatabase()) {
    const mem = getMemoryInstance(normalizedInstanceId);
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
      disputes,
    };
  }

  const [syncRes, instanceRes, legacyConfigRes, assertionsRes, disputesRes] =
    await Promise.all([
      query("SELECT * FROM oracle_sync_state WHERE instance_id = $1", [
        normalizedInstanceId,
      ]),
      query(
        "SELECT chain, contract_address FROM oracle_instances WHERE id = $1",
        [normalizedInstanceId],
      ),
      normalizedInstanceId === DEFAULT_ORACLE_INSTANCE_ID
        ? query(
            "SELECT chain, contract_address FROM oracle_config WHERE id = 1",
          )
        : Promise.resolve({ rows: [] } as { rows: unknown[] }),
      query<DbAssertionRow>("SELECT * FROM assertions WHERE instance_id = $1", [
        normalizedInstanceId,
      ]),
      query<DbDisputeRow>("SELECT * FROM disputes WHERE instance_id = $1", [
        normalizedInstanceId,
      ]),
    ]);

  const syncRow = (syncRes.rows[0] || {}) as Record<string, unknown>;
  const instanceRow = (instanceRes.rows[0] ||
    legacyConfigRes.rows[0] ||
    {}) as Record<string, unknown>;

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
    chain: (instanceRow.chain as OracleChain) || "Local",
    contractAddress: (instanceRow.contract_address as string | null) || null,
    lastProcessedBlock: toBigIntOr(syncRow.last_processed_block, 0n),
    sync: {
      lastAttemptAt: toIsoOrNull(syncRow.last_attempt_at),
      lastSuccessAt: toIsoOrNull(syncRow.last_success_at),
      lastDurationMs: toNullableNumber(syncRow.last_duration_ms),
      lastError: toNullableString(syncRow.last_error),
    },
    assertions,
    disputes,
  };
}

export async function getSyncState(
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
) {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId);
  if (!hasDatabase()) {
    const mem = getMemoryInstance(normalizedInstanceId);
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
      contractAddress: mem.oracleConfig.contractAddress || null,
      owner: null as string | null,
    };
  }
  const [syncRes, instanceRes, legacyConfigRes] = await Promise.all([
    query("SELECT * FROM oracle_sync_state WHERE instance_id = $1", [
      normalizedInstanceId,
    ]),
    query(
      "SELECT chain, contract_address FROM oracle_instances WHERE id = $1",
      [normalizedInstanceId],
    ),
    normalizedInstanceId === DEFAULT_ORACLE_INSTANCE_ID
      ? query("SELECT chain, contract_address FROM oracle_config WHERE id = 1")
      : Promise.resolve({ rows: [] } as { rows: unknown[] }),
  ]);

  const syncRow = (syncRes.rows[0] || {}) as Record<string, unknown>;
  const configRow = (instanceRes.rows[0] ||
    legacyConfigRes.rows[0] ||
    {}) as Record<string, unknown>;

  return {
    lastProcessedBlock: toBigIntOr(syncRow.last_processed_block, 0n),
    latestBlock:
      syncRow.latest_block !== null && syncRow.latest_block !== undefined
        ? toBigIntOr(syncRow.latest_block, 0n)
        : null,
    safeBlock:
      syncRow.safe_block !== null && syncRow.safe_block !== undefined
        ? toBigIntOr(syncRow.safe_block, 0n)
        : null,
    lastSuccessProcessedBlock:
      syncRow.last_success_processed_block !== null &&
      syncRow.last_success_processed_block !== undefined
        ? toBigIntOr(syncRow.last_success_processed_block, 0n)
        : null,
    consecutiveFailures: Number(
      toNullableNumber(syncRow.consecutive_failures) ?? 0,
    ),
    rpcActiveUrl: (syncRow.rpc_active_url as string | null | undefined) ?? null,
    rpcStats: syncRow.rpc_stats ?? null,
    sync: {
      lastAttemptAt: toIsoOrNull(syncRow.last_attempt_at),
      lastSuccessAt: toIsoOrNull(syncRow.last_success_at),
      lastDurationMs: toNullableNumber(syncRow.last_duration_ms),
      lastError: toNullableString(syncRow.last_error),
    },
    chain: (configRow.chain as OracleChain) || "Local",
    contractAddress: (configRow.contract_address as string | null) || null,
    owner: null as string | null,
  };
}

export async function fetchAssertion(
  id: string,
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<Assertion | null> {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId);
  if (!hasDatabase()) {
    const mem = getMemoryInstance(normalizedInstanceId);
    return mem.assertions.get(id) ?? null;
  }
  const res = await query<DbAssertionRow>(
    "SELECT * FROM assertions WHERE id = $1 AND instance_id = $2",
    [id, normalizedInstanceId],
  );
  const row = res.rows[0];
  if (!row) return null;
  return mapAssertionRow(row);
}

export async function fetchDispute(
  id: string,
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<Dispute | null> {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId);
  if (!hasDatabase()) {
    const mem = getMemoryInstance(normalizedInstanceId);
    return mem.disputes.get(id) ?? null;
  }
  const res = await query<DbDisputeRow>(
    "SELECT * FROM disputes WHERE id = $1 AND instance_id = $2",
    [id, normalizedInstanceId],
  );
  const row = res.rows[0];
  if (!row) return null;
  return mapDisputeRow(row);
}

export async function writeOracleState(state: StoredState) {
  // Deprecated usage, but kept for compatibility
  await ensureDb();
  await updateSyncState(
    state.lastProcessedBlock,
    state.sync.lastAttemptAt || new Date().toISOString(),
    state.sync.lastSuccessAt,
    state.sync.lastDurationMs,
    state.sync.lastError,
  );
}

export async function upsertAssertion(
  a: Assertion,
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
) {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId);
  if (!hasDatabase()) {
    const mem = getMemoryInstance(normalizedInstanceId);
    mem.assertions.set(a.id, a);
    pruneMemoryAssertions(mem);
    return;
  }
  await query(
    `INSERT INTO assertions (
      id, instance_id, chain, asserter, protocol, market, assertion_data, asserted_at, liveness_ends_at, block_number, log_index, resolved_at, settlement_resolution, status, bond_usd, disputer, tx_hash
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    ON CONFLICT (id) DO UPDATE SET
      instance_id = excluded.instance_id,
      status = excluded.status,
      disputer = excluded.disputer,
      bond_usd = excluded.bond_usd,
      block_number = excluded.block_number,
      log_index = excluded.log_index,
      resolved_at = excluded.resolved_at,
      settlement_resolution = excluded.settlement_resolution
    `,
    [
      a.id,
      normalizedInstanceId,
      a.chain,
      a.asserter,
      a.protocol,
      a.market,
      a.assertion,
      a.assertedAt,
      a.livenessEndsAt,
      a.blockNumber ?? null,
      a.logIndex ?? null,
      a.resolvedAt ?? null,
      a.settlementResolution ?? null,
      a.status,
      a.bondUsd,
      a.disputer || null,
      a.txHash,
    ],
  );
}

export async function upsertDispute(
  d: Dispute,
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
) {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId);
  if (!hasDatabase()) {
    const mem = getMemoryInstance(normalizedInstanceId);
    mem.disputes.set(d.id, d);
    if (d.status === "Executed") {
      mem.voteSums.delete(d.assertionId);
      for (const [key, v] of mem.votes.entries()) {
        if (v.assertionId === d.assertionId) mem.votes.delete(key);
      }
    }
    pruneMemoryDisputes(mem);
    return;
  }
  await query(
    `INSERT INTO disputes (
      id, instance_id, chain, assertion_id, market, reason, disputer, disputed_at, voting_ends_at, tx_hash, block_number, log_index, status, votes_for, votes_against, total_votes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    ON CONFLICT (id) DO UPDATE SET
      instance_id = excluded.instance_id,
      status = excluded.status,
      votes_for = excluded.votes_for,
      votes_against = excluded.votes_against,
      total_votes = excluded.total_votes,
      voting_ends_at = excluded.voting_ends_at,
      tx_hash = excluded.tx_hash,
      block_number = excluded.block_number,
      log_index = excluded.log_index
    `,
    [
      d.id,
      normalizedInstanceId,
      d.chain,
      d.assertionId,
      d.market,
      d.disputeReason,
      d.disputer,
      d.disputedAt,
      d.votingEndsAt,
      d.txHash ?? null,
      d.blockNumber ?? null,
      d.logIndex ?? null,
      d.status,
      d.currentVotesFor,
      d.currentVotesAgainst,
      d.totalVotes,
    ],
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
  },
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
) {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId);
  if (!hasDatabase()) {
    const mem = getMemoryInstance(normalizedInstanceId);
    mem.sync.lastProcessedBlock = block;
    if (extra?.latestBlock !== undefined)
      mem.sync.latestBlock = extra.latestBlock;
    if (extra?.safeBlock !== undefined) mem.sync.safeBlock = extra.safeBlock;
    if (extra?.lastSuccessProcessedBlock !== undefined)
      mem.sync.lastSuccessProcessedBlock = extra.lastSuccessProcessedBlock;
    if (extra?.consecutiveFailures !== undefined)
      mem.sync.consecutiveFailures = extra.consecutiveFailures;
    if (extra?.rpcActiveUrl !== undefined)
      mem.sync.rpcActiveUrl = extra.rpcActiveUrl;
    if (extra?.rpcStats !== undefined) mem.sync.rpcStats = extra.rpcStats;
    mem.sync.meta = {
      lastAttemptAt: attemptAt,
      lastSuccessAt: successAt,
      lastDurationMs: duration,
      lastError: error,
    };
    return;
  }
  const latest = extra?.latestBlock;
  const safe = extra?.safeBlock;
  const lastSuccessProcessed = extra?.lastSuccessProcessedBlock;
  const consecutiveFailures = extra?.consecutiveFailures;
  const rpcActiveUrl = extra?.rpcActiveUrl;
  const rpcStats = extra?.rpcStats;
  const rpcStatsJson = rpcStats !== undefined ? JSON.stringify(rpcStats) : null;
  await query(
    `
    INSERT INTO oracle_sync_state (
      instance_id,
      last_processed_block,
      latest_block,
      safe_block,
      last_success_processed_block,
      consecutive_failures,
      rpc_active_url,
      rpc_stats,
      last_attempt_at,
      last_success_at,
      last_duration_ms,
      last_error
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (instance_id) DO UPDATE SET
      last_processed_block = excluded.last_processed_block,
      latest_block = COALESCE(excluded.latest_block, oracle_sync_state.latest_block),
      safe_block = COALESCE(excluded.safe_block, oracle_sync_state.safe_block),
      last_success_processed_block = COALESCE(excluded.last_success_processed_block, oracle_sync_state.last_success_processed_block),
      consecutive_failures = COALESCE(excluded.consecutive_failures, oracle_sync_state.consecutive_failures),
      rpc_active_url = COALESCE(excluded.rpc_active_url, oracle_sync_state.rpc_active_url),
      rpc_stats = COALESCE(excluded.rpc_stats, oracle_sync_state.rpc_stats),
      last_attempt_at = excluded.last_attempt_at,
      last_success_at = excluded.last_success_at,
      last_duration_ms = excluded.last_duration_ms,
      last_error = excluded.last_error
    `,
    [
      normalizedInstanceId,
      block.toString(),
      latest !== undefined ? latest.toString() : null,
      safe !== undefined ? safe.toString() : null,
      lastSuccessProcessed !== undefined
        ? lastSuccessProcessed.toString()
        : null,
      consecutiveFailures !== undefined ? consecutiveFailures : null,
      rpcActiveUrl !== undefined ? rpcActiveUrl : null,
      rpcStatsJson,
      attemptAt,
      successAt,
      duration,
      error,
    ],
  );
}

export async function insertSyncMetric(
  input: {
    lastProcessedBlock: bigint;
    latestBlock: bigint | null;
    safeBlock: bigint | null;
    lagBlocks: bigint | null;
    durationMs: number | null;
    error: string | null;
  },
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
) {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId);
  const recordedAt = new Date().toISOString();
  if (!hasDatabase()) {
    const mem = getMemoryInstance(normalizedInstanceId);
    const list = mem.sync.metrics ?? [];
    list.push({
      recordedAt,
      lagBlocks: input.lagBlocks,
      durationMs: input.durationMs,
      error: input.error,
    });
    while (list.length > 2000) list.shift();
    mem.sync.metrics = list;
    return;
  }
  await query(
    `
    INSERT INTO oracle_sync_metrics (instance_id, recorded_at, last_processed_block, latest_block, safe_block, lag_blocks, duration_ms, error)
    VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7)
    `,
    [
      normalizedInstanceId,
      input.lastProcessedBlock.toString(10),
      input.latestBlock !== null && input.latestBlock !== undefined
        ? input.latestBlock.toString(10)
        : null,
      input.safeBlock !== null && input.safeBlock !== undefined
        ? input.safeBlock.toString(10)
        : null,
      input.lagBlocks !== null && input.lagBlocks !== undefined
        ? input.lagBlocks.toString(10)
        : null,
      input.durationMs,
      input.error,
    ],
  );
}

export async function listSyncMetrics(params: {
  minutes: number;
  limit?: number;
  instanceId?: string;
}) {
  await ensureDb();
  const minutes = Math.min(24 * 60, Math.max(1, Math.floor(params.minutes)));
  const limit = Math.min(5000, Math.max(1, Math.floor(params.limit ?? 600)));
  const normalizedInstanceId = normalizeInstanceId(params.instanceId);
  if (!hasDatabase()) {
    const mem = getMemoryInstance(normalizedInstanceId);
    const list = mem.sync.metrics ?? [];
    const cutoffMs = Date.now() - minutes * 60 * 1000;
    return list
      .filter((m) => new Date(m.recordedAt).getTime() >= cutoffMs)
      .slice(-limit)
      .map((m) => ({
        recordedAt: m.recordedAt,
        lagBlocks: m.lagBlocks !== null ? m.lagBlocks.toString(10) : null,
        durationMs: m.durationMs,
        error: m.error,
      }));
  }
  const res = await query(
    `
    SELECT recorded_at, lag_blocks, duration_ms, error
    FROM oracle_sync_metrics
    WHERE instance_id = $1 AND recorded_at > NOW() - INTERVAL '1 minute' * $2
    ORDER BY recorded_at ASC
    LIMIT $3
    `,
    [normalizedInstanceId, minutes, limit],
  );
  return res.rows.map((row) => {
    const r = row as unknown as {
      recorded_at: unknown;
      lag_blocks: unknown;
      duration_ms: unknown;
      error: unknown;
    };
    const recordedAtDate =
      r.recorded_at instanceof Date
        ? r.recorded_at
        : new Date(String(r.recorded_at));
    const lagBlocks =
      r.lag_blocks !== null && r.lag_blocks !== undefined
        ? String(r.lag_blocks)
        : null;
    const durationMs =
      r.duration_ms === null || r.duration_ms === undefined
        ? null
        : typeof r.duration_ms === "number"
          ? r.duration_ms
          : Number(r.duration_ms);
    const error = typeof r.error === "string" ? r.error : null;
    return {
      recordedAt: recordedAtDate.toISOString(),
      lagBlocks,
      durationMs,
      error,
    };
  });
}

function bigintToSafeNumber(value: bigint) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) return Number.MAX_SAFE_INTEGER;
  if (value < BigInt(Number.MIN_SAFE_INTEGER)) return Number.MIN_SAFE_INTEGER;
  return Number(value);
}

function applyVoteSumsDelta(
  mem: ReturnType<typeof getMemoryInstance>,
  assertionId: string,
  support: boolean,
  weight: bigint,
  direction: 1 | -1,
) {
  const prev = mem.voteSums.get(assertionId) ?? {
    forWeight: 0n,
    againstWeight: 0n,
  };
  const delta = direction === 1 ? weight : -weight;
  let forWeight = prev.forWeight;
  let againstWeight = prev.againstWeight;
  if (support) forWeight += delta;
  else againstWeight += delta;
  if (forWeight < 0n) forWeight = 0n;
  if (againstWeight < 0n) againstWeight = 0n;
  const next = { forWeight, againstWeight };
  if (next.forWeight === 0n && next.againstWeight === 0n)
    mem.voteSums.delete(assertionId);
  else mem.voteSums.set(assertionId, next);
  const dispute = mem.disputes.get(`D:${assertionId}`);
  if (dispute) {
    dispute.currentVotesFor = bigintToSafeNumber(next.forWeight);
    dispute.currentVotesAgainst = bigintToSafeNumber(next.againstWeight);
    dispute.totalVotes = bigintToSafeNumber(
      next.forWeight + next.againstWeight,
    );
    mem.disputes.set(dispute.id, dispute);
  }
  return next;
}

export async function insertVoteEvent(
  input: {
    chain: OracleChain;
    assertionId: string;
    voter: string;
    support: boolean;
    weight: bigint;
    txHash: string;
    blockNumber: bigint;
    logIndex: number;
  },
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
) {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId);
  if (!hasDatabase()) {
    const mem = getMemoryInstance(normalizedInstanceId);
    const key = `${input.txHash}:${input.logIndex}`;
    if (mem.votes.has(key)) return false;
    mem.votes.set(key, {
      assertionId: input.assertionId,
      support: input.support,
      weight: input.weight,
      blockNumber: input.blockNumber,
    });
    applyVoteSumsDelta(mem, input.assertionId, input.support, input.weight, 1);
    const maxKeys = memoryMaxVoteKeys();
    if (mem.votes.size > maxKeys) {
      const blockWindow = memoryVoteBlockWindow();
      const cutoff =
        input.blockNumber > blockWindow ? input.blockNumber - blockWindow : 0n;
      for (const [k, v] of mem.votes.entries()) {
        if (v.blockNumber < cutoff) {
          mem.votes.delete(k);
          applyVoteSumsDelta(mem, v.assertionId, v.support, v.weight, -1);
        }
        if (mem.votes.size <= maxKeys) break;
      }
      while (mem.votes.size > maxKeys) {
        const firstKey = mem.votes.keys().next().value as string | undefined;
        if (!firstKey) break;
        const v = mem.votes.get(firstKey);
        mem.votes.delete(firstKey);
        if (v) applyVoteSumsDelta(mem, v.assertionId, v.support, v.weight, -1);
      }
    }
    return true;
  }
  const res = await query(
    `
    INSERT INTO votes (instance_id, chain, assertion_id, voter, support, weight, tx_hash, block_number, log_index)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (tx_hash, log_index) DO NOTHING
    RETURNING 1
    `,
    [
      normalizedInstanceId,
      input.chain,
      input.assertionId,
      input.voter,
      input.support,
      input.weight.toString(10),
      input.txHash,
      input.blockNumber.toString(10),
      input.logIndex,
    ],
  );
  return res.rows.length > 0;
}

export async function insertOracleEvent(
  input: {
    chain: OracleChain;
    eventType: string;
    assertionId?: string | null;
    txHash: string;
    blockNumber: bigint;
    logIndex: number;
    payload: unknown;
  },
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
) {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId);
  try {
    const payloadJson = JSON.stringify(input.payload);
    const payloadChecksum = crypto
      .createHash("sha256")
      .update(payloadJson)
      .digest("hex");
    if (!hasDatabase()) {
      const mem = getMemoryInstance(normalizedInstanceId);
      const key = `${input.txHash}:${input.logIndex}`;
      if (mem.oracleEvents.has(key)) return false;
      mem.oracleEvents.set(key, {
        id: mem.nextOracleEventId++,
        chain: input.chain,
        eventType: input.eventType,
        assertionId: input.assertionId ?? null,
        txHash: input.txHash,
        blockNumber: input.blockNumber,
        logIndex: input.logIndex,
        payload: input.payload,
        payloadChecksum,
      });
      return true;
    }
    const res = await query(
      `
      INSERT INTO oracle_events (instance_id, chain, event_type, assertion_id, tx_hash, block_number, log_index, payload, payload_checksum)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
      ON CONFLICT (instance_id, tx_hash, log_index) DO NOTHING
      RETURNING 1
      `,
      [
        normalizedInstanceId,
        input.chain,
        input.eventType,
        input.assertionId ?? null,
        input.txHash,
        input.blockNumber.toString(10),
        input.logIndex,
        payloadJson,
        payloadChecksum,
      ],
    );
    return res.rows.length > 0;
  } catch {
    return false;
  }
}

export async function replayOracleEventsRange(
  fromBlock: bigint,
  toBlock: bigint,
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
) {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId);
  if (!hasDatabase()) {
    const mem = getMemoryInstance(normalizedInstanceId);
    const events = Array.from(mem.oracleEvents.values())
      .filter(
        (event) =>
          event.blockNumber >= fromBlock && event.blockNumber <= toBlock,
      )
      .sort((a, b) => {
        if (a.blockNumber === b.blockNumber) {
          if (a.logIndex === b.logIndex) return a.id - b.id;
          return a.logIndex - b.logIndex;
        }
        return a.blockNumber < b.blockNumber ? -1 : 1;
      });

    let applied = 0;
    for (const event of events) {
      const eventType = (event.eventType ?? "").trim();
      const payload = event.payload;
      if (!eventType) continue;
      if (event.payloadChecksum) {
        const payloadChecksum = crypto
          .createHash("sha256")
          .update(JSON.stringify(payload))
          .digest("hex");
        if (payloadChecksum !== event.payloadChecksum) {
          logger.warn("Event payload checksum mismatch", {
            eventType,
            assertionId: event.assertionId,
          });
          continue;
        }
      }

      if (eventType === "assertion_created") {
        const a = payload as Assertion;
        if (!a?.id) continue;
        await upsertAssertion(a, normalizedInstanceId);
        applied += 1;
        continue;
      }

      if (eventType === "assertion_disputed") {
        const d = payload as Dispute;
        if (!d?.assertionId) continue;
        const assertion = await fetchAssertion(
          d.assertionId,
          normalizedInstanceId,
        );
        if (assertion) {
          assertion.status = "Disputed";
          assertion.disputer = d.disputer;
          await upsertAssertion(assertion, normalizedInstanceId);
        }
        await upsertDispute(d, normalizedInstanceId);
        applied += 1;
        continue;
      }

      if (eventType === "vote_cast") {
        const v = payload as {
          chain: OracleChain;
          assertionId: string;
          voter: string;
          support: boolean;
          weight: string;
          txHash: string;
          blockNumber: string;
          logIndex: number;
        };
        if (!v?.assertionId) continue;
        await insertVoteEvent(
          {
            chain: v.chain,
            assertionId: v.assertionId,
            voter: v.voter,
            support: Boolean(v.support),
            weight: BigInt(v.weight || "0"),
            txHash: v.txHash,
            blockNumber: BigInt(v.blockNumber || "0"),
            logIndex: Number(v.logIndex ?? 0),
          },
          normalizedInstanceId,
        );
        await recomputeDisputeVotes(v.assertionId, normalizedInstanceId);
        applied += 1;
        continue;
      }

      if (eventType === "assertion_resolved") {
        const r = payload as {
          assertionId: string;
          resolvedAt: string;
          outcome: boolean;
        };
        const assertionId = r?.assertionId || event.assertionId;
        if (!assertionId) continue;

        const assertion = await fetchAssertion(
          assertionId,
          normalizedInstanceId,
        );
        if (assertion) {
          assertion.status = "Resolved";
          assertion.resolvedAt = r.resolvedAt;
          assertion.settlementResolution = r.outcome;
          await upsertAssertion(assertion, normalizedInstanceId);
        }
        applied += 1;
      }
    }

    return { applied };
  }

  const res = await query<{
    event_type: string;
    assertion_id: string | null;
    payload: unknown;
    payload_checksum: string | null;
  }>(
    `
    SELECT event_type, assertion_id, payload, payload_checksum
    FROM oracle_events
    WHERE instance_id = $1 AND block_number >= $2 AND block_number <= $3
    ORDER BY block_number ASC, log_index ASC, id ASC
    `,
    [normalizedInstanceId, fromBlock.toString(10), toBlock.toString(10)],
  );

  let applied = 0;
  for (const row of res.rows) {
    const eventType = (row.event_type ?? "").trim();
    const payload = row.payload;
    if (!eventType) continue;
    if (row.payload_checksum) {
      const payloadChecksum = crypto
        .createHash("sha256")
        .update(JSON.stringify(payload))
        .digest("hex");
      if (payloadChecksum !== row.payload_checksum) {
        logger.warn("Event payload checksum mismatch", {
          eventType,
          assertionId: row.assertion_id,
        });
        continue;
      }
    }

    if (eventType === "assertion_created") {
      const a = payload as Assertion;
      if (!a?.id) continue;
      await upsertAssertion(a, normalizedInstanceId);
      applied += 1;
      continue;
    }

    if (eventType === "assertion_disputed") {
      const d = payload as Dispute;
      if (!d?.assertionId) continue;
      const assertion = await fetchAssertion(
        d.assertionId,
        normalizedInstanceId,
      );
      if (assertion) {
        assertion.status = "Disputed";
        assertion.disputer = d.disputer;
        await upsertAssertion(assertion, normalizedInstanceId);
      }
      await upsertDispute(d, normalizedInstanceId);
      applied += 1;
      continue;
    }

    if (eventType === "vote_cast") {
      const v = payload as {
        chain: OracleChain;
        assertionId: string;
        voter: string;
        support: boolean;
        weight: string;
        txHash: string;
        blockNumber: string;
        logIndex: number;
      };
      if (!v?.assertionId) continue;
      await insertVoteEvent(
        {
          chain: v.chain,
          assertionId: v.assertionId,
          voter: v.voter,
          support: Boolean(v.support),
          weight: BigInt(v.weight || "0"),
          txHash: v.txHash,
          blockNumber: BigInt(v.blockNumber || "0"),
          logIndex: Number(v.logIndex ?? 0),
        },
        normalizedInstanceId,
      );
      await recomputeDisputeVotes(v.assertionId, normalizedInstanceId);
      applied += 1;
      continue;
    }

    if (eventType === "assertion_resolved") {
      const r = payload as {
        assertionId: string;
        resolvedAt: string;
        outcome: boolean;
      };
      const assertionId = r?.assertionId || row.assertion_id;
      if (!assertionId) continue;

      const assertion = await fetchAssertion(assertionId, normalizedInstanceId);
      if (assertion) {
        assertion.status = "Resolved";
        assertion.resolvedAt = r.resolvedAt;
        assertion.settlementResolution = r.outcome;
        await upsertAssertion(assertion, normalizedInstanceId);
      }

      const dispute = await fetchDispute(
        `D:${assertionId}`,
        normalizedInstanceId,
      );
      if (dispute) {
        dispute.status = "Executed";
        dispute.votingEndsAt = r.resolvedAt;
        await upsertDispute(dispute, normalizedInstanceId);
      }

      applied += 1;
      continue;
    }
  }

  return { applied };
}

export async function recomputeDisputeVotes(
  assertionId: string,
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
) {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId);
  if (!hasDatabase()) {
    const mem = getMemoryInstance(normalizedInstanceId);
    const dispute = mem.disputes.get(`D:${assertionId}`);
    if (!dispute) return;
    const sums =
      mem.voteSums.get(assertionId) ??
      (() => {
        let votesFor = 0n;
        let votesAgainst = 0n;
        for (const v of mem.votes.values()) {
          if (v.assertionId !== assertionId) continue;
          if (v.support) votesFor += v.weight;
          else votesAgainst += v.weight;
        }
        const computed = { forWeight: votesFor, againstWeight: votesAgainst };
        mem.voteSums.set(assertionId, computed);
        return computed;
      })();
    dispute.currentVotesFor = bigintToSafeNumber(sums.forWeight);
    dispute.currentVotesAgainst = bigintToSafeNumber(sums.againstWeight);
    dispute.totalVotes = bigintToSafeNumber(
      sums.forWeight + sums.againstWeight,
    );
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
    WHERE assertion_id = $1 AND instance_id = $2
    `,
    [assertionId, normalizedInstanceId],
  );
  const row = (sums.rows[0] ?? {}) as unknown as {
    votes_for?: unknown;
    votes_against?: unknown;
    total_votes?: unknown;
  };
  const votesFor =
    row.votes_for !== undefined && row.votes_for !== null
      ? String(row.votes_for)
      : "0";
  const votesAgainst =
    row.votes_against !== undefined && row.votes_against !== null
      ? String(row.votes_against)
      : "0";
  const totalVotes =
    row.total_votes !== undefined && row.total_votes !== null
      ? String(row.total_votes)
      : "0";
  await query(
    `
    UPDATE disputes
    SET votes_for = $2, votes_against = $3, total_votes = $4
    WHERE id = $1 AND instance_id = $5
    `,
    [
      `D:${assertionId}`,
      votesFor,
      votesAgainst,
      totalVotes,
      normalizedInstanceId,
    ],
  );
}
