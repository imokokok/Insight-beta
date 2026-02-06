/**
 * Oracle State 内存存储管理
 *
 * 处理内存模式的存储限制、修剪策略和配置管理
 */

import { env } from '@/lib/config/env';

import {
  DEFAULT_MEMORY_MAX_VOTE_KEYS,
  DEFAULT_MEMORY_VOTE_BLOCK_WINDOW,
  DEFAULT_MEMORY_MAX_ASSERTIONS,
  DEFAULT_MEMORY_MAX_DISPUTES,
} from './constants';
import { toTimeMs } from './utils';

import type { getMemoryInstance } from '../memoryBackend';
import type { VoteSums } from './types';

/**
 * 将 BigInt 安全地转换为 Number（防止溢出）
 * @param value - BigInt 值
 * @returns 转换后的 Number，溢出时返回安全边界值
 */
function safeBigIntToNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) return Number.MAX_SAFE_INTEGER;
  if (value < BigInt(Number.MIN_SAFE_INTEGER)) return Number.MIN_SAFE_INTEGER;
  return Number(value);
}

/**
 * 获取内存模式最大投票键数量
 * @returns 最大投票键数量
 */
export function memoryMaxVoteKeys(): number {
  const raw = env.INSIGHT_MEMORY_MAX_VOTE_KEYS;
  if (!raw) return DEFAULT_MEMORY_MAX_VOTE_KEYS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0)
    return DEFAULT_MEMORY_MAX_VOTE_KEYS;
  return parsed;
}

/**
 * 获取内存模式最大断言数量
 * @returns 最大断言数量
 */
export function memoryMaxAssertions(): number {
  const raw = env.INSIGHT_MEMORY_MAX_ASSERTIONS;
  if (!raw) return DEFAULT_MEMORY_MAX_ASSERTIONS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0)
    return DEFAULT_MEMORY_MAX_ASSERTIONS;
  return parsed;
}

/**
 * 获取内存模式最大争议数量
 * @returns 最大争议数量
 */
export function memoryMaxDisputes(): number {
  const raw = env.INSIGHT_MEMORY_MAX_DISPUTES;
  if (!raw) return DEFAULT_MEMORY_MAX_DISPUTES;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0)
    return DEFAULT_MEMORY_MAX_DISPUTES;
  return parsed;
}

/**
 * 获取内存模式投票区块窗口
 * @returns 投票区块窗口大小
 */
export function memoryVoteBlockWindow(): bigint {
  const raw = env.INSIGHT_MEMORY_VOTE_BLOCK_WINDOW;
  if (!raw) return DEFAULT_MEMORY_VOTE_BLOCK_WINDOW;
  try {
    const parsed = BigInt(raw);
    return parsed >= 0n ? parsed : DEFAULT_MEMORY_VOTE_BLOCK_WINDOW;
  } catch {
    return DEFAULT_MEMORY_VOTE_BLOCK_WINDOW;
  }
}

/**
 * 删除指定断言的所有投票
 * @param mem - 内存实例
 * @param assertionId - 断言 ID
 */
export function deleteVotesForAssertion(
  mem: ReturnType<typeof getMemoryInstance>,
  assertionId: string,
): void {
  for (const [key, v] of mem.votes.entries()) {
    if (v.assertionId === assertionId) mem.votes.delete(key);
  }
}

/**
 * 修剪内存中的断言数据
 * 当断言数量超过限制时，按优先级删除（已解决的优先，旧的优先）
 * @param mem - 内存实例
 */
export function pruneMemoryAssertions(mem: ReturnType<typeof getMemoryInstance>): void {
  const overflow = mem.assertions.size - memoryMaxAssertions();
  if (overflow <= 0) return;

  // 构建候选列表，按状态和时间排序
  const candidates = Array.from(mem.assertions.entries()).map(([id, a]) => ({
    id,
    rank: a.status === 'Resolved' ? 1 : 0,
    timeMs: a.status === 'Resolved' ? toTimeMs(a.resolvedAt) : toTimeMs(a.assertedAt),
  }));

  // 排序：已解决的优先，然后按时间从旧到新
  candidates.sort((a, b) => {
    const r = b.rank - a.rank;
    if (r !== 0) return r;
    return a.timeMs - b.timeMs;
  });

  // 删除超出的数据
  for (let i = 0; i < overflow; i++) {
    const id = candidates[i]?.id;
    if (!id) continue;
    mem.assertions.delete(id);
    mem.disputes.delete(`D:${id}`);
    mem.voteSums.delete(id);
    deleteVotesForAssertion(mem, id);
  }
}

/**
 * 修剪内存中的争议数据
 * 当争议数量超过限制时，按优先级删除（已执行的优先，旧的优先）
 * @param mem - 内存实例
 */
export function pruneMemoryDisputes(mem: ReturnType<typeof getMemoryInstance>): void {
  const overflow = mem.disputes.size - memoryMaxDisputes();
  if (overflow <= 0) return;

  // 构建候选列表，按状态和时间排序
  const candidates = Array.from(mem.disputes.entries()).map(([id, d]) => ({
    id,
    rank: d.status === 'Executed' ? 1 : 0,
    timeMs: toTimeMs(d.votingEndsAt ?? d.disputedAt),
  }));

  // 排序：已执行的优先，然后按时间从旧到新
  candidates.sort((a, b) => {
    const r = b.rank - a.rank;
    if (r !== 0) return r;
    return a.timeMs - b.timeMs;
  });

  // 删除超出的数据
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

/**
 * 应用投票权重变化
 * 更新内存中的投票汇总数据
 * @param mem - 内存实例
 * @param assertionId - 断言 ID
 * @param support - 是否支持
 * @param weight - 投票权重
 * @param direction - 变化方向（1=增加，-1=减少）
 * @returns 更新后的投票汇总
 */
export function applyVoteSumsDelta(
  mem: ReturnType<typeof getMemoryInstance>,
  assertionId: string,
  support: boolean,
  weight: bigint,
  direction: 1 | -1,
): VoteSums {
  const prev = mem.voteSums.get(assertionId) ?? {
    forWeight: 0n,
    againstWeight: 0n,
  };

  const delta = direction === 1 ? weight : -weight;
  let forWeight = prev.forWeight;
  let againstWeight = prev.againstWeight;

  if (support) forWeight += delta;
  else againstWeight += delta;

  // 防止负数
  if (forWeight < 0n) forWeight = 0n;
  if (againstWeight < 0n) againstWeight = 0n;

  const next: VoteSums = { forWeight, againstWeight };

  // 清理空数据或更新
  if (next.forWeight === 0n && next.againstWeight === 0n) {
    mem.voteSums.delete(assertionId);
  } else {
    mem.voteSums.set(assertionId, next);
  }

  // 同步更新争议对象的投票数
  const dispute = mem.disputes.get(`D:${assertionId}`);
  if (dispute) {
    dispute.currentVotesFor = safeBigIntToNumber(next.forWeight);
    dispute.currentVotesAgainst = safeBigIntToNumber(next.againstWeight);
    dispute.totalVotes = safeBigIntToNumber(next.forWeight + next.againstWeight);
    mem.disputes.set(dispute.id, dispute);
  }

  return next;
}
