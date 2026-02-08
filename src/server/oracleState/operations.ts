/**
 * Oracle State 核心操作模块
 *
 * 提供断言、争议、投票等核心数据操作的 CRUD 功能
 */

import crypto from 'node:crypto';

import type { Assertion, Dispute, OracleChain } from '@/lib/types/oracleTypes';

import { hasDatabase, query, getClient } from '../db';
import { getMemoryInstance } from '../memoryBackend';
import { ensureSchema } from '../schema';
import { STATE_VERSION, BATCH_SIZE, MAX_SYNC_METRICS } from './constants';
import { DEFAULT_ORACLE_INSTANCE_ID } from '../oracleConfig';
import { pruneMemoryAssertions, pruneMemoryDisputes, applyVoteSumsDelta } from './memory';
import {
  normalizeInstanceId,
  toBigIntOr,
  toIsoOrNull,
  toNullableNumber,
  toNullableString,
  bigintToSafeNumber,
  computeDisputeStatus,
} from './utils';

import type {
  StoredState,
  SyncState,
  VoteEventInput,
  OracleEventInput,
  SyncMetricInput,
  SyncMetricOutput,
} from './types';

// 模块级状态
let schemaEnsured = false;

/**
 * 确保数据库 schema 已初始化
 * 仅在首次访问数据库时执行
 */
async function ensureDb(): Promise<void> {
  if (!hasDatabase()) return;
  if (!schemaEnsured) {
    await ensureSchema();
    schemaEnsured = true;
  }
}

// ==================== 读取操作 ====================

/**
 * 读取完整的 Oracle 状态
 * 包含断言、争议和同步元数据
 * @param instanceId - 实例 ID
 * @returns 完整的存储状态
 */
export async function readOracleState(
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<StoredState> {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId, DEFAULT_ORACLE_INSTANCE_ID);

  // 内存模式：直接从内存实例读取
  if (!hasDatabase()) {
    const mem = getMemoryInstance(normalizedInstanceId);
    const assertions: Record<string, Assertion> = {};
    for (const [id, a] of mem.assertions.entries()) {
      assertions[id] = a;
    }
    const disputes: Record<string, Dispute> = {};
    for (const [id, d] of mem.disputes.entries()) {
      disputes[id] = d;
    }
    return {
      version: STATE_VERSION,
      chain: mem.oracleConfig.chain,
      contractAddress: mem.oracleConfig.contractAddress || null,
      lastProcessedBlock: mem.sync.lastProcessedBlock,
      sync: mem.sync.meta,
      assertions,
      disputes,
    };
  }

  // 数据库模式：使用 CTE 一次性查询所有数据
  const combinedRes = await query<{
    last_processed_block: unknown;
    last_attempt_at: unknown;
    last_success_at: unknown;
    last_duration_ms: unknown;
    last_error: unknown;
    chain: unknown;
    contract_address: unknown;
    assertions_json: string;
    disputes_json: string;
  }>(
    `
    WITH instance_config AS (
      SELECT chain, contract_address 
      FROM oracle_instances 
      WHERE id = $1
      UNION ALL
      SELECT chain, contract_address 
      FROM oracle_config 
      WHERE id = 1 
        AND $1 = '${DEFAULT_ORACLE_INSTANCE_ID}'
        AND NOT EXISTS (SELECT 1 FROM oracle_instances WHERE id = $1)
      LIMIT 1
    ),
    sync_data AS (
      SELECT 
        last_processed_block,
        last_attempt_at,
        last_success_at,
        last_duration_ms,
        last_error
      FROM oracle_sync_state 
      WHERE instance_id = $1
    ),
    assertions_agg AS (
      SELECT COALESCE(json_agg(a.*), '[]'::json) as assertions_json
      FROM assertions a
      WHERE a.instance_id = $1
    ),
    disputes_agg AS (
      SELECT COALESCE(json_agg(d.*), '[]'::json) as disputes_json
      FROM disputes d
      WHERE d.instance_id = $1
    )
    SELECT 
      s.last_processed_block,
      s.last_attempt_at,
      s.last_success_at,
      s.last_duration_ms,
      s.last_error,
      ic.chain,
      ic.contract_address,
      aa.assertions_json,
      da.disputes_json
    FROM sync_data s
    CROSS JOIN instance_config ic
    CROSS JOIN assertions_agg aa
    CROSS JOIN disputes_agg da
  `,
    [normalizedInstanceId],
  );

  const row = combinedRes.rows[0];

  // 解析断言数据
  const assertions: Record<string, Assertion> = {};
  try {
    const assertionsData = JSON.parse(row?.assertions_json || '[]') as {
      id: string;
      chain: OracleChain;
      asserter: string;
      protocol: string;
      market: string;
      assertion_data: string;
      asserted_at: string;
      liveness_ends_at: string;
      block_number: number | null;
      log_index: number | null;
      resolved_at: string | null;
      settlement_resolution: boolean | null;
      status: string;
      bond_usd: number;
      disputer: string | null;
      tx_hash: string;
    }[];
    for (const assertionRow of assertionsData) {
      assertions[assertionRow.id] = {
        id: assertionRow.id,
        chain: assertionRow.chain,
        asserter: assertionRow.asserter,
        protocol: assertionRow.protocol,
        market: assertionRow.market,
        assertion: assertionRow.assertion_data,
        assertedAt: assertionRow.asserted_at,
        livenessEndsAt: assertionRow.liveness_ends_at,
        blockNumber: assertionRow.block_number?.toString(),
        logIndex: assertionRow.log_index ?? undefined,
        resolvedAt: assertionRow.resolved_at ?? undefined,
        settlementResolution: assertionRow.settlement_resolution ?? undefined,
        status: assertionRow.status as Assertion['status'],
        bondUsd: assertionRow.bond_usd,
        disputer: assertionRow.disputer ?? undefined,
        txHash: assertionRow.tx_hash,
      };
    }
  } catch {
    // JSON 解析失败时返回空断言
  }

  // 解析争议数据
  const disputes: Record<string, Dispute> = {};
  try {
    const disputesData = JSON.parse(row?.disputes_json || '[]') as {
      id: string;
      chain: OracleChain;
      assertion_id: string;
      market: string;
      reason: string;
      disputer: string;
      disputed_at: string;
      voting_ends_at: string | null;
      tx_hash: string | null;
      block_number: number | null;
      log_index: number | null;
      status: string;
      votes_for: number;
      votes_against: number;
      total_votes: number;
    }[];
    for (const disputeRow of disputesData) {
      const votingEndsAt = disputeRow.voting_ends_at;
      const status = computeDisputeStatus(
        disputeRow.status as Dispute['status'],
        votingEndsAt ?? undefined,
      );

      disputes[disputeRow.id] = {
        id: disputeRow.id,
        chain: disputeRow.chain,
        assertionId: disputeRow.assertion_id,
        market: disputeRow.market,
        disputeReason: disputeRow.reason,
        disputer: disputeRow.disputer,
        disputedAt: disputeRow.disputed_at,
        votingEndsAt: votingEndsAt || '',
        txHash: disputeRow.tx_hash ?? undefined,
        blockNumber: disputeRow.block_number?.toString(),
        logIndex: disputeRow.log_index ?? undefined,
        status,
        currentVotesFor: disputeRow.votes_for,
        currentVotesAgainst: disputeRow.votes_against,
        totalVotes: disputeRow.total_votes,
      };
    }
  } catch {
    // JSON 解析失败时返回空争议
  }

  return {
    version: STATE_VERSION,
    chain: (row?.chain as OracleChain) || 'Local',
    contractAddress: (row?.contract_address as string | null) || null,
    lastProcessedBlock: toBigIntOr(row?.last_processed_block, 0n),
    sync: {
      lastAttemptAt: toIsoOrNull(row?.last_attempt_at),
      lastSuccessAt: toIsoOrNull(row?.last_success_at),
      lastDurationMs: toNullableNumber(row?.last_duration_ms),
      lastError: toNullableString(row?.last_error),
    },
    assertions,
    disputes,
  };
}

/**
 * 获取同步状态
 * @param instanceId - 实例 ID
 * @returns 同步状态详情
 */
export async function getSyncState(
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<SyncState> {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId, DEFAULT_ORACLE_INSTANCE_ID);

  // 内存模式
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
      owner: null,
    };
  }

  // 数据库模式
  const [syncRes, instanceRes, legacyConfigRes] = await Promise.all([
    query('SELECT * FROM oracle_sync_state WHERE instance_id = $1', [normalizedInstanceId]),
    query('SELECT chain, contract_address FROM oracle_instances WHERE id = $1', [
      normalizedInstanceId,
    ]),
    normalizedInstanceId === DEFAULT_ORACLE_INSTANCE_ID
      ? query('SELECT chain, contract_address FROM oracle_config WHERE id = 1')
      : Promise.resolve({ rows: [] } as { rows: unknown[] }),
  ]);

  const syncRow = (syncRes.rows[0] || {}) as Record<string, unknown>;
  const configRow = (instanceRes.rows[0] || legacyConfigRes.rows[0] || {}) as Record<
    string,
    unknown
  >;

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
    consecutiveFailures: Number(toNullableNumber(syncRow.consecutive_failures) ?? 0),
    rpcActiveUrl: (syncRow.rpc_active_url as string | null | undefined) ?? null,
    rpcStats: syncRow.rpc_stats ?? null,
    sync: {
      lastAttemptAt: toIsoOrNull(syncRow.last_attempt_at),
      lastSuccessAt: toIsoOrNull(syncRow.last_success_at),
      lastDurationMs: toNullableNumber(syncRow.last_duration_ms),
      lastError: toNullableString(syncRow.last_error),
    },
    chain: (configRow.chain as OracleChain) || 'Local',
    contractAddress: (configRow.contract_address as string | null) || null,
    owner: null,
  };
}

/**
 * 获取单个断言
 * @param id - 断言 ID
 * @param instanceId - 实例 ID
 * @returns 断言对象或 null
 */
export async function fetchAssertion(
  id: string,
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<Assertion | null> {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId, DEFAULT_ORACLE_INSTANCE_ID);

  if (!hasDatabase()) {
    const mem = getMemoryInstance(normalizedInstanceId);
    return mem.assertions.get(id) ?? null;
  }

  const res = await query<{
    id: string;
    chain: OracleChain;
    asserter: string;
    protocol: string;
    market: string;
    assertion_data: string;
    asserted_at: Date;
    liveness_ends_at: Date;
    block_number: number | null;
    log_index: number | null;
    resolved_at: Date | null;
    settlement_resolution: boolean | null;
    status: string;
    bond_usd: number;
    disputer: string | null;
    tx_hash: string;
  }>('SELECT * FROM assertions WHERE id = $1 AND instance_id = $2', [id, normalizedInstanceId]);

  const row = res.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    chain: row.chain,
    asserter: row.asserter,
    protocol: row.protocol,
    market: row.market,
    assertion: row.assertion_data,
    assertedAt: row.asserted_at.toISOString(),
    livenessEndsAt: row.liveness_ends_at.toISOString(),
    blockNumber: row.block_number?.toString(),
    logIndex: row.log_index ?? undefined,
    resolvedAt: row.resolved_at?.toISOString(),
    settlementResolution: row.settlement_resolution ?? undefined,
    status: row.status as Assertion['status'],
    bondUsd: Number(row.bond_usd),
    disputer: row.disputer ?? undefined,
    txHash: row.tx_hash,
  };
}

/**
 * 获取单个争议
 * @param id - 争议 ID
 * @param instanceId - 实例 ID
 * @returns 争议对象或 null
 */
export async function fetchDispute(
  id: string,
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<Dispute | null> {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId, DEFAULT_ORACLE_INSTANCE_ID);

  if (!hasDatabase()) {
    const mem = getMemoryInstance(normalizedInstanceId);
    return mem.disputes.get(id) ?? null;
  }

  const res = await query<{
    id: string;
    chain: OracleChain;
    assertion_id: string;
    market: string;
    reason: string;
    disputer: string;
    disputed_at: Date;
    voting_ends_at: Date | null;
    tx_hash: string | null;
    block_number: number | null;
    log_index: number | null;
    status: string;
    votes_for: number;
    votes_against: number;
    total_votes: number;
  }>('SELECT * FROM disputes WHERE id = $1 AND instance_id = $2', [id, normalizedInstanceId]);

  const row = res.rows[0];
  if (!row) return null;

  const votingEndsAt = row.voting_ends_at?.toISOString();
  const status = computeDisputeStatus(row.status as Dispute['status'], votingEndsAt ?? undefined);

  return {
    id: row.id,
    chain: row.chain,
    assertionId: row.assertion_id,
    market: row.market,
    disputeReason: row.reason,
    disputer: row.disputer,
    disputedAt: row.disputed_at.toISOString(),
    votingEndsAt: votingEndsAt || '',
    txHash: row.tx_hash ?? undefined,
    blockNumber: row.block_number?.toString(),
    logIndex: row.log_index ?? undefined,
    status,
    currentVotesFor: row.votes_for,
    currentVotesAgainst: row.votes_against,
    totalVotes: row.total_votes,
  };
}

// ==================== 写入操作 ====================

/**
 * 插入或更新断言
 * @param a - 断言对象
 * @param instanceId - 实例 ID
 */
export async function upsertAssertion(
  a: Assertion,
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<void> {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId, DEFAULT_ORACLE_INSTANCE_ID);

  // 内存模式
  if (!hasDatabase()) {
    const mem = getMemoryInstance(normalizedInstanceId);
    mem.assertions.set(a.id, a);
    pruneMemoryAssertions(mem);
    return;
  }

  // 数据库模式
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

/**
 * 插入或更新争议
 * @param d - 争议对象
 * @param instanceId - 实例 ID
 */
export async function upsertDispute(
  d: Dispute,
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<void> {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId, DEFAULT_ORACLE_INSTANCE_ID);

  // 内存模式
  if (!hasDatabase()) {
    const mem = getMemoryInstance(normalizedInstanceId);
    mem.disputes.set(d.id, d);
    if (d.status === 'Executed') {
      mem.voteSums.delete(d.assertionId);
      for (const [key, v] of mem.votes.entries()) {
        if (v.assertionId === d.assertionId) mem.votes.delete(key);
      }
    }
    pruneMemoryDisputes(mem);
    return;
  }

  // 数据库模式
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

/**
 * 批量插入断言
 * @param assertions - 断言数组
 * @param instanceId - 实例 ID
 * @returns 实际插入的数量
 */
export async function upsertAssertionsBatch(
  assertions: Assertion[],
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<number> {
  if (assertions.length === 0) return 0;

  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId, DEFAULT_ORACLE_INSTANCE_ID);

  // 内存模式
  if (!hasDatabase()) {
    const mem = getMemoryInstance(normalizedInstanceId);
    for (const a of assertions) {
      mem.assertions.set(a.id, a);
    }
    pruneMemoryAssertions(mem);
    return assertions.length;
  }

  // 数据库模式：使用事务包裹所有批次
  const client = await getClient();
  let totalInserted = 0;

  try {
    await client.query('BEGIN');

    for (let i = 0; i < assertions.length; i += BATCH_SIZE) {
      const batch = assertions.slice(i, i + BATCH_SIZE);
      const values: (string | number | boolean | null)[] = [];
      const placeholders: string[] = [];

      for (let j = 0; j < batch.length; j++) {
        const a = batch[j];
        if (!a) continue;
        const offset = j * 17;
        placeholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17})`,
        );

        values.push(
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
        );
      }

      await client.query(
        `INSERT INTO assertions (
          id, instance_id, chain, asserter, protocol, market, assertion_data, asserted_at, liveness_ends_at, block_number, log_index, resolved_at, settlement_resolution, status, bond_usd, disputer, tx_hash
        ) VALUES ${placeholders.join(', ')}
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
        values,
      );

      totalInserted += batch.length;
    }

    await client.query('COMMIT');
    return totalInserted;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 批量插入争议
 * @param disputes - 争议数组
 * @param instanceId - 实例 ID
 * @returns 实际插入的数量
 */
export async function upsertDisputesBatch(
  disputes: Dispute[],
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<number> {
  if (disputes.length === 0) return 0;

  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId, DEFAULT_ORACLE_INSTANCE_ID);

  // 内存模式
  if (!hasDatabase()) {
    const mem = getMemoryInstance(normalizedInstanceId);
    for (const d of disputes) {
      mem.disputes.set(d.id, d);
    }
    pruneMemoryDisputes(mem);
    return disputes.length;
  }

  // 数据库模式：分批处理
  let totalInserted = 0;

  for (let i = 0; i < disputes.length; i += BATCH_SIZE) {
    const batch = disputes.slice(i, i + BATCH_SIZE);
    const values: (string | number | null)[] = [];
    const placeholders: string[] = [];

    for (let j = 0; j < batch.length; j++) {
      const d = batch[j];
      if (!d) continue;
      const offset = j * 16;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16})`,
      );

      values.push(
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
      );
    }

    await query(
      `INSERT INTO disputes (
        id, instance_id, chain, assertion_id, market, reason, disputer, disputed_at, voting_ends_at, tx_hash, block_number, log_index, status, votes_for, votes_against, total_votes
      ) VALUES ${placeholders.join(', ')}
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
      values,
    );

    totalInserted += batch.length;
  }

  return totalInserted;
}

// ==================== 同步和指标 ====================

/**
 * 更新同步状态
 * @param block - 已处理的区块
 * @param attemptAt - 尝试时间
 * @param successAt - 成功时间
 * @param duration - 持续时间
 * @param error - 错误信息
 * @param extra - 额外信息
 * @param instanceId - 实例 ID
 */
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
): Promise<void> {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId, DEFAULT_ORACLE_INSTANCE_ID);

  // 内存模式
  if (!hasDatabase()) {
    const mem = getMemoryInstance(normalizedInstanceId);
    mem.sync.lastProcessedBlock = block;
    if (extra?.latestBlock !== undefined) mem.sync.latestBlock = extra.latestBlock;
    if (extra?.safeBlock !== undefined) mem.sync.safeBlock = extra.safeBlock;
    if (extra?.lastSuccessProcessedBlock !== undefined)
      mem.sync.lastSuccessProcessedBlock = extra.lastSuccessProcessedBlock;
    if (extra?.consecutiveFailures !== undefined)
      mem.sync.consecutiveFailures = extra.consecutiveFailures;
    if (extra?.rpcActiveUrl !== undefined) mem.sync.rpcActiveUrl = extra.rpcActiveUrl;
    if (extra?.rpcStats !== undefined) mem.sync.rpcStats = extra.rpcStats;
    mem.sync.meta = {
      lastAttemptAt: attemptAt,
      lastSuccessAt: successAt,
      lastDurationMs: duration,
      lastError: error,
    };
    return;
  }

  // 数据库模式
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
      lastSuccessProcessed !== undefined ? lastSuccessProcessed.toString() : null,
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

/**
 * 插入同步指标
 * @param input - 同步指标输入
 * @param instanceId - 实例 ID
 */
export async function insertSyncMetric(
  input: SyncMetricInput,
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<void> {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId, DEFAULT_ORACLE_INSTANCE_ID);
  const recordedAt = new Date().toISOString();

  // 内存模式
  if (!hasDatabase()) {
    const mem = getMemoryInstance(normalizedInstanceId);
    const list = mem.sync.metrics ?? [];
    list.push({
      recordedAt,
      lagBlocks: input.lagBlocks,
      durationMs: input.durationMs,
      error: input.error,
    });
    // 限制指标数量
    while (list.length > MAX_SYNC_METRICS) list.shift();
    mem.sync.metrics = list;
    return;
  }

  // 数据库模式
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

/**
 * 列出同步指标
 * @param params - 查询参数
 * @returns 同步指标列表
 */
export async function listSyncMetrics(params: {
  minutes: number;
  limit?: number;
  instanceId?: string;
}): Promise<SyncMetricOutput[]> {
  await ensureDb();
  const minutes = Math.min(24 * 60, Math.max(1, Math.floor(params.minutes)));
  const limit = Math.min(5000, Math.max(1, Math.floor(params.limit ?? 600)));
  const normalizedInstanceId = normalizeInstanceId(params.instanceId, DEFAULT_ORACLE_INSTANCE_ID);

  // 内存模式
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

  // 数据库模式
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
      r.recorded_at instanceof Date ? r.recorded_at : new Date(String(r.recorded_at));
    const lagBlocks =
      r.lag_blocks !== null && r.lag_blocks !== undefined ? String(r.lag_blocks) : null;
    const durationMs =
      r.duration_ms === null || r.duration_ms === undefined
        ? null
        : typeof r.duration_ms === 'number'
          ? r.duration_ms
          : Number(r.duration_ms);
    const error = typeof r.error === 'string' ? r.error : null;

    return {
      recordedAt: recordedAtDate.toISOString(),
      lagBlocks,
      durationMs,
      error,
    };
  });
}

// ==================== 投票操作 ====================

/**
 * 插入投票事件
 * @param input - 投票事件输入
 * @param instanceId - 实例 ID
 * @returns 是否成功插入（false 表示重复）
 */
export async function insertVoteEvent(
  input: VoteEventInput,
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<boolean> {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId, DEFAULT_ORACLE_INSTANCE_ID);

  // 内存模式
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

    // 修剪旧投票
    const { memoryMaxVoteKeys, memoryVoteBlockWindow } = await import('./memory');
    const maxKeys = memoryMaxVoteKeys();
    if (mem.votes.size > maxKeys) {
      const blockWindow = memoryVoteBlockWindow();
      const cutoff = input.blockNumber > blockWindow ? input.blockNumber - blockWindow : 0n;

      // 删除超出区块窗口的投票
      for (const [k, v] of mem.votes.entries()) {
        if (v.blockNumber < cutoff) {
          mem.votes.delete(k);
          applyVoteSumsDelta(mem, v.assertionId, v.support, v.weight, -1);
        }
        if (mem.votes.size <= maxKeys) break;
      }

      // 如果仍然超出限制，删除最早的投票
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

  // 数据库模式
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

/**
 * 重新计算争议投票
 * 根据所有投票重新计算争议的总票数
 * @param assertionId - 断言 ID
 * @param instanceId - 实例 ID
 */
export async function recomputeDisputeVotes(
  assertionId: string,
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<void> {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId, DEFAULT_ORACLE_INSTANCE_ID);

  // 内存模式
  if (!hasDatabase()) {
    const mem = getMemoryInstance(normalizedInstanceId);
    const dispute = mem.disputes.get(`D:${assertionId}`);
    if (!dispute) return;

    // 计算投票总和
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
    dispute.totalVotes = bigintToSafeNumber(sums.forWeight + sums.againstWeight);
    mem.disputes.set(dispute.id, dispute);
    return;
  }

  // 数据库模式
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
    row.votes_for !== undefined && row.votes_for !== null ? String(row.votes_for) : '0';
  const votesAgainst =
    row.votes_against !== undefined && row.votes_against !== null ? String(row.votes_against) : '0';
  const totalVotes =
    row.total_votes !== undefined && row.total_votes !== null ? String(row.total_votes) : '0';

  await query(
    `
    UPDATE disputes
    SET votes_for = $2, votes_against = $3, total_votes = $4
    WHERE id = $1 AND instance_id = $5
    `,
    [`D:${assertionId}`, votesFor, votesAgainst, totalVotes, normalizedInstanceId],
  );
}

// ==================== 事件记录 ====================

/**
 * 插入 Oracle 事件
 * @param input - 事件输入
 * @param instanceId - 实例 ID
 * @returns 是否成功插入（false 表示重复或错误）
 */
export async function insertOracleEvent(
  input: OracleEventInput,
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<boolean> {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId, DEFAULT_ORACLE_INSTANCE_ID);

  try {
    const payloadJson = JSON.stringify(input.payload);
    const payloadChecksum = crypto.createHash('sha256').update(payloadJson).digest('hex');

    // 内存模式
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

    // 数据库模式
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

/**
 * 写入 Oracle 状态（兼容旧接口）
 * @deprecated 建议使用具体的操作函数
 * @param state - 存储状态
 */
export async function writeOracleState(state: StoredState): Promise<void> {
  await ensureDb();
  await updateSyncState(
    state.lastProcessedBlock,
    state.sync.lastAttemptAt || new Date().toISOString(),
    state.sync.lastSuccessAt,
    state.sync.lastDurationMs,
    state.sync.lastError,
  );
}
