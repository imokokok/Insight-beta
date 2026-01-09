export type OracleChain = "Polygon" | "Arbitrum" | "Optimism" | "Local";

export type OracleStatus = "Pending" | "Disputed" | "Resolved";

export type Assertion = {
  id: string;
  chain: OracleChain;
  asserter: string;
  protocol: string;
  market: string;
  assertion: string;
  assertedAt: string;
  livenessEndsAt: string;
  resolvedAt?: string;
  status: OracleStatus;
  bondUsd: number;
  disputer?: string;
  txHash: string;
};

export type DisputeStatus = "Voting" | "Pending Execution" | "Executed";

export type Dispute = {
  id: string;
  chain: OracleChain;
  assertionId: string;
  market: string;
  disputeReason: string;
  disputer: string;
  disputedAt: string;
  votingEndsAt: string;
  status: DisputeStatus;
  currentVotesFor: number;
  currentVotesAgainst: number;
  totalVotes: number;
};

export type ListResult<T> = {
  items: T[];
  total: number;
  nextCursor: number | null;
};

export type OracleStats = {
  tvsUsd: number;
  activeDisputes: number;
  resolved24h: number;
  avgResolutionMinutes: number;
}

export type LeaderboardEntry = {
  address: string;
  count: number;
  value?: number; // For asserters (bond value)
  rank: number;
};

export type LeaderboardStats = {
  topAsserters: LeaderboardEntry[];
  topDisputers: LeaderboardEntry[];
};;

export type OracleConfig = {
  rpcUrl: string;
  contractAddress: string;
  chain: OracleChain;
};

export type OracleStatusSnapshot = {
  chain: OracleChain;
  contractAddress: string | null;
  lastProcessedBlock: string;
  assertions: number;
  disputes: number;
  syncing?: boolean;
  sync?: {
    lastAttemptAt: string | null;
    lastSuccessAt: string | null;
    lastDurationMs: number | null;
    lastError: string | null;
  };
};

export type ApiOk<T extends Record<string, unknown>> = { ok: true } & T;
export type ApiError = { ok: false; error: string };
