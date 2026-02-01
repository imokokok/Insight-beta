/**
 * Assertion Types - 断言和争议相关类型定义
 */

import type { OracleChain, SupportedChain } from './chain';
import type { OracleProtocol } from './protocol';

export type AssertionStatus =
  | 'Pending'
  | 'Disputed'
  | 'Resolved'
  | 'active'
  | 'expired'
  | 'disputed'
  | 'settled'
  | 'cancelled';

export type Assertion = {
  id: string;
  instanceId: string;
  protocol: OracleProtocol;
  chain: SupportedChain | OracleChain;
  identifier: string;
  description?: string;
  assertion?: string;
  market?: string;
  asserter?: string;
  proposer: string;
  proposedValue?: string | bigint;
  assertedAt?: string;
  proposedAt: string;
  livenessEndsAt?: string;
  expiresAt?: string;
  settledAt?: string;
  resolvedAt?: string;
  status: AssertionStatus;
  settlementResolution?: boolean;
  settlementValue?: string | bigint;
  bondUsd?: number;
  bondAmount?: number;
  bondToken?: string;
  bond?: bigint;
  reward?: number | bigint;
  disputed?: boolean;
  disputer?: string;
  disputedAt?: string;
  txHash: string;
  blockNumber: number | string;
  logIndex: number;
  version?: 'v2' | 'v3';
};

export type DisputeStatus =
  | 'Voting'
  | 'Pending Execution'
  | 'Executed'
  | 'active'
  | 'resolved'
  | 'dismissed';

export type Dispute = {
  id: string;
  instanceId: string;
  protocol: OracleProtocol;
  chain: SupportedChain | OracleChain;
  assertionId: string;
  disputer: string;
  reason?: string;
  disputeReason?: string;
  market?: string;
  disputedAt: string;
  votingEndsAt?: string;
  resolvedAt?: string;
  status: DisputeStatus;
  outcome?: 'valid' | 'invalid';
  votesFor?: number;
  votesAgainst?: number;
  totalVotes?: number;
  currentVotesFor?: number;
  currentVotesAgainst?: number;
  disputeBond?: number | bigint;
  txHash: string;
  blockNumber: number | string;
  logIndex: number;
  version?: 'v2' | 'v3';
};

export type LeaderboardEntry = {
  address: string;
  count: number;
  value?: number;
  rank: number;
};

export type LeaderboardStats = {
  topAsserters: LeaderboardEntry[];
  topDisputers: LeaderboardEntry[];
};

export type UserStats = {
  totalAssertions: number;
  totalDisputes: number;
  totalBondedUsd: number;
  winRate: number;
};

export type RiskSeverity = 'info' | 'warning' | 'critical';

export type RiskItem = {
  entityType: 'assertion' | 'market';
  entityId: string;
  chain: OracleChain;
  market: string;
  score: number;
  severity: RiskSeverity;
  reasons: string[];
  assertionId?: string;
  disputeId?: string;
};
