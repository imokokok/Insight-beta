export type OracleChain =
  | "Polygon"
  | "PolygonAmoy"
  | "Arbitrum"
  | "Optimism"
  | "Local";

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
  blockNumber?: string;
  logIndex?: number;
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
  txHash?: string;
  blockNumber?: string;
  logIndex?: number;
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
};

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

export type OracleInstance = {
  id: string;
  name: string;
  enabled: boolean;
  chain: OracleChain;
  contractAddress: string;
};

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

export type ApiOk<T extends Record<string, unknown>> = { ok: true } & T;
export type ApiError = {
  ok: false;
  error: string | { code: string; details?: unknown };
};

export type UserStats = {
  totalAssertions: number;
  totalDisputes: number;
  totalBondedUsd: number;
  winRate: number; // 0-100
};

export interface DbAssertionRow {
  id: string;
  instance_id: string;
  chain: OracleChain;
  asserter: string;
  protocol: string;
  market: string;
  assertion_data: string;
  asserted_at: Date;
  liveness_ends_at: Date;
  block_number?: string | number | null;
  log_index?: number | null;
  resolved_at: Date | null;
  settlement_resolution: boolean | null;
  status: OracleStatus;
  bond_usd: string | number;
  disputer: string | null;
  tx_hash: string;
}

export interface DbDisputeRow {
  id: string;
  instance_id: string;
  chain: OracleChain;
  assertion_id: string;
  market: string;
  reason: string;
  disputer: string;
  disputed_at: Date;
  voting_ends_at: Date | null;
  tx_hash?: string | null;
  block_number?: string | number | null;
  log_index?: number | null;
  status: string;
  votes_for: string | number;
  votes_against: string | number;
  total_votes: string | number;
}

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

export type AlertRuleEvent =
  | "dispute_created"
  | "liveness_expiring"
  | "sync_error"
  | "stale_sync"
  | "contract_paused"
  | "sync_backlog"
  | "backlog_assertions"
  | "backlog_disputes"
  | "market_stale"
  | "execution_delayed"
  | "low_participation"
  | "high_vote_divergence"
  | "high_dispute_rate"
  | "slow_api_request"
  | "high_error_rate"
  | "database_slow_query"
  | "price_deviation"
  | "low_gas";
export type AlertRule = {
  id: string;
  name: string;
  enabled: boolean;
  event: AlertRuleEvent;
  severity: AlertSeverity;
  owner?: string | null;
  runbook?: string | null;
  silencedUntil?: string | null;
  params?: Record<string, unknown>;
  channels?: Array<"webhook" | "email" | "telegram">;
  recipient?: string | null;
};

export type IncidentStatus = "Open" | "Mitigating" | "Resolved";

export type Incident = {
  id: number;
  title: string;
  status: IncidentStatus;
  severity: AlertSeverity;
  owner: string | null;
  rootCause: string | null;
  summary: string | null;
  runbook: string | null;
  alertIds: number[];
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type RiskSeverity = AlertSeverity;

export type RiskItem = {
  entityType: "assertion" | "market";
  entityId: string;
  chain: OracleChain;
  market: string;
  score: number;
  severity: RiskSeverity;
  reasons: string[];
  assertionId?: string;
  disputeId?: string;
};

export type OpsMetricsSeriesPoint = {
  date: string;
  alertsCreated: number;
  alertsResolved: number;
  incidentsCreated: number;
  incidentsResolved: number;
};

export type OpsMetrics = {
  generatedAt: string;
  windowDays: number;
  alerts: {
    open: number;
    acknowledged: number;
    resolved: number;
    mttaMs: number | null;
    mttrMs: number | null;
  };
  incidents: {
    open: number;
    mitigating: number;
    resolved: number;
    mttrMs: number | null;
  };
  slo?: OpsSloStatus;
};

export type OpsSloStatus = {
  status: "met" | "degraded" | "breached";
  targets: {
    maxLagBlocks: number;
    maxSyncStalenessMinutes: number;
    maxAlertMttaMinutes: number;
    maxAlertMttrMinutes: number;
    maxIncidentMttrMinutes: number;
    maxOpenAlerts: number;
    maxOpenCriticalAlerts: number;
  };
  current: {
    lagBlocks: number | null;
    syncStalenessMinutes: number | null;
    alertMttaMinutes: number | null;
    alertMttrMinutes: number | null;
    incidentMttrMinutes: number | null;
    openAlerts: number | null;
    openCriticalAlerts: number | null;
  };
  breaches: Array<{ key: string; target: number; actual: number }>;
};
