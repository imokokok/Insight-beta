/**
 * Legacy Types - 向后兼容的旧类型定义
 * @deprecated 请使用新的模块化类型定义
 */

import type { OracleChain } from './chain';

export type OracleStatus = 'Pending' | 'Disputed' | 'Resolved';

export type OracleStatusSnapshot = {
  instanceId?: string;
  instanceName?: string | null;
  chain: OracleChain;
  contractAddress: string | null;
  lastProcessedBlock: string;
  latestBlock?: string | null;
  safeBlock?: string | null;
  lagBlocks?: string | null;
  consecutiveFailures?: number;
  rpcActiveUrl?: string | null;
  rpcStats?: unknown;
  assertions: number;
  disputes: number;
  syncing?: boolean;
  configError?: string | null;
  configErrors?: string[];
  owner?: string | null;
  ownerIsContract?: boolean | null;
  sync?: {
    lastAttemptAt: string | null;
    lastSuccessAt: string | null;
    lastDurationMs: number | null;
    lastError: string | null;
  };
};
