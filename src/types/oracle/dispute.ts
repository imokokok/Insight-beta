import type { DisputeStatus } from '@/types/common/status';
import type { DisputerStats as DisputerStatsBase } from '@/types/stats';

export type { DisputeStatus };
export type { DisputerStatsBase as DisputerStats };

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
  topDisputers: DisputerStatsBase[];
  recentActivity: Dispute[];
}
