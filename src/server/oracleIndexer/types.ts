/**
 * Oracle Indexer 类型定义
 */

/**
 * RPC 统计项
 */
export type RpcStatsItem = {
  ok: number;
  fail: number;
  lastOkAt: string | null;
  lastFailAt: string | null;
  avgLatencyMs: number | null;
};

/**
 * RPC 统计
 */
export type RpcStats = Record<string, RpcStatsItem>;

/**
 * 同步错误代码
 */
export type SyncErrorCode = 'contract_not_found' | 'rpc_unreachable' | 'sync_failed';

/**
 * Oracle 环境配置
 */
export type OracleEnv = {
  rpcUrl: string;
  contractAddress: `0x${string}`;
  chain: string;
  startBlock: bigint;
  maxBlockRange: bigint;
  votingPeriodMs: number;
  confirmationBlocks: bigint;
};

/**
 * 同步结果
 */
export type SyncResult = {
  updated: boolean;
  state: {
    version: number;
    chain: string;
    contractAddress: string | null;
    lastProcessedBlock: bigint;
    sync: {
      lastAttemptAt: string | null;
      lastSuccessAt: string | null;
      lastDurationMs: number | null;
      lastError: string | null;
    };
    assertions: Record<string, unknown>;
    disputes: Record<string, unknown>;
  };
};
