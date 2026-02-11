/**
 * Unified Oracle Types - 通用预言机监控平台类型定义
 *
 * 支持多预言机协议的统一抽象层
 */

// ============================================================================
// 预言机协议类型定义
// ============================================================================

export type OracleProtocol =
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
  | SwitchboardProtocolConfig
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
  timeout?: number; // RPC 超时时间（毫秒）
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

export type SwitchboardProtocolConfig = {
  programId?: string;
  queueAddress?: string;
  feedAddresses?: string[];
  stalenessThreshold?: number;
  timeoutMs?: number;
  commitment?: 'processed' | 'confirmed' | 'finalized';
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

// ============================================================================
// 跨协议比较类型
// ============================================================================

export type CrossProtocolComparison = {
  symbol: string;
  timestamp: number;
  prices: Record<
    OracleProtocol,
    {
      price: number;
      confidence: number;
      timestamp: number;
    }
  >;
  priceDeviation: number;
  recommendedProtocol?: OracleProtocol;
};

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
