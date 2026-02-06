import type { UMAChain } from '@/lib/types/oracleTypes';

import type { Address } from 'viem';

export type RpcStatsItem = {
  ok: number;
  fail: number;
  lastOkAt: string | null;
  lastFailAt: string | null;
  avgLatencyMs: number | null;
};

export type RpcStats = Record<string, RpcStatsItem>;

export interface UMAEnv {
  rpcUrl: string;
  ooV2Address: Address | undefined;
  ooV3Address: Address | undefined;
  chain: UMAChain;
  startBlock: bigint;
  maxBlockRange: bigint;
  votingPeriodMs: number;
  confirmationBlocks: bigint;
}

export interface SyncWindow {
  cursor: bigint;
  toBlock: bigint;
  window: bigint;
  consecutiveEmptyRanges: number;
}
