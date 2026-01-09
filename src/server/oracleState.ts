import { query } from "./db";
import { ensureSchema } from "./schema";
import type { Assertion, Dispute, OracleChain } from "@/lib/oracleTypes";

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
  const [syncRes, configRes] = await Promise.all([
    query("SELECT * FROM sync_state WHERE id = 1"),
    query("SELECT * FROM oracle_config WHERE id = 1")
  ]);
  
  const syncRow = syncRes.rows[0] || {};
  const configRow = configRes.rows[0] || {};
  
  return {
    lastProcessedBlock: BigInt(syncRow.last_processed_block || 0),
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
  const res = await query("SELECT * FROM assertions WHERE id = $1", [id]);
  if (res.rows.length === 0) return null;
  return mapAssertionRow(res.rows[0]);
}

export async function fetchDispute(id: string): Promise<Dispute | null> {
  await ensureDb();
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
  error: string | null
) {
  await ensureDb();
  await query(
    `UPDATE sync_state SET 
      last_processed_block = $1,
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
      error
    ]
  );
}
