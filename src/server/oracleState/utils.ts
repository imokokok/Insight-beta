/**
 * Oracle State 工具函数
 *
 * 提供类型转换、数据映射和通用工具函数
 */

import type { DbAssertionRow, DbDisputeRow } from '@/lib/types/oracleTypes';
import type { Dispute } from '@/lib/types/oracleTypes';

/**
 * 将值转换为 BigInt，失败时返回默认值
 * @param value - 要转换的值
 * @param fallback - 转换失败时的默认值
 * @returns 转换后的 BigInt 或默认值
 */
export function toBigIntOr(value: unknown, fallback: bigint): bigint {
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

/**
 * 将值转换为 ISO 格式字符串，失败时返回 null
 * @param value - 要转换的值
 * @returns ISO 格式字符串或 null
 */
export function toIsoOrNull(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }
  return null;
}

/**
 * 将值转换为可空的数字
 * @param value - 要转换的值
 * @returns 数字或 null
 */
export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * 将值转换为可空的字符串
 * @param value - 要转换的值
 * @returns 字符串或 null
 */
export function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? value : null;
}

/**
 * 将时间字符串转换为毫秒时间戳
 * @param value - 时间字符串
 * @returns 毫秒时间戳，无效时返回 0
 */
export function toTimeMs(value: string | undefined): number {
  const ms = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * 将 BigInt 安全地转换为 Number（防止溢出）
 * @param value - BigInt 值
 * @returns 转换后的 Number，溢出时返回安全边界值
 */
export function bigintToSafeNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) return Number.MAX_SAFE_INTEGER;
  if (value < BigInt(Number.MIN_SAFE_INTEGER)) return Number.MIN_SAFE_INTEGER;
  return Number(value);
}

/**
 * 规范化实例 ID
 * @param instanceId - 实例 ID
 * @param defaultId - 默认实例 ID
 * @returns 规范化后的实例 ID
 */
export function normalizeInstanceId(instanceId: string | undefined, defaultId: string): string {
  const trimmed = (instanceId ?? defaultId).trim();
  return trimmed || defaultId;
}

/**
 * 将数据库断言行映射为业务对象
 * @param row - 数据库行
 * @returns 断言业务对象
 */
export function mapAssertionRow(row: DbAssertionRow) {
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
    settlementResolution: row.settlement_resolution ?? undefined,
    status: row.status,
    bondUsd: Number(row.bond_usd),
    disputer: row.disputer || undefined,
    txHash: row.tx_hash,
  };
}

/**
 * 将数据库争议行映射为业务对象
 * @param row - 数据库行
 * @returns 争议业务对象
 */
export function mapDisputeRow(row: DbDisputeRow): Dispute {
  const now = Date.now();
  const votingEndsAt = row.voting_ends_at ? row.voting_ends_at.toISOString() : undefined;
  const statusFromDb = row.status as Dispute['status'];

  // 根据时间计算争议状态
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
    votingEndsAt: votingEndsAt || '',
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
