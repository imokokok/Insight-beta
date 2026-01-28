import { hasDatabase, query } from '../db';
import { ensureSchema } from '../schema';
import type { UMAChain, UMAAssertion, UMADispute, UMAVote } from '@/lib/types/oracleTypes';
import { DEFAULT_UMA_INSTANCE_ID } from './umaConfig';
import { getMemoryUMAInstance } from '../memoryBackend';

export type UMASyncMeta = {
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastDurationMs: number | null;
  lastError: string | null;
};

export type StoredUMAState = {
  version: 1;
  chain: UMAChain;
  ooV2Address: string | null;
  ooV3Address: string | null;
  lastProcessedBlock: bigint;
  sync: UMASyncMeta;
  assertions: Record<string, UMAAssertion>;
  disputes: Record<string, UMADispute>;
  latestBlock: bigint | null;
  safeBlock: bigint | null;
  lastSuccessProcessedBlock: bigint | null;
  consecutiveFailures: number;
  rpcActiveUrl: string | null;
  rpcStats: unknown;
};

const DEFAULT_MEMORY_MAX_ASSERTIONS = 10_000;
const DEFAULT_MEMORY_MAX_DISUTES = 10_000;

function normalizeInstanceId(instanceId: string | undefined) {
  const trimmed = (instanceId ?? DEFAULT_UMA_INSTANCE_ID).trim();
  return trimmed || DEFAULT_UMA_INSTANCE_ID;
}

function toBigIntOr(value: unknown, fallback: bigint) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (typeof value === 'string') {
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
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }
  return null;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toNullableString(value: unknown) {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? value : null;
}

function pruneMemoryAssertions(
  mem: ReturnType<typeof getMemoryUMAInstance>,
  maxSize: number = DEFAULT_MEMORY_MAX_ASSERTIONS,
) {
  const overflow = mem.umaAssertions.size - maxSize;
  if (overflow <= 0) return;

  const candidates = Array.from(mem.umaAssertions.entries()).map(([id, a]) => ({
    id,
    rank: a.status === 'Settled' ? 1 : a.status === 'Disputed' ? 0 : -1,
    timeMs: new Date(a.proposedAt).getTime(),
  }));

  candidates.sort((a, b) => {
    const r = b.rank - a.rank;
    if (r !== 0) return r;
    return a.timeMs - b.timeMs;
  });

  for (let i = 0; i < overflow; i++) {
    const id = candidates[i]?.id;
    if (!id) continue;
    mem.umaAssertions.delete(id);
    mem.umaDisputes.delete(`D:${id}`);
  }
}

function pruneMemoryDisputes(
  mem: ReturnType<typeof getMemoryUMAInstance>,
  maxSize: number = DEFAULT_MEMORY_MAX_DISUTES,
) {
  const overflow = mem.umaDisputes.size - maxSize;
  if (overflow <= 0) return;

  const candidates = Array.from(mem.umaDisputes.entries()).map(([id, d]) => ({
    id,
    rank: d.status === 'Executed' ? 1 : 0,
    timeMs: new Date(d.disputedAt).getTime(),
  }));

  candidates.sort((a, b) => {
    const r = b.rank - a.rank;
    if (r !== 0) return r;
    return a.timeMs - b.timeMs;
  });

  for (let i = 0; i < overflow; i++) {
    const id = candidates[i]?.id;
    if (!id) continue;
    mem.umaDisputes.delete(id);
  }
}

export async function getUMASyncState(
  instanceId: string = DEFAULT_UMA_INSTANCE_ID,
): Promise<StoredUMAState> {
  await ensureSchema();
  const normalizedInstanceId = normalizeInstanceId(instanceId);

  if (!hasDatabase()) {
    const mem = getMemoryUMAInstance(normalizedInstanceId);
    const assertions: Record<string, UMAAssertion> = {};
    for (const [id, a] of mem.umaAssertions.entries()) {
      assertions[id] = a;
    }
    const disputes: Record<string, UMADispute> = {};
    for (const [id, d] of mem.umaDisputes.entries()) {
      disputes[id] = d;
    }
    return {
      version: 1,
      chain: (mem.umaConfig?.chain as UMAChain) || 'Ethereum',
      ooV2Address: mem.umaConfig?.optimisticOracleV2Address || null,
      ooV3Address: mem.umaConfig?.optimisticOracleV3Address || null,
      lastProcessedBlock: mem.umaSync.lastProcessedBlock,
      sync: mem.umaSync.meta,
      assertions,
      disputes,
      latestBlock: mem.umaSync.latestBlock ?? null,
      safeBlock: mem.umaSync.safeBlock ?? null,
      lastSuccessProcessedBlock: mem.umaSync.lastSuccessProcessedBlock ?? null,
      consecutiveFailures: mem.umaSync.consecutiveFailures ?? 0,
      rpcActiveUrl: mem.umaSync.rpcActiveUrl ?? null,
      rpcStats: mem.umaSync.rpcStats ?? null,
    };
  }

  const [syncRes, configRes] = await Promise.all([
    query('SELECT * FROM uma_sync_state WHERE instance_id = $1', [normalizedInstanceId]),
    query('SELECT * FROM uma_oracle_config WHERE id = $1', [normalizedInstanceId]),
  ]);

  const syncRow = (syncRes.rows[0] || {}) as Record<string, unknown>;
  const configRow = (configRes.rows[0] || {}) as Record<string, unknown>;

  return {
    version: 1,
    chain: ((configRow.chain as UMAChain) || 'Ethereum') as UMAChain,
    ooV2Address: (configRow.optimistic_oracle_v2_address as string) || null,
    ooV3Address: (configRow.optimistic_oracle_v3_address as string) || null,
    lastProcessedBlock: toBigIntOr(syncRow.last_processed_block, 0n),
    sync: {
      lastAttemptAt: toIsoOrNull(syncRow.last_attempt_at),
      lastSuccessAt: toIsoOrNull(syncRow.last_success_at),
      lastDurationMs: toNullableNumber(syncRow.last_duration_ms),
      lastError: toNullableString(syncRow.last_error),
    },
    assertions: {},
    disputes: {},
    latestBlock: syncRow.latest_block !== null ? toBigIntOr(syncRow.latest_block, 0n) : null,
    safeBlock: syncRow.safe_block !== null ? toBigIntOr(syncRow.safe_block, 0n) : null,
    lastSuccessProcessedBlock:
      syncRow.last_success_processed_block !== null
        ? toBigIntOr(syncRow.last_success_processed_block, 0n)
        : null,
    consecutiveFailures: Number(toNullableNumber(syncRow.consecutive_failures) ?? 0),
    rpcActiveUrl: (syncRow.rpc_active_url as string | null) || null,
    rpcStats: syncRow.rpc_stats ?? null,
  };
}

export async function upsertUMAAssertion(
  a: UMAAssertion,
  instanceId: string = DEFAULT_UMA_INSTANCE_ID,
) {
  await ensureSchema();
  const normalizedInstanceId = normalizeInstanceId(instanceId);

  if (!hasDatabase()) {
    const mem = getMemoryUMAInstance(normalizedInstanceId);
    mem.umaAssertions.set(a.id, a);
    pruneMemoryAssertions(mem);
    return;
  }

  await query(
    `INSERT INTO uma_assertions (
      id, instance_id, chain, identifier, ancillary_data, proposer, proposed_value, reward,
      proposed_at, disputed_at, settled_at, settlement_value, status, bond, dispute_bond,
      tx_hash, block_number, log_index, version
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    ON CONFLICT (id) DO UPDATE SET
      instance_id = excluded.instance_id,
      status = excluded.status,
      disputed_at = excluded.disputed_at,
      settled_at = excluded.settled_at,
      settlement_value = excluded.settlement_value,
      dispute_bond = excluded.dispute_bond,
      block_number = excluded.block_number,
      log_index = excluded.log_index`,
    [
      a.id,
      normalizedInstanceId,
      a.chain,
      a.identifier,
      a.ancillaryData,
      a.proposer,
      a.proposedValue?.toString() || null,
      a.reward?.toString() || null,
      a.proposedAt,
      a.disputedAt || null,
      a.settledAt || null,
      a.settlementValue?.toString() || null,
      a.status,
      a.bond?.toString() || null,
      a.disputeBond?.toString() || null,
      a.txHash,
      a.blockNumber,
      a.logIndex,
      a.version,
    ],
  );
}

export async function upsertUMADispute(
  d: UMADispute,
  instanceId: string = DEFAULT_UMA_INSTANCE_ID,
) {
  await ensureSchema();
  const normalizedInstanceId = normalizeInstanceId(instanceId);

  if (!hasDatabase()) {
    const mem = getMemoryUMAInstance(normalizedInstanceId);
    mem.umaDisputes.set(d.id, d);
    pruneMemoryDisputes(mem);
    return;
  }

  await query(
    `INSERT INTO uma_disputes (
      id, instance_id, chain, assertion_id, identifier, ancillary_data, disputer, dispute_bond,
      disputed_at, voting_ends_at, status, current_votes_for, current_votes_against, total_votes,
      tx_hash, block_number, log_index, version
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    ON CONFLICT (id) DO UPDATE SET
      instance_id = excluded.instance_id,
      status = excluded.status,
      current_votes_for = excluded.current_votes_for,
      current_votes_against = excluded.current_votes_against,
      total_votes = excluded.total_votes,
      voting_ends_at = excluded.voting_ends_at,
      block_number = excluded.block_number,
      log_index = excluded.log_index`,
    [
      d.id,
      normalizedInstanceId,
      d.chain,
      d.assertionId,
      d.identifier || null,
      d.ancillaryData || null,
      d.disputer,
      d.disputeBond?.toString() || null,
      d.disputedAt,
      d.votingEndsAt,
      d.status,
      d.currentVotesFor,
      d.currentVotesAgainst,
      d.totalVotes,
      d.txHash,
      d.blockNumber,
      d.logIndex,
      d.version,
    ],
  );
}

export async function upsertUMAVote(v: UMAVote, instanceId: string = DEFAULT_UMA_INSTANCE_ID) {
  await ensureSchema();
  const normalizedInstanceId = normalizeInstanceId(instanceId);

  if (!hasDatabase()) {
    const mem = getMemoryUMAInstance(normalizedInstanceId);
    const key = `${v.txHash}:${v.logIndex}`;
    if (mem.umaVotes.has(key)) return;
    mem.umaVotes.set(key, v);
    return;
  }

  await query(
    `INSERT INTO uma_votes (instance_id, chain, assertion_id, voter, support, weight, tx_hash, block_number, log_index)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (tx_hash, log_index) DO NOTHING`,
    [
      normalizedInstanceId,
      v.chain,
      v.assertionId,
      v.voter,
      v.support,
      v.weight?.toString() || '0',
      v.txHash,
      v.blockNumber,
      v.logIndex,
    ],
  );
}

export async function updateUMASyncState(
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
  instanceId: string = DEFAULT_UMA_INSTANCE_ID,
) {
  await ensureSchema();
  const normalizedInstanceId = normalizeInstanceId(instanceId);

  if (!hasDatabase()) {
    const mem = getMemoryUMAInstance(normalizedInstanceId);
    mem.umaSync.lastProcessedBlock = block;
    if (extra?.latestBlock !== undefined) mem.umaSync.latestBlock = extra.latestBlock;
    if (extra?.safeBlock !== undefined) mem.umaSync.safeBlock = extra.safeBlock;
    if (extra?.lastSuccessProcessedBlock !== undefined)
      mem.umaSync.lastSuccessProcessedBlock = extra.lastSuccessProcessedBlock;
    if (extra?.consecutiveFailures !== undefined)
      mem.umaSync.consecutiveFailures = extra.consecutiveFailures;
    if (extra?.rpcActiveUrl !== undefined) mem.umaSync.rpcActiveUrl = extra.rpcActiveUrl;
    if (extra?.rpcStats !== undefined) mem.umaSync.rpcStats = extra.rpcStats;
    mem.umaSync.meta = {
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
    `INSERT INTO uma_sync_state (
      instance_id, last_processed_block, latest_block, safe_block, last_success_processed_block,
      consecutive_failures, rpc_active_url, rpc_stats, last_attempt_at, last_success_at, last_duration_ms, last_error
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (instance_id) DO UPDATE SET
      last_processed_block = excluded.last_processed_block,
      latest_block = COALESCE(excluded.latest_block, uma_sync_state.latest_block),
      safe_block = COALESCE(excluded.safe_block, uma_sync_state.safe_block),
      last_success_processed_block = COALESCE(excluded.last_success_processed_block, uma_sync_state.last_success_processed_block),
      consecutive_failures = COALESCE(excluded.consecutive_failures, uma_sync_state.consecutive_failures),
      rpc_active_url = COALESCE(excluded.rpc_active_url, uma_sync_state.rpc_active_url),
      rpc_stats = COALESCE(excluded.rpc_stats, uma_sync_state.rpc_stats),
      last_attempt_at = excluded.last_attempt_at,
      last_success_at = excluded.last_success_at,
      last_duration_ms = excluded.last_duration_ms,
      last_error = excluded.last_error`,
    [
      normalizedInstanceId,
      block.toString(),
      latest?.toString() || null,
      safe?.toString() || null,
      lastSuccessProcessed?.toString() || null,
      consecutiveFailures ?? null,
      rpcActiveUrl ?? null,
      rpcStatsJson,
      attemptAt,
      successAt,
      duration,
      error,
    ],
  );
}

export async function fetchUMAAssertion(
  id: string,
  instanceId: string = DEFAULT_UMA_INSTANCE_ID,
): Promise<UMAAssertion | null> {
  await ensureSchema();
  const normalizedInstanceId = normalizeInstanceId(instanceId);

  if (!hasDatabase()) {
    const mem = getMemoryUMAInstance(normalizedInstanceId);
    return mem.umaAssertions.get(id) || null;
  }

  const res = await query('SELECT * FROM uma_assertions WHERE id = $1 AND instance_id = $2', [
    id,
    normalizedInstanceId,
  ]);

  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  return {
    id: row.id as string,
    chain: row.chain as UMAChain,
    identifier: row.identifier as string,
    ancillaryData: row.ancillary_data as string,
    proposer: row.proposer as string,
    proposedValue: row.proposed_value ? BigInt(row.proposed_value as string) : undefined,
    reward: row.reward ? BigInt(row.reward as string) : undefined,
    proposedAt: row.proposed_at as string,
    disputedAt: (row.disputed_at as string) || undefined,
    settledAt: (row.settled_at as string) || undefined,
    settlementValue: row.settlement_value ? BigInt(row.settlement_value as string) : undefined,
    status: row.status as UMAAssertion['status'],
    bond: row.bond ? BigInt(row.bond as string) : undefined,
    disputeBond: row.dispute_bond ? BigInt(row.dispute_bond as string) : undefined,
    txHash: row.tx_hash as string,
    blockNumber: String(row.block_number),
    logIndex: Number(row.log_index),
    version: row.version as 'v2' | 'v3',
  };
}

export async function fetchUMADispute(
  id: string,
  instanceId: string = DEFAULT_UMA_INSTANCE_ID,
): Promise<UMADispute | null> {
  await ensureSchema();
  const normalizedInstanceId = normalizeInstanceId(instanceId);

  if (!hasDatabase()) {
    const mem = getMemoryUMAInstance(normalizedInstanceId);
    return mem.umaDisputes.get(id) || null;
  }

  const res = await query('SELECT * FROM uma_disputes WHERE id = $1 AND instance_id = $2', [
    id,
    normalizedInstanceId,
  ]);

  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  return {
    id: row.id as string,
    chain: row.chain as UMAChain,
    assertionId: row.assertion_id as string,
    identifier: (row.identifier as string) || '',
    ancillaryData: (row.ancillary_data as string) || '',
    disputer: row.disputer as string,
    disputeBond: BigInt(row.dispute_bond as string),
    disputedAt: row.disputed_at as string,
    votingEndsAt: row.voting_ends_at as string,
    status: row.status as UMADispute['status'],
    currentVotesFor: Number(row.current_votes_for),
    currentVotesAgainst: Number(row.current_votes_against),
    totalVotes: Number(row.total_votes),
    txHash: row.tx_hash as string,
    blockNumber: String(row.block_number),
    logIndex: Number(row.log_index),
    version: row.version as 'v2' | 'v3',
  };
}

export async function listUMAAssertions(params: {
  instanceId?: string;
  status?: UMAAssertion['status'];
  identifier?: string;
  limit?: number;
  offset?: number;
}): Promise<{ assertions: UMAAssertion[]; total: number }> {
  await ensureSchema();
  const normalizedInstanceId = normalizeInstanceId(params.instanceId);
  const limit = Math.min(100, Math.max(1, params.limit ?? 50));
  const offset = params.offset ?? 0;

  if (!hasDatabase()) {
    const mem = getMemoryUMAInstance(normalizedInstanceId);
    let assertions = Array.from(mem.umaAssertions.values());
    if (params.status) assertions = assertions.filter((a) => a.status === params.status);
    if (params.identifier)
      assertions = assertions.filter((a) => a.identifier.includes(params.identifier!));
    const total = assertions.length;
    assertions = assertions
      .sort((a, b) => new Date(b.proposedAt).getTime() - new Date(a.proposedAt).getTime())
      .slice(offset, offset + limit);
    return { assertions, total };
  }

  let whereClause = 'instance_id = $1';
  const paramsArray: Array<string | number | boolean | null | undefined> = [normalizedInstanceId];
  let paramIndex = 2;

  if (params.status) {
    whereClause += ` AND status = $${paramIndex}`;
    paramsArray.push(params.status);
    paramIndex++;
  }

  if (params.identifier) {
    whereClause += ` AND identifier LIKE $${paramIndex}`;
    paramsArray.push(`%${params.identifier}%`);
    paramIndex++;
  }

  const countRes = await query(
    `SELECT COUNT(*) as total FROM uma_assertions WHERE ${whereClause}`,
    paramsArray,
  );
  const total = Number((countRes.rows[0] as Record<string, unknown> | undefined)?.total ?? 0);

  const res = await query(
    `SELECT * FROM uma_assertions WHERE ${whereClause} ORDER BY proposed_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...paramsArray, limit, offset],
  );

  const assertions: UMAAssertion[] = (res.rows as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    chain: row.chain as UMAChain,
    identifier: row.identifier as string,
    ancillaryData: row.ancillary_data as string,
    proposer: row.proposer as string,
    proposedValue: row.proposed_value ? BigInt(row.proposed_value as string) : undefined,
    reward: row.reward ? BigInt(row.reward as string) : undefined,
    proposedAt: row.proposed_at as string,
    disputedAt: (row.disputed_at as string) || undefined,
    settledAt: (row.settled_at as string) || undefined,
    settlementValue: row.settlement_value ? BigInt(row.settlement_value as string) : undefined,
    status: row.status as UMAAssertion['status'],
    bond: row.bond ? BigInt(row.bond as string) : undefined,
    disputeBond: row.dispute_bond ? BigInt(row.dispute_bond as string) : undefined,
    txHash: row.tx_hash as string,
    blockNumber: String(row.block_number),
    logIndex: Number(row.log_index),
    version: row.version as 'v2' | 'v3',
  }));

  return { assertions, total };
}

export async function listUMADisputes(params: {
  instanceId?: string;
  status?: UMADispute['status'];
  limit?: number;
  offset?: number;
}): Promise<{ disputes: UMADispute[]; total: number }> {
  await ensureSchema();
  const normalizedInstanceId = normalizeInstanceId(params.instanceId);
  const limit = Math.min(100, Math.max(1, params.limit ?? 50));
  const offset = params.offset ?? 0;

  if (!hasDatabase()) {
    const mem = getMemoryUMAInstance(normalizedInstanceId);
    let disputes = Array.from(mem.umaDisputes.values());
    if (params.status) disputes = disputes.filter((d) => d.status === params.status);
    const total = disputes.length;
    disputes = disputes
      .sort((a, b) => new Date(b.disputedAt).getTime() - new Date(a.disputedAt).getTime())
      .slice(offset, offset + limit);
    return { disputes, total };
  }

  let whereClause = 'instance_id = $1';
  const paramsArray: Array<string | number | boolean | null | undefined> = [normalizedInstanceId];
  let paramIndex = 2;

  if (params.status) {
    whereClause += ` AND status = $${paramIndex}`;
    paramsArray.push(params.status);
    paramIndex++;
  }

  const countRes = await query(
    `SELECT COUNT(*) as total FROM uma_disputes WHERE ${whereClause}`,
    paramsArray,
  );
  const total = Number((countRes.rows[0] as Record<string, unknown> | undefined)?.total ?? 0);

  const res = await query(
    `SELECT * FROM uma_disputes WHERE ${whereClause} ORDER BY disputed_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...paramsArray, limit, offset],
  );

  const disputes: UMADispute[] = (res.rows as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    chain: row.chain as UMAChain,
    assertionId: row.assertion_id as string,
    identifier: (row.identifier as string) || '',
    ancillaryData: (row.ancillary_data as string) || '',
    disputer: row.disputer as string,
    disputeBond: BigInt(row.dispute_bond as string),
    disputedAt: row.disputed_at as string,
    votingEndsAt: row.voting_ends_at as string,
    status: row.status as UMADispute['status'],
    currentVotesFor: Number(row.current_votes_for),
    currentVotesAgainst: Number(row.current_votes_against),
    totalVotes: Number(row.total_votes),
    txHash: row.tx_hash as string,
    blockNumber: String(row.block_number),
    logIndex: Number(row.log_index),
    version: row.version as 'v2' | 'v3',
  }));

  return { disputes, total };
}

export async function fetchUMAVote(
  txHash: string,
  logIndex: number,
  instanceId: string = DEFAULT_UMA_INSTANCE_ID,
): Promise<UMAVote | null> {
  await ensureSchema();
  const normalizedInstanceId = normalizeInstanceId(instanceId);

  if (!hasDatabase()) {
    const mem = getMemoryUMAInstance(normalizedInstanceId);
    const key = `${txHash}:${logIndex}`;
    return mem.umaVotes.get(key) || null;
  }

  const res = await query(
    'SELECT * FROM uma_votes WHERE tx_hash = $1 AND log_index = $2 AND instance_id = $3',
    [txHash, logIndex, normalizedInstanceId],
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  return {
    chain: row.chain as UMAChain,
    assertionId: row.assertion_id as string,
    voter: row.voter as string,
    support: row.support as boolean,
    weight: row.weight ? BigInt(row.weight as string) : undefined,
    txHash: row.tx_hash as string,
    blockNumber: String(row.block_number),
    logIndex: Number(row.log_index),
  };
}

export async function listUMAVotes(params: {
  instanceId?: string;
  assertionId?: string;
  voter?: string;
  limit?: number;
  offset?: number;
}): Promise<{ votes: UMAVote[]; total: number }> {
  await ensureSchema();
  const normalizedInstanceId = normalizeInstanceId(params.instanceId);
  const limit = Math.min(100, Math.max(1, params.limit ?? 50));
  const offset = params.offset ?? 0;

  if (!hasDatabase()) {
    const mem = getMemoryUMAInstance(normalizedInstanceId);
    let votes = Array.from(mem.umaVotes.values());
    if (params.assertionId) votes = votes.filter((v) => v.assertionId === params.assertionId);
    if (params.voter)
      votes = votes.filter((v) => v.voter.toLowerCase() === params.voter!.toLowerCase());
    const total = votes.length;
    votes = votes
      .sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber))
      .slice(offset, offset + limit);
    return { votes, total };
  }

  let whereClause = 'instance_id = $1';
  const paramsArray: Array<string | number | boolean | null | undefined> = [normalizedInstanceId];
  let paramIndex = 2;

  if (params.assertionId) {
    whereClause += ` AND assertion_id = $${paramIndex}`;
    paramsArray.push(params.assertionId);
    paramIndex++;
  }

  if (params.voter) {
    whereClause += ` AND voter = $${paramIndex}`;
    paramsArray.push(params.voter);
    paramIndex++;
  }

  const countRes = await query(
    `SELECT COUNT(*) as total FROM uma_votes WHERE ${whereClause}`,
    paramsArray,
  );
  const total = Number((countRes.rows[0] as Record<string, unknown> | undefined)?.total ?? 0);

  const res = await query(
    `SELECT * FROM uma_votes WHERE ${whereClause} ORDER BY block_number DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...paramsArray, limit, offset],
  );

  const votes: UMAVote[] = (res.rows as Array<Record<string, unknown>>).map((row) => ({
    chain: row.chain as UMAChain,
    assertionId: row.assertion_id as string,
    voter: row.voter as string,
    support: row.support as boolean,
    weight: row.weight ? BigInt(row.weight as string) : undefined,
    txHash: row.tx_hash as string,
    blockNumber: String(row.block_number),
    logIndex: Number(row.log_index),
  }));

  return { votes, total };
}

export async function getUMAUserStats(
  address: string,
  instanceId: string = DEFAULT_UMA_INSTANCE_ID,
) {
  await ensureSchema();
  const normalizedInstanceId = normalizeInstanceId(instanceId);
  const addr = address.toLowerCase();

  const assertionsResult = await listUMAAssertions({
    instanceId: normalizedInstanceId,
    limit: 10000,
  });
  const disputesResult = listUMADisputes
    ? await listUMADisputes({ instanceId: normalizedInstanceId, limit: 10000 })
    : { disputes: [] as UMADispute[], total: 0 };
  const votesResult = await listUMAVotes({ instanceId: normalizedInstanceId, voter: addr });

  const userAssertions = assertionsResult.assertions.filter(
    (a) => a.proposer.toLowerCase() === addr,
  );
  const userDisputes = disputesResult.disputes.filter((d) => d.disputer.toLowerCase() === addr);
  const userVotes = votesResult.votes;

  const totalProposed = userAssertions.length;
  const totalDisputed = userDisputes.length;
  const totalVoted = userVotes.length;

  const settledAssertions = userAssertions.filter((a) => a.status === 'Settled');
  const wonAssertions = settledAssertions.filter(
    (a) => a.settlementValue !== undefined && a.settlementValue > 0n,
  );
  const wonDisputes = userDisputes.filter((d) => d.status === 'Executed');

  const totalBondProposed = userAssertions.reduce((sum, a) => sum + (a.bond ?? 0n), 0n);
  const totalBondDisputed = userDisputes.reduce((sum, d) => sum + d.disputeBond, 0n);

  const volumeProposed = userAssertions.reduce((sum, a) => sum + (a.proposedValue ?? 0n), 0n);
  const volumeSettled = settledAssertions.reduce((sum, a) => sum + (a.settlementValue ?? 0n), 0n);

  const winRateAssertions =
    settledAssertions.length > 0 ? Number(wonAssertions.length) / settledAssertions.length : null;
  const winRateDisputes =
    userDisputes.length > 0 ? Number(wonDisputes.length) / userDisputes.length : null;

  return {
    address,
    totalProposed,
    totalDisputed,
    totalVoted,
    wonAssertions: wonAssertions.length,
    lostAssertions: settledAssertions.length - wonAssertions.length,
    wonDisputes: wonDisputes.length,
    lostDisputes: userDisputes.length - wonDisputes.length,
    winRateAssertions,
    winRateDisputes,
    totalBondProposed: totalBondProposed.toString(),
    totalBondDisputed: totalBondDisputed.toString(),
    volumeProposed: volumeProposed.toString(),
    volumeSettled: volumeSettled.toString(),
  };
}

export async function getUMALeaderboard(params: {
  instanceId?: string;
  metric?: 'proposals' | 'disputes' | 'votes' | 'bond';
  limit?: number;
}) {
  await ensureSchema();
  const normalizedInstanceId = normalizeInstanceId(params.instanceId);
  const limit = Math.min(50, Math.max(1, params.limit ?? 10));

  const assertionsResult = await listUMAAssertions({
    instanceId: normalizedInstanceId,
    limit: 10000,
  });
  const disputesResult = listUMADisputes
    ? await listUMADisputes({ instanceId: normalizedInstanceId, limit: 10000 })
    : { disputes: [] as UMADispute[], total: 0 };
  const votesResult = await listUMAVotes({ instanceId: normalizedInstanceId, limit: 10000 });

  const proposerStats = new Map<string, { count: number; bond: bigint; won: number }>();
  const disputerStats = new Map<string, { count: number; bond: bigint; won: number }>();
  const voterStats = new Map<string, { count: number; weight: bigint }>();

  for (const a of assertionsResult.assertions) {
    const addr = a.proposer.toLowerCase();
    const existing = proposerStats.get(addr) || { count: 0, bond: 0n, won: 0 };
    existing.count++;
    existing.bond += a.bond ?? 0n;
    if (a.status === 'Settled' && a.settlementValue !== undefined && a.settlementValue > 0n) {
      existing.won++;
    }
    proposerStats.set(addr, existing);
  }

  for (const d of disputesResult.disputes) {
    const addr = d.disputer.toLowerCase();
    const existing = disputerStats.get(addr) || { count: 0, bond: 0n, won: 0 };
    existing.count++;
    existing.bond += d.disputeBond;
    if (d.status === 'Executed') {
      existing.won++;
    }
    disputerStats.set(addr, existing);
  }

  for (const v of votesResult.votes) {
    const addr = v.voter.toLowerCase();
    const existing = voterStats.get(addr) || { count: 0, weight: 0n };
    existing.count++;
    existing.weight += v.weight ?? 0n;
    voterStats.set(addr, existing);
  }

  const getProposers = () =>
    Array.from(proposerStats.entries())
      .map(([address, stats]) => ({
        address,
        count: stats.count,
        bond: stats.bond.toString(),
        won: stats.won,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

  const getDisputers = () =>
    Array.from(disputerStats.entries())
      .map(([address, stats]) => ({
        address,
        count: stats.count,
        bond: stats.bond.toString(),
        won: stats.won,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

  const getVoters = () =>
    Array.from(voterStats.entries())
      .map(([address, stats]) => ({ address, count: stats.count, weight: stats.weight.toString() }))
      .sort((a, b) => Number(b.weight) - Number(a.weight))
      .slice(0, limit);

  const metric = params.metric ?? 'proposals';
  let top;
  switch (metric) {
    case 'disputes':
      top = getDisputers();
      break;
    case 'votes':
      top = getVoters();
      break;
    case 'bond':
      top = Array.from(proposerStats.entries())
        .map(([address, stats]) => ({
          address,
          count: stats.count,
          bond: stats.bond.toString(),
          won: stats.won,
        }))
        .sort((a, b) => Number(b.bond) - Number(a.bond))
        .slice(0, limit);
      break;
    default:
      top = getProposers();
  }

  return {
    metric,
    top,
    generatedAt: new Date().toISOString(),
  };
}
