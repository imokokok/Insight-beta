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
  settlementResolution?: boolean;
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
};

export type OracleConfig = {
  rpcUrl: string;
  contractAddress: string;
  chain: OracleChain;
  startBlock?: number;
  maxBlockRange?: number;
  votingPeriodHours?: number;
  confirmationBlocks?: number;
  adminToken?: string;
};

export type OracleStatusSnapshot = {
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
  sync?: {
    lastAttemptAt: string | null;
    lastSuccessAt: string | null;
    lastDurationMs: number | null;
    lastError: string | null;
  };
};

export type ApiOk<T extends Record<string, unknown>> = { ok: true } & T;
export type ApiError = { ok: false; error: string | { code: string; details?: unknown } };

export type UserStats = {
  totalAssertions: number;
  totalDisputes: number;
  totalBondedUsd: number;
  winRate: number; // 0-100
};

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "Open" | "Acknowledged" | "Resolved";

export type Alert = {
  id: number;
  fingerprint: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  status: AlertStatus;
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuditLogEntry = {
  id: number;
  createdAt: string;
  actor: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: unknown;
};

export type AlertRuleEvent = "dispute_created" | "sync_error" | "stale_sync";
export type AlertRule = {
  id: string;
  name: string;
  enabled: boolean;
  event: AlertRuleEvent;
  severity: AlertSeverity;
  params?: Record<string, unknown>;
};
