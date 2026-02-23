/**
 * Protocol Types - 协议相关的统一类型定义
 */

import {
  type BaseProtocolStats,
  type UMAStats as UMAStatsBase,
  type ChainlinkStats,
  type PythStats,
  type BandStats,
  type Api3Stats,
} from './stats';

export type { BaseProtocolStats, ChainlinkStats, PythStats, BandStats, Api3Stats };

export interface BaseProtocolFeed {
  id: string;
  symbol: string;
  name: string;
  price: number;
  decimals: number;
  status: 'active' | 'stale' | 'error';
  updatedAt: string;
  chain: string;
}

export interface BaseProtocolNode {
  id: string;
  name: string;
  address: string;
  status: 'active' | 'inactive';
  lastUpdate: string;
  totalSubmissions: number;
  accuracy: number;
}

// ==================== UMA 特定类型 ====================

export type UMAChain = 'Ethereum' | 'Polygon' | 'Arbitrum' | 'Optimism' | 'Base' | 'PolygonAmoy';

export type UMAAssertionStatus = 'Requested' | 'Proposed' | 'Disputed' | 'Settled';

export interface UMAAssertion {
  id: string;
  chain: UMAChain;
  identifier: string;
  ancillaryData: string;
  proposer: string;
  proposedValue?: bigint;
  reward?: bigint;
  proposedAt: string;
  livenessEndsAt?: string;
  disputedAt?: string;
  settledAt?: string;
  settlementValue?: bigint;
  status: UMAAssertionStatus;
  bond?: bigint;
  disputeBond?: bigint;
  txHash: string;
  blockNumber: string;
  logIndex: number;
  version: 'v2' | 'v3';
}

export type UMADisputeStatus = 'Voting' | 'Executed' | 'Dismissed';

export interface UMADispute {
  id: string;
  chain: UMAChain;
  assertionId: string;
  identifier: string;
  ancillaryData: string;
  disputer: string;
  disputeBond: bigint;
  disputedAt: string;
  votingEndsAt: string;
  status: UMADisputeStatus;
  currentVotesFor: number;
  currentVotesAgainst: number;
  totalVotes: number;
  txHash: string;
  blockNumber: string;
  logIndex: number;
  version: 'v2' | 'v3';
}

export interface UMAVote {
  chain: UMAChain;
  assertionId: string;
  voter: string;
  support: boolean;
  weight?: bigint;
  txHash: string;
  blockNumber: string;
  logIndex: number;
}

export interface UMAConfig {
  id: string;
  chain: UMAChain;
  rpcUrl: string;
  optimisticOracleV2Address?: string;
  optimisticOracleV3Address?: string;
  startBlock?: number;
  maxBlockRange?: number;
  votingPeriodHours?: number;
  confirmationBlocks?: number;
  enabled: boolean;
}

export interface UMAStats extends UMAStatsBase {
  totalVolume: number;
}

// ==================== 支持的链 ====================

export { SUPPORTED_CHAINS } from '@/types/chains';
