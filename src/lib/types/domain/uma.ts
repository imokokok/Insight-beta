/**
 * UMA Domain Types - UMA 协议领域类型
 */

import type { EntityId, Timestamp } from './base';
import type { OracleProtocol, SupportedChain } from './oracle';

// ============================================================================
// 断言
// ============================================================================

export type AssertionStatus = 'Pending' | 'Disputed' | 'Resolved' | 'Expired';

export interface Assertion {
  id: EntityId;
  assertionId: string;
  protocol: OracleProtocol;
  chain: SupportedChain;
  asserter: string;
  claim: string;
  bond: bigint;
  liveness: number;
  expirationTime: number;
  status: AssertionStatus;
  disputer?: string;
  disputeTimestamp?: number;
  settlementTimestamp?: number;
  settlementResolution?: boolean;
  currency?: string;
  callbackRecipient?: string;
  escalationManager?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AssertionTimeline {
  assertionId: string;
  events: Array<{
    type: 'created' | 'disputed' | 'resolved' | 'expired';
    timestamp: Timestamp;
    data?: Record<string, unknown>;
  }>;
}

// ============================================================================
// 争议
// ============================================================================

export type DisputeStatus = 'Voting' | 'Pending Execution' | 'Executed' | 'Rejected';

export interface Dispute {
  id: EntityId;
  disputeId: string;
  assertionId: string;
  protocol: OracleProtocol;
  chain: SupportedChain;
  disputer: string;
  status: DisputeStatus;
  votingStartTime?: number;
  votingEndTime?: number;
  resolution?: boolean;
  resolutionTimestamp?: Timestamp;
  votesFor?: bigint;
  votesAgainst?: bigint;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DisputeEvidence {
  id: EntityId;
  disputeId: string;
  submitter: string;
  evidenceType: 'document' | 'link' | 'text';
  content: string;
  metadata?: Record<string, unknown>;
  submittedAt: Timestamp;
}

// ============================================================================
// 投票
// ============================================================================

export interface Vote {
  id: EntityId;
  disputeId: string;
  voter: string;
  vote: boolean;
  stake: bigint;
  timestamp: Timestamp;
  revealed: boolean;
  revealedAt?: Timestamp;
}

export interface VotingRound {
  id: EntityId;
  disputeId: string;
  round: number;
  startTime: Timestamp;
  endTime: Timestamp;
  status: 'active' | 'completed' | 'cancelled';
  totalVotesFor: bigint;
  totalVotesAgainst: bigint;
  totalStaked: bigint;
}

// ============================================================================
// 质押和奖励
// ============================================================================

export interface StakingPosition {
  id: EntityId;
  staker: string;
  amount: bigint;
  rewards: bigint;
  lockEndTime?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Reward {
  id: EntityId;
  staker: string;
  amount: bigint;
  type: 'voting' | 'staking' | 'referral';
  claimable: boolean;
  claimed: boolean;
  claimedAt?: Timestamp;
  createdAt: Timestamp;
}

// ============================================================================
// 用户统计
// ============================================================================

export interface UMAUserStats {
  address: string;
  totalAssertions: number;
  totalDisputes: number;
  successfulAssertions: number;
  successfulDisputes: number;
  totalBonded: bigint;
  totalRewards: bigint;
  reputation: number;
  rank?: number;
}

export interface UMALeaderboardEntry {
  rank: number;
  address: string;
  score: number;
  totalAssertions: number;
  totalDisputes: number;
  successRate: number;
  totalVolume: bigint;
}

// ============================================================================
// TVL 和治理
// ============================================================================

export interface UMATVL {
  id: EntityId;
  totalStaked: bigint;
  totalBonded: bigint;
  totalRewards: bigint;
  currency: string;
  timestamp: Timestamp;
}

export interface GovernanceProposal {
  id: EntityId;
  proposalId: string;
  proposer: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'succeeded' | 'defeated' | 'executed';
  votesFor: bigint;
  votesAgainst: bigint;
  startTime: Timestamp;
  endTime: Timestamp;
  executedAt?: Timestamp;
}
