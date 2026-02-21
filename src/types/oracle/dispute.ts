import type { DisputeStatus } from '@/types/common/status';

export type { DisputeStatus };

export interface Dispute {
  id: string;
  assertionId: string;
  protocol: string;
  chain: string;
  disputer: string;
  asserter: string;
  claim: string;
  bond: number;
  disputeBond: number;
  currency: string;
  status: DisputeStatus;
  resolutionResult?: boolean;
  proposedAt: string;
  disputedAt: string;
  settledAt?: string;
  txHash: string;
  blockNumber: number;
}

export interface DisputerStats {
  address: string;
  totalDisputes: number;
  successfulDisputes: number;
  winRate: number;
  totalBonded: number;
  totalRewards: number;
  firstDisputeAt: string;
  lastDisputeAt: string;
}

export interface DisputeTrend {
  timestamp: string;
  totalDisputes: number;
  activeDisputes: number;
  resolvedDisputes: number;
  disputeRate: number;
}

export interface DisputeReport {
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalDisputes: number;
    activeDisputes: number;
    resolvedDisputes: number;
    totalBonded: number;
    disputeRate: number;
    successRate: number;
    avgResolutionTimeHours: number;
  };
  disputes: Dispute[];
  trends: DisputeTrend[];
  topDisputers: DisputerStats[];
  recentActivity: Dispute[];
}
