/**
 * Oracle State 类型定义
 *
 * 集中管理所有类型定义，确保类型安全
 */

import type { Assertion, Dispute, OracleChain } from '@/lib/types/oracleTypes';

/** 同步元数据 */
export type SyncMeta = {
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastDurationMs: number | null;
  lastError: string | null;
};

/** 存储状态 */
export type StoredState = {
  version: number;
  chain: OracleChain;
  contractAddress: string | null;
  lastProcessedBlock: bigint;
  sync: SyncMeta;
  assertions: Record<string, Assertion>;
  disputes: Record<string, Dispute>;
};

/** 同步状态 */
export type SyncState = {
  lastProcessedBlock: bigint;
  latestBlock: bigint | null;
  safeBlock: bigint | null;
  lastSuccessProcessedBlock: bigint | null;
  consecutiveFailures: number;
  rpcActiveUrl: string | null;
  rpcStats: unknown;
  sync: SyncMeta;
  chain: OracleChain;
  contractAddress: string | null;
  owner: string | null;
};

/** 投票事件输入 */
export type VoteEventInput = {
  chain: OracleChain;
  assertionId: string;
  voter: string;
  support: boolean;
  weight: bigint;
  txHash: string;
  blockNumber: bigint;
  logIndex: number;
};

/** Oracle 事件输入 */
export type OracleEventInput = {
  chain: OracleChain;
  eventType: string;
  assertionId?: string | null;
  txHash: string;
  blockNumber: bigint;
  logIndex: number;
  payload: unknown;
};

/** 同步指标输入 */
export type SyncMetricInput = {
  lastProcessedBlock: bigint;
  latestBlock: bigint | null;
  safeBlock: bigint | null;
  lagBlocks: bigint | null;
  durationMs: number | null;
  error: string | null;
};

/** 同步指标输出 */
export type SyncMetricOutput = {
  recordedAt: string;
  lagBlocks: string | null;
  durationMs: number | null;
  error: string | null;
};

/** 事件回放结果 */
export type ReplayResult = {
  applied: number;
};

/** 投票权重汇总 */
export type VoteSums = {
  forWeight: bigint;
  againstWeight: bigint;
};
