/**
 * Unified Oracle Types - 通用预言机数据分析平台类型定义
 *
 * 支持多预言机协议的统一抽象层
 */

// ============================================================================
// 预言机协议类型定义 (从 protocol.ts 导入并重新导出)
// ============================================================================

import {
  ORACLE_PROTOCOLS as _ORACLE_PROTOCOLS,
  PROTOCOL_DISPLAY_NAMES as _PROTOCOL_DISPLAY_NAMES,
  PROTOCOL_DESCRIPTIONS as _PROTOCOL_DESCRIPTIONS,
  PROTOCOL_INFO as _PROTOCOL_INFO,
  PRICE_FEED_PROTOCOLS as _PRICE_FEED_PROTOCOLS,
  OPTIMISTIC_PROTOCOLS as _OPTIMISTIC_PROTOCOLS,
  getProtocolsByCategory as _getProtocolsByCategory,
} from './oracle/protocol';

import type {
  OracleProtocol as _OracleProtocol,
  OracleProtocolInfo as _OracleProtocolInfo,
  OracleFeature as _OracleFeature,
} from './oracle/protocol';

// 本地类型别名
export type OracleProtocol = _OracleProtocol;
export type OracleProtocolInfo = _OracleProtocolInfo;
export type OracleFeature = _OracleFeature;

// 本地常量别名
export const ORACLE_PROTOCOLS = _ORACLE_PROTOCOLS;
export const PROTOCOL_DISPLAY_NAMES = _PROTOCOL_DISPLAY_NAMES;
export const PROTOCOL_DESCRIPTIONS = _PROTOCOL_DESCRIPTIONS;
export const PROTOCOL_INFO = _PROTOCOL_INFO;
export const PRICE_FEED_PROTOCOLS = _PRICE_FEED_PROTOCOLS;
export const OPTIMISTIC_PROTOCOLS = _OPTIMISTIC_PROTOCOLS;
export const getProtocolsByCategory = _getProtocolsByCategory;

// ============================================================================
// 通用链类型定义
// ============================================================================

export type SupportedChain =
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'base'
  | 'avalanche'
  | 'bsc'
  | 'fantom'
  | 'celo'
  | 'gnosis'
  | 'linea'
  | 'scroll'
  | 'mantle'
  | 'mode'
  | 'blast'
  | 'solana'
  | 'near'
  | 'aptos'
  | 'sui'
  | 'polygonAmoy'
  | 'sepolia'
  | 'goerli'
  | 'mumbai'
  | 'local';

export type ChainInfo = {
  id: SupportedChain;
  name: string;
  nativeCurrency: string;
  chainId: number;
  explorerUrl: string;
  rpcUrls: string[];
  isTestnet: boolean;
  supportedProtocols: OracleProtocol[];
};

// ============================================================================
// 通用实例配置
// ============================================================================

export type UnifiedOracleInstance = {
  id: string;
  name: string;
  protocol: OracleProtocol;
  chain: SupportedChain;
  enabled: boolean;
  config: UnifiedOracleConfig;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type UnifiedOracleConfig = {
  // 通用配置
  rpcUrl: string;
  rpcUrls?: string[]; // 多 RPC 故障转移
  chain: SupportedChain;

  // 合约配置（可选，取决于协议类型）
  contractAddress?: string;
  contractAddresses?: Record<string, string>; // 多合约配置

  // 同步配置
  startBlock?: number;
  maxBlockRange?: number;
  confirmationBlocks?: number;
  syncIntervalMs?: number;

  // 协议特定配置
  protocolConfig?: ProtocolSpecificConfig;

  // 认证配置
  apiKey?: string;
  adminToken?: string;
};

export type ProtocolSpecificConfig =
  | UMAProtocolConfig
  | ChainlinkProtocolConfig
  | PythProtocolConfig
  | RedStoneProtocolConfig
  | BandProtocolConfig
  | API3ProtocolConfig;

export type UMAProtocolConfig = {
  optimisticOracleV2Address?: string;
  optimisticOracleV3Address?: string;
  votingPeriodHours?: number;
};

export type ChainlinkProtocolConfig = {
  dataFeedAddress?: string;
  registryAddress?: string;
  linkTokenAddress?: string;
  heartbeat?: number; // 价格更新间隔（秒）
  deviationThreshold?: number; // 偏差阈值（%）
  timeout?: number; // RPC 超时时间（毫秒）
  decimals?: number;
  description?: string;
};

export type PythProtocolConfig = {
  pythContractAddress?: string;
  priceFeedIds?: string[];
  stalenessThreshold?: number; // 数据新鲜度阈值（秒）
};

export type RedStoneProtocolConfig = {
  feedIds?: string[];
  apiEndpoint?: string;
  stalenessThreshold?: number;
};

export type BandProtocolConfig = {
  stdReferenceAddress?: string;
  symbols?: string[];
  stalenessThreshold?: number;
  bandChainRestUrl?: string;
  enableCosmosSupport?: boolean;
};

export type API3ProtocolConfig = {
  dapisContractAddress?: string;
  feedIds?: string[];
  stalenessThreshold?: number;
  oevEnabled?: boolean;
};

// ============================================================================
// 基础配置类型
// ============================================================================

export type BaseOracleConfig = {
  timeout?: number;
  retries?: number;
  apiKey?: string;
  stalenessThreshold?: number;
};

// ============================================================================
// 健康状态类型
// ============================================================================

export type OracleHealthStatus = {
  healthy: boolean;
  reason?: string;
  lastUpdate: number;
};

// ============================================================================
// 价格数据类型
// ============================================================================

// 必填字段类型
export type UnifiedPriceFeedRequired = {
  id: string;
  symbol: string;
  price: number;
  timestamp: number;
};

// 可选字段类型
export type UnifiedPriceFeedOptional = {
  protocol?: OracleProtocol;
  chain?: SupportedChain;
  instanceId?: string;
  priceRaw?: bigint;
  confidence?: number;
  source?: string;
  sources?: string[];
  decimals?: number;
  isStale?: boolean;
  stalenessSeconds?: number;
  baseAsset?: string;
  quoteAsset?: string;
  blockNumber?: number;
  txHash?: string;
  logIndex?: number;
};

// 完整类型
export type UnifiedPriceFeed = UnifiedPriceFeedRequired & UnifiedPriceFeedOptional;

export type UnifiedPriceUpdate = {
  feedId: string;
  symbol: string;
  price: bigint;
  timestamp: number;
  confidence?: number;
  txHash?: string;
  blockNumber?: number;
};

// ============================================================================
// 断言和争议类型
// ============================================================================

export type UnifiedAssertion = {
  id: string;
  assertionId: string;
  protocol: OracleProtocol;
  chain: SupportedChain;
  asserter: string;
  claim: string;
  bond: bigint;
  liveness: number;
  expirationTime: number;
  status: 'Pending' | 'Disputed' | 'Resolved' | 'Expired';
  disputer?: string;
  disputeTimestamp?: number;
  settlementTimestamp?: number;
  settlementResolution?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UnifiedDispute = {
  id: string;
  disputeId: string;
  assertionId: string;
  protocol: OracleProtocol;
  chain: SupportedChain;
  disputer: string;
  status: 'Voting' | 'Pending Execution' | 'Executed';
  votingStartTime?: number;
  votingEndTime?: number;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// 统计和警报类型
// ============================================================================

export type UnifiedOracleStats = {
  protocol: OracleProtocol;
  chain: SupportedChain;
  totalAssertions: number;
  totalDisputes: number;
  pendingAssertions: number;
  activeDisputes: number;
  avgBondSize: bigint;
  totalVolume: bigint;
  lastUpdated: number;
};

export type UnifiedAlertRule = {
  id: string;
  name: string;
  enabled: boolean;
  event: UnifiedAlertEvent;
  severity: 'info' | 'warning' | 'critical';
  protocols?: OracleProtocol[];
  chains?: SupportedChain[];
  instances?: string[];
  symbols?: string[];
  params?: Record<string, unknown>;
  channels?: Array<'email' | 'webhook' | 'telegram' | 'slack' | 'pagerduty'>;
  cooldownMinutes?: number;
  maxNotificationsPerHour?: number;
};

export type UnifiedAlert = {
  id: string;
  ruleId?: string;
  event: UnifiedAlertEvent;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  protocol?: OracleProtocol;
  chain?: SupportedChain;
  instanceId?: string;
  symbol?: string;
  context?: Record<string, unknown>;
  status: 'open' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  occurrences?: number;
  firstSeenAt?: string;
  lastSeenAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export type UnifiedAlertEvent = string;

// ============================================================================
// 同步状态类型
// ============================================================================

export type UnifiedSyncState = {
  instanceId?: string;
  protocol?: OracleProtocol;
  chain?: SupportedChain;
  lastSyncedBlock?: number;
  lastSyncedAt?: number;
  lastProcessedBlock?: number;
  lastSyncAt?: string;
  lastSyncDurationMs?: number;
  avgSyncDurationMs?: number;
  isSyncing?: boolean;
  status?: 'healthy' | 'lagging' | 'stalled' | 'error';
  error?: string;
  lastError?: string;
  lastErrorAt?: string;
  retryCount?: number;
  consecutiveFailures?: number;
};

// ============================================================================
// 配置模板类型
// ============================================================================

export type ConfigTemplate = {
  id: string;
  name: string;
  description: string;
  protocol: OracleProtocol;
  chain: SupportedChain;
  config: Partial<UnifiedOracleConfig>;
  isDefault?: boolean;
};

// 数据状态类型
export type DataFreshnessStatus = 'fresh' | 'warning' | 'stale' | 'expired';
export type DataSourceStatus = 'live' | 'circuit-breaker' | 'cache' | 'error';

// 跨预言机价格比较（用于价格聚合引擎）
export type CrossOracleComparison = {
  id: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  prices: Array<{
    protocol: OracleProtocol;
    instanceId: string;
    price: number;
    timestamp: number;
    confidence: number;
    isStale?: boolean;
  }>;
  avgPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  priceRange: number;
  /** 价格区间百分比，小数形式 (如 0.01 = 1%) */
  priceRangePercent: number;
  maxDeviation: number;
  /** 最大偏差百分比，小数形式 (如 0.01 = 1%) */
  maxDeviationPercent: number;
  outlierProtocols: OracleProtocol[];
  recommendedPrice: number;
  recommendationSource: string;
  timestamp: string;
  // 数据状态字段（用于熔断回退标识）
  dataStatus?: {
    /** 数据新鲜度状态 */
    freshness: DataFreshnessStatus;
    /** 数据来源状态 */
    source: DataSourceStatus;
    /** 数据实际生成时间 */
    generatedAt: string;
    /** 如果是缓存数据，缓存时间 */
    cachedAt?: string;
    /** 熔断器打开时间 */
    circuitBreakerOpenedAt?: string;
    /** 预计恢复时间 */
    estimatedRecoveryTime?: string;
    /** 错误信息 */
    errorMessage?: string;
  };
};

export type ProtocolPerformanceRanking = {
  protocol: OracleProtocol;
  score: number;
  rank: number;
  metrics: {
    latency: number;
    reliability: number;
    cost: number;
    coverage: number;
  };
};

// ============================================================================
// Oracle 特定类型 (从 oracleTypes.ts 迁移)
// ============================================================================

export type OracleChain = 'Polygon' | 'PolygonAmoy' | 'Arbitrum' | 'Optimism' | 'Local';

export type OracleStatus = 'Pending' | 'Disputed' | 'Resolved';

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

export type OracleDisputeStatus = 'Voting' | 'Pending Execution' | 'Executed';

export type OracleDispute = {
  id: string;
  chain: OracleChain;
  assertionId: string;
  market: string;
  disputeReason: string;
  disputer: string;
  disputedAt: string;
  votingEndsAt: string;
  status: OracleDisputeStatus;
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
  value?: number;
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

export type OracleConfigPatch = Partial<
  Pick<
    OracleConfig,
    | 'rpcUrl'
    | 'contractAddress'
    | 'chain'
    | 'startBlock'
    | 'maxBlockRange'
    | 'votingPeriodHours'
    | 'confirmationBlocks'
  >
>;

export type OracleConfigField = keyof OracleConfigPatch;

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
  winRate: number;
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

export type OracleAlert = {
  id: number;
  fingerprint: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  status: OracleAlertStatus;
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

export type OracleAlertRuleEvent =
  | 'dispute_created'
  | 'liveness_expiring'
  | 'sync_error'
  | 'stale_sync'
  | 'contract_paused'
  | 'sync_backlog'
  | 'backlog_assertions'
  | 'backlog_disputes'
  | 'market_stale'
  | 'execution_delayed'
  | 'low_participation'
  | 'high_vote_divergence'
  | 'high_dispute_rate'
  | 'slow_api_request'
  | 'high_error_rate'
  | 'database_slow_query'
  | 'price_deviation'
  | 'low_gas';

export type OracleAlertRule = {
  id: string;
  name: string;
  enabled: boolean;
  event: OracleAlertRuleEvent;
  severity: AlertSeverity;
  owner?: string | null;
  runbook?: string | null;
  silencedUntil?: string | null;
  params?: Record<string, unknown>;
  channels?: Array<'webhook' | 'email' | 'telegram'>;
  recipient?: string | null;
};

export type IncidentStatus = 'Open' | 'Mitigating' | 'Resolved';

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
};

// ============================================================================
// 从 common/status 导入的类型别名
// ============================================================================

import type {
  AlertSeverity as AlertSeverityBase,
  OracleAlertStatus as OracleAlertStatusBase,
} from '@/types/common/status';

export type AlertSeverity = AlertSeverityBase;
export type OracleAlertStatus = OracleAlertStatusBase;
