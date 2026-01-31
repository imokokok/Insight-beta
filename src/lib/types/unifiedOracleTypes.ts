/**
 * Unified Oracle Types - 通用预言机监控平台类型定义
 *
 * 支持多预言机协议的统一抽象层
 */

// ============================================================================
// 预言机协议类型定义
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

export type OracleProtocolInfo = {
  id: OracleProtocol;
  name: string;
  description: string;
  logoUrl: string;
  website: string;
  supportedChains: string[];
  features: OracleFeature[];
  tvl?: number;
  marketShare?: number;
};

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
  heartbeat?: number; // 价格更新间隔（秒）
  deviationThreshold?: number; // 偏差阈值（%）
  decimals?: number;
  description?: string;
};

export type PythProtocolConfig = {
  pythContractAddress?: string;
  priceFeedIds?: string[];
  stalenessThreshold?: number; // 数据新鲜度阈值（秒）
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
// 通用数据实体
// ============================================================================

export type UnifiedPriceFeed = {
  id: string;
  instanceId: string;
  protocol: OracleProtocol;
  chain: SupportedChain;

  // 价格数据
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  priceRaw: string; // 原始精度
  decimals: number;

  // 时间戳
  timestamp: string;
  blockNumber?: number;

  // 元数据
  confidence?: number; // Pyth 等使用
  sources?: string[] | number; // 数据源（可以是地址数组或数量）

  // 状态
  isStale: boolean;
  stalenessSeconds?: number;

  // 交易信息
  txHash?: string;
  logIndex?: number;
};

export type UnifiedPriceUpdate = {
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

export type UnifiedAssertion = {
  id: string;
  instanceId: string;
  protocol: OracleProtocol;
  chain: SupportedChain;

  // 断言内容
  identifier: string;
  description?: string;
  proposer: string;
  proposedValue?: string;

  // 时间线
  proposedAt: string;
  expiresAt?: string;
  settledAt?: string;

  // 状态
  status: 'active' | 'expired' | 'disputed' | 'settled' | 'cancelled';
  settlementValue?: string;

  // 经济参数
  bondAmount?: number;
  bondToken?: string;
  reward?: number;

  // 争议信息
  disputed?: boolean;
  disputer?: string;
  disputedAt?: string;

  // 交易信息
  txHash: string;
  blockNumber: number;
  logIndex: number;
};

export type UnifiedDispute = {
  id: string;
  instanceId: string;
  protocol: OracleProtocol;
  chain: SupportedChain;

  assertionId: string;
  disputer: string;
  reason?: string;

  disputedAt: string;
  votingEndsAt?: string;
  resolvedAt?: string;

  status: 'active' | 'resolved' | 'dismissed';
  outcome?: 'valid' | 'invalid';

  // 投票统计
  votesFor?: number;
  votesAgainst?: number;
  totalVotes?: number;

  // 经济参数
  disputeBond?: number;

  // 交易信息
  txHash: string;
  blockNumber: number;
  logIndex: number;
};

// ============================================================================
// 通用统计指标
// ============================================================================

export type UnifiedOracleStats = {
  instanceId: string;
  protocol: OracleProtocol;
  chain: SupportedChain;

  // 通用指标
  totalUpdates: number;
  updates24h: number;
  lastUpdateAt: string;

  // 价格特定指标
  currentPrice?: number;
  priceChange24h?: number;
  volatility24h?: number;

  // 断言特定指标
  totalAssertions?: number;
  activeAssertions?: number;
  disputedAssertions?: number;
  settledAssertions?: number;

  // 争议特定指标
  totalDisputes?: number;
  activeDisputes?: number;
  resolvedDisputes?: number;

  // 性能指标
  avgResponseTime?: number;
  uptime?: number;

  // 经济指标
  totalVolume?: number;
  totalValueLocked?: number;

  updatedAt: string;
};

// ============================================================================
// 跨预言机对比
// ============================================================================

export type CrossOracleComparison = {
  id: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;

  // 各预言机价格
  prices: Array<{
    protocol: OracleProtocol;
    instanceId: string;
    price: number;
    timestamp: string;
    confidence?: number;
    isStale: boolean;
  }>;

  // 对比分析
  avgPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  priceRange: number;
  priceRangePercent: number;

  // 偏差分析
  maxDeviation: number;
  maxDeviationPercent: number;
  outlierProtocols: OracleProtocol[];

  // 推荐
  recommendedPrice: number;
  recommendationSource: string;

  timestamp: string;
};

export type OraclePerformanceRanking = {
  protocol: OracleProtocol;
  rank: number;
  score: number;

  // 细分指标
  accuracy: number;
  uptime: number;
  latency: number;
  coverage: number; // 覆盖的资产/链数量
  costEfficiency: number;

  // 统计
  totalFeeds: number;
  supportedChains: number;
  avgUpdateFrequency: number;

  // 趋势
  trend: 'up' | 'stable' | 'down';
  trendPercent: number;
};

// ============================================================================
// 告警与监控
// ============================================================================

export type UnifiedAlertRule = {
  id: string;
  name: string;
  enabled: boolean;

  // 触发条件
  event: UnifiedAlertEvent;
  severity: 'info' | 'warning' | 'critical';

  // 过滤条件
  protocols?: OracleProtocol[];
  chains?: SupportedChain[];
  instances?: string[];
  symbols?: string[];

  // 阈值配置
  params?: {
    priceDeviationPercent?: number;
    stalenessSeconds?: number;
    minConfidence?: number;
    maxLatencyMs?: number;
    uptimeThreshold?: number;
    [key: string]: unknown;
  };

  // 通知配置
  channels: Array<'webhook' | 'email' | 'telegram' | 'slack' | 'pagerduty'>;
  recipients?: string[];

  // 抑制配置
  cooldownMinutes?: number;
  maxNotificationsPerHour?: number;

  runbook?: string;
  owner?: string;
};

export type UnifiedAlertEvent =
  // 价格相关
  | 'price_deviation'
  | 'price_stale'
  | 'price_volatility_spike'
  | 'price_update_failed'

  // 断言相关
  | 'assertion_created'
  | 'assertion_expiring'
  | 'assertion_disputed'
  | 'assertion_settled'

  // 争议相关
  | 'dispute_created'
  | 'dispute_resolved'
  | 'voting_period_ending'

  // 系统相关
  | 'sync_error'
  | 'sync_stale'
  | 'rpc_failure'
  | 'contract_error'

  // 性能相关
  | 'high_latency'
  | 'low_uptime'
  | 'rate_limit_hit';

export type UnifiedAlert = {
  id: string;
  ruleId?: string;

  event: UnifiedAlertEvent;
  severity: 'info' | 'warning' | 'critical';

  title: string;
  message: string;

  // 关联实体
  protocol?: OracleProtocol;
  chain?: SupportedChain;
  instanceId?: string;
  symbol?: string;
  assertionId?: string;
  disputeId?: string;

  // 上下文数据
  context: Record<string, unknown>;

  // 状态
  status: 'open' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;

  // 统计
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;

  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// API 响应类型
// ============================================================================

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

export type UnifiedApiResponse<T> =
  | { success: true; data: T; meta?: Record<string, unknown> }
  | { success: false; error: { code: string; message: string; details?: unknown } };

// ============================================================================
// 配置模板
// ============================================================================

export type UnifiedConfigTemplate = {
  id: string;
  name: string;
  description?: string;
  protocol: OracleProtocol;

  // 模板配置
  config: Partial<UnifiedOracleConfig>;

  // 适用条件
  supportedChains: SupportedChain[];
  requirements?: string[];

  // 元数据
  isDefault: boolean;
  isOfficial: boolean;
  author?: string;

  // 统计
  usageCount: number;
  rating?: number;

  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// 同步状态
// ============================================================================

export type UnifiedSyncState = {
  instanceId: string;
  protocol: OracleProtocol;
  chain: SupportedChain;

  // 区块同步状态
  lastProcessedBlock: number;
  latestBlock: number;
  safeBlock: number;
  lagBlocks: number;

  // 同步性能
  lastSyncAt: string;
  lastSyncDurationMs: number;
  avgSyncDurationMs: number;

  // 健康状态
  status: 'healthy' | 'lagging' | 'stalled' | 'error';
  consecutiveFailures: number;
  lastError?: string;
  lastErrorAt?: string;

  // RPC 状态
  activeRpcUrl?: string;
  rpcHealth: 'healthy' | 'degraded' | 'unhealthy';

  updatedAt: string;
};
