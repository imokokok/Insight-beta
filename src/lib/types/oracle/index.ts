/**
 * Oracle Types - 统一预言机监控平台类型定义
 *
 * 合并 oracleTypes.ts 和 unifiedOracleTypes.ts
 * 支持多预言机协议的统一抽象层
 */

// ============================================================================
// 协议类型定义
// ============================================================================

export type OracleProtocol =
  | 'insight' // 原生 OracleMonitor
  | 'uma' // UMA Optimistic Oracle
  | 'chainlink' // Chainlink Data Feeds
  | 'pyth' // Pyth Network
  | 'band' // Band Protocol
  | 'api3' // API3
  | 'redstone' // RedStone
  | 'switchboard' // Switchboard
  | 'flux' // Flux
  | 'dia'; // DIA

export const ORACLE_PROTOCOLS: OracleProtocol[] = [
  'insight',
  'uma',
  'chainlink',
  'pyth',
  'band',
  'api3',
  'redstone',
  'switchboard',
  'flux',
  'dia',
];

export const PROTOCOL_DISPLAY_NAMES: Record<OracleProtocol, string> = {
  insight: 'Insight Oracle',
  uma: 'UMA',
  chainlink: 'Chainlink',
  pyth: 'Pyth Network',
  band: 'Band Protocol',
  api3: 'API3',
  redstone: 'RedStone',
  switchboard: 'Switchboard',
  flux: 'Flux',
  dia: 'DIA',
};

export const PROTOCOL_DESCRIPTIONS: Record<OracleProtocol, string> = {
  insight: '原生 OracleMonitor 协议',
  uma: 'Optimistic Oracle with assertion and dispute mechanisms',
  chainlink: 'Industry-standard decentralized oracle network',
  pyth: 'Low-latency financial data from institutional sources',
  band: 'Cross-chain data oracle platform',
  api3: 'First-party oracle with Airnode',
  redstone: 'Modular oracle with on-demand data',
  switchboard: 'Solana and EVM compatible oracle network',
  flux: 'Decentralized oracle aggregator',
  dia: 'Transparent and verifiable data feeds',
};

// 支持断言功能的协议列表
export const SUPPORTED_ASSERTION_PROTOCOLS: OracleProtocol[] = ['insight', 'uma'];

export type OracleFeature =
  | 'price_feeds'
  | 'randomness'
  | 'automation'
  | 'ccip'
  | 'functions'
  | 'proof_of_reserve'
  | 'dispute_resolution'
  | 'staking'
  | 'governance';

export type OracleProtocolInfo = {
  id: OracleProtocol;
  name: string;
  description: string;
  logoUrl?: string;
  website: string;
  supportedChains: SupportedChain[];
  features: OracleFeature[];
  tvl?: number;
  marketShare?: number;
};

export const PROTOCOL_INFO: Record<OracleProtocol, OracleProtocolInfo> = {
  insight: {
    id: 'insight',
    name: 'Insight Oracle',
    description: PROTOCOL_DESCRIPTIONS.insight,
    website: 'https://oraclemonitor.io',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
    features: ['price_feeds', 'dispute_resolution'],
  },
  uma: {
    id: 'uma',
    name: 'UMA',
    description: PROTOCOL_DESCRIPTIONS.uma,
    website: 'https://umaproject.org',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'],
    features: ['price_feeds', 'dispute_resolution', 'governance'],
  },
  chainlink: {
    id: 'chainlink',
    name: 'Chainlink',
    description: PROTOCOL_DESCRIPTIONS.chainlink,
    website: 'https://chain.link',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'bsc'],
    features: ['price_feeds', 'randomness', 'automation', 'ccip', 'functions'],
  },
  pyth: {
    id: 'pyth',
    name: 'Pyth Network',
    description: PROTOCOL_DESCRIPTIONS.pyth,
    website: 'https://pyth.network',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'solana'],
    features: ['price_feeds'],
  },
  band: {
    id: 'band',
    name: 'Band Protocol',
    description: PROTOCOL_DESCRIPTIONS.band,
    website: 'https://bandprotocol.com',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
    features: ['price_feeds'],
  },
  api3: {
    id: 'api3',
    name: 'API3',
    description: PROTOCOL_DESCRIPTIONS.api3,
    website: 'https://api3.org',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
    features: ['price_feeds'],
  },
  redstone: {
    id: 'redstone',
    name: 'RedStone',
    description: PROTOCOL_DESCRIPTIONS.redstone,
    website: 'https://redstone.finance',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'],
    features: ['price_feeds'],
  },
  switchboard: {
    id: 'switchboard',
    name: 'Switchboard',
    description: PROTOCOL_DESCRIPTIONS.switchboard,
    website: 'https://switchboard.xyz',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'solana'],
    features: ['price_feeds', 'randomness'],
  },
  flux: {
    id: 'flux',
    name: 'Flux',
    description: PROTOCOL_DESCRIPTIONS.flux,
    website: 'https://fluxprotocol.org',
    supportedChains: ['ethereum', 'polygon', 'arbitrum'],
    features: ['price_feeds'],
  },
  dia: {
    id: 'dia',
    name: 'DIA',
    description: PROTOCOL_DESCRIPTIONS.dia,
    website: 'https://diadata.org',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'],
    features: ['price_feeds'],
  },
};

// ============================================================================
// 链类型定义
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

// 向后兼容
export type OracleChain = 'Polygon' | 'PolygonAmoy' | 'Arbitrum' | 'Optimism' | 'Local';
export type UMAChain = 'Ethereum' | 'Polygon' | 'Arbitrum' | 'Optimism' | 'Base' | 'PolygonAmoy';

// ============================================================================
// 实例配置
// ============================================================================

export type OracleInstance = {
  id: string;
  name: string;
  protocol: OracleProtocol;
  chain: SupportedChain;
  enabled: boolean;
  config: OracleConfig;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type OracleConfig = {
  // 通用配置
  rpcUrl: string;
  rpcUrls?: string[];
  chain: SupportedChain;

  // 合约配置
  contractAddress?: string;
  contractAddresses?: Record<string, string>;

  // 同步配置
  startBlock?: number;
  maxBlockRange?: number;
  confirmationBlocks?: number;
  syncIntervalMs?: number;
  votingPeriodHours?: number;

  // 协议特定配置
  protocolConfig?: ProtocolSpecificConfig;

  // 认证配置
  apiKey?: string;
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

export type ProtocolSpecificConfig =
  | UMAProtocolConfig
  | ChainlinkProtocolConfig
  | PythProtocolConfig
  | BandProtocolConfig
  | API3ProtocolConfig
  | RedStoneProtocolConfig
  | FluxProtocolConfig
  | DIAProtocolConfig;

export type UMAProtocolConfig = {
  optimisticOracleV2Address?: string;
  optimisticOracleV3Address?: string;
  votingPeriodHours?: number;
};

export type ChainlinkProtocolConfig = {
  dataFeedAddress?: string;
  registryAddress?: string;
  linkTokenAddress?: string;
  heartbeat?: number;
  deviationThreshold?: number;
  decimals?: number;
  description?: string;
};

export type PythProtocolConfig = {
  pythContractAddress?: string;
  priceFeedIds?: string[];
  stalenessThreshold?: number;
};

export type BandProtocolConfig = {
  endpoint?: string;
  dataSource?: string;
};

export type API3ProtocolConfig = {
  airnodeAddress?: string;
  endpointId?: string;
  sponsorAddress?: string;
};

export type RedStoneProtocolConfig = {
  feedIds?: string[];
  apiEndpoint?: string;
  stalenessThreshold?: number;
};

export type FluxProtocolConfig = {
  feedId?: string;
  apiEndpoint?: string;
  roundId?: bigint;
};

export type DIAProtocolConfig = {
  assets?: string[];
  apiEndpoint?: string;
};

// ============================================================================
// 价格数据
// ============================================================================

export type PriceFeed = {
  id: string;
  instanceId: string;
  protocol: OracleProtocol;
  chain: SupportedChain;

  // 价格数据
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  priceRaw: string;
  decimals: number;

  // 时间戳
  timestamp: string;
  blockNumber?: number;

  // 元数据
  confidence?: number;
  sources?: string[] | number;

  // 状态
  isStale: boolean;
  stalenessSeconds?: number;

  // 交易信息
  txHash?: string;
  logIndex?: number;
};

export type PriceUpdate = {
  id: string;
  feedId: string;
  instanceId: string;
  protocol: OracleProtocol;

  previousPrice: number;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;

  timestamp: string;
  blockNumber?: number;
  txHash?: string;
};

// ============================================================================
// 断言和争议
// ============================================================================

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

  // 断言内容
  identifier: string;
  description?: string;
  assertion?: string;
  market?: string;

  // 参与者
  asserter?: string;
  proposer: string;
  proposedValue?: string | bigint;

  // 时间线
  assertedAt?: string;
  proposedAt: string;
  livenessEndsAt?: string;
  expiresAt?: string;
  settledAt?: string;
  resolvedAt?: string;

  // 状态
  status: AssertionStatus;
  settlementResolution?: boolean;
  settlementValue?: string | bigint;

  // 经济参数
  bondUsd?: number;
  bondAmount?: number;
  bondToken?: string;
  bond?: bigint;
  reward?: number | bigint;

  // 争议信息
  disputed?: boolean;
  disputer?: string;
  disputedAt?: string;

  // 交易信息
  txHash: string;
  blockNumber: number | string;
  logIndex: number;

  // 版本（UMA特定）
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

// ============================================================================
// 统计数据
// ============================================================================

export type OracleStats = {
  instanceId?: string;
  protocol?: OracleProtocol;
  chain?: SupportedChain;

  // 通用指标
  totalUpdates?: number;
  updates24h?: number;
  lastUpdateAt?: string;

  // 价格特定
  currentPrice?: number;
  priceChange24h?: number;
  volatility24h?: number;

  // 断言特定
  totalAssertions?: number;
  activeAssertions?: number;
  disputedAssertions?: number;
  settledAssertions?: number;
  proposedAssertions?: number;

  // 争议特定
  totalDisputes?: number;
  activeDisputes?: number;
  resolvedDisputes?: number;

  // 性能指标
  avgResponseTime?: number;
  uptime?: number;

  // 经济指标
  totalVolume?: number;
  totalValueLocked?: number;
  tvsUsd?: number;
  resolved24h?: number;
  avgResolutionMinutes?: number;

  updatedAt?: string;
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

// ============================================================================
// 跨协议对比
// ============================================================================

export type CrossProtocolComparison = {
  id: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;

  prices: Array<{
    protocol: OracleProtocol;
    instanceId: string;
    price: number;
    timestamp: string;
    confidence?: number;
    isStale: boolean;
  }>;

  avgPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  priceRange: number;
  priceRangePercent: number;

  maxDeviation: number;
  maxDeviationPercent: number;
  outlierProtocols: OracleProtocol[];

  recommendedPrice: number;
  recommendationSource: string;

  timestamp: string;
};

export type ProtocolPerformanceRanking = {
  protocol: OracleProtocol;
  rank: number;
  score: number;

  accuracy: number;
  uptime: number;
  latency: number;
  coverage: number;
  costEfficiency: number;

  totalFeeds: number;
  supportedChains: number;
  avgUpdateFrequency: number;

  trend: 'up' | 'stable' | 'down';
  trendPercent: number;
};

// ============================================================================
// 告警与监控
// ============================================================================

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus =
  | 'Open'
  | 'Acknowledged'
  | 'Resolved'
  | 'open'
  | 'acknowledged'
  | 'resolved';

export type AlertEvent =
  | 'price_deviation'
  | 'price_stale'
  | 'price_volatility_spike'
  | 'price_update_failed'
  | 'assertion_created'
  | 'assertion_expiring'
  | 'assertion_disputed'
  | 'assertion_settled'
  | 'dispute_created'
  | 'dispute_resolved'
  | 'voting_period_ending'
  | 'sync_error'
  | 'sync_stale'
  | 'rpc_failure'
  | 'contract_error'
  | 'high_latency'
  | 'low_uptime'
  | 'rate_limit_hit'
  | 'dispute_created'
  | 'liveness_expiring'
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
  | 'low_gas';

export type AlertRule = {
  id: string;
  name: string;
  enabled: boolean;
  event: AlertEvent;
  severity: AlertSeverity;

  protocols?: OracleProtocol[];
  chains?: SupportedChain[];
  instances?: string[];
  symbols?: string[];

  params?: Record<string, unknown> & {
    priceDeviationPercent?: number;
    stalenessSeconds?: number;
    minConfidence?: number;
    maxLatencyMs?: number;
    uptimeThreshold?: number;
  };

  channels?: Array<'webhook' | 'email' | 'telegram' | 'slack' | 'pagerduty'>;
  recipients?: string[];

  cooldownMinutes?: number;
  maxNotificationsPerHour?: number;

  runbook?: string;
  owner?: string;
  silencedUntil?: string | null;
};

export type Alert = {
  id: number | string;
  ruleId?: string;
  fingerprint?: string;

  event?: AlertEvent;
  type?: string;
  severity: AlertSeverity;

  title: string;
  message: string;

  protocol?: OracleProtocol;
  chain?: SupportedChain;
  instanceId?: string;
  symbol?: string;
  entityType?: string | null;
  entityId?: string | null;
  assertionId?: string;
  disputeId?: string;

  context?: Record<string, unknown>;

  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string | null;
  resolvedBy?: string;
  resolvedAt?: string | null;

  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// 事件和审计
// ============================================================================

export type AuditLogEntry = {
  id: number;
  createdAt: string;
  actor: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: unknown;
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

// ============================================================================
// 同步状态
// ============================================================================

export type SyncState = {
  instanceId: string;
  protocol: OracleProtocol;
  chain: SupportedChain;

  lastProcessedBlock: number;
  latestBlock: number;
  safeBlock: number;
  lagBlocks: number;

  lastSyncAt: string;
  lastSyncDurationMs: number;
  avgSyncDurationMs: number;

  status: 'healthy' | 'lagging' | 'stalled' | 'error';
  consecutiveFailures: number;
  lastError?: string;
  lastErrorAt?: string;

  activeRpcUrl?: string;
  rpcHealth: 'healthy' | 'degraded' | 'unhealthy';

  updatedAt: string;
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

// ============================================================================
// 配置模板和Webhook
// ============================================================================

export type ConfigTemplate = {
  id: string;
  name: string;
  description?: string;
  protocol: OracleProtocol;
  config: Partial<OracleConfig>;
  supportedChains: SupportedChain[];
  requirements?: string[];
  isDefault: boolean;
  isOfficial: boolean;
  author?: string;
  usageCount: number;
  rating?: number;
  createdAt: string;
  updatedAt: string;
};

export type WebhookEvent =
  | 'config.created'
  | 'config.updated'
  | 'config.deleted'
  | 'config.batch_updated'
  | 'template.applied';

export type WebhookConfig = {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WebhookPayload = {
  event: WebhookEvent;
  timestamp: string;
  data: unknown;
  signature?: string;
};

export type BatchConfigUpdate = {
  instanceId: string;
  config: Partial<OracleConfig>;
};

export type BatchUpdateResult = {
  success: string[];
  failed: Array<{ instanceId: string; error: string }>;
};

// ============================================================================
// 运维指标
// ============================================================================

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
  status: 'met' | 'degraded' | 'breached';
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

// ============================================================================
// 风险分析
// ============================================================================

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

// ============================================================================
// API 响应类型
// ============================================================================

export type ApiOk<T extends Record<string, unknown>> = { ok: true } & T;
export type ApiError = {
  ok: false;
  error: string | { code: string; details?: unknown };
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export type ApiResponse<T> =
  | { success: true; data: T; meta?: Record<string, unknown> }
  | { success: false; error: { code: string; message: string; details?: unknown } };

export type ListResult<T> = {
  items: T[];
  total: number;
  nextCursor: number | null;
};

// ============================================================================
// 缓存和性能
// ============================================================================

export type CacheStats = {
  local: {
    size: number;
    type: 'in-memory';
    ttlMs: number;
  };
  distributed: {
    keys: number;
    connected: boolean;
    type: 'redis';
    ttlSeconds: number;
  };
};

// ============================================================================
// 数据库行类型（向后兼容）
// ============================================================================

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
  status: AssertionStatus;
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

// ============================================================================
// UMA 特定类型（向后兼容）
// ============================================================================

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
