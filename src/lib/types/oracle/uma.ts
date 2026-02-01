/**
 * UMA Types - UMA 协议特定类型定义
 */

import type { UMAChain } from './chain';

export type UMAAssertionStatus = 'Requested' | 'Proposed' | 'Disputed' | 'Settled';

export type UMAAssertion = {
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
};

export type UMADisputeStatus = 'Voting' | 'Executed' | 'Dismissed';

export type UMADispute = {
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
};

export type UMAVote = {
  chain: UMAChain;
  assertionId: string;
  voter: string;
  support: boolean;
  weight?: bigint;
  txHash: string;
  blockNumber: string;
  logIndex: number;
};

export type UMAConfig = {
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
};

export type UMAStats = {
  totalAssertions: number;
  proposedAssertions: number;
  disputedAssertions: number;
  settledAssertions: number;
  totalDisputes: number;
  activeDisputes: number;
  totalVolume: number;
};
