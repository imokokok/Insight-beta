/**
 * Oracle Domain Types - 预言机领域类型
 *
 * 统一整合 oracle/config.ts 和 unifiedOracleTypes.ts 中的类型
 */

import type { EntityId, Timestamp, HealthStatus } from './base';

// ============================================================================
// 协议类型
// ============================================================================

export type OracleProtocol =
  | 'uma'
  | 'chainlink'
  | 'pyth'
  | 'band'
  | 'api3'
  | 'redstone'
  | 'switchboard'
  | 'flux'
  | 'dia';

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

export interface OracleProtocolInfo {
  id: OracleProtocol;
  name: string;
  description: string;
  logoUrl?: string;
  website: string;
  supportedChains: SupportedChain[];
  features: OracleFeature[];
  tvl?: number;
  marketShare?: number;
}

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
// 链类型
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

export interface ChainInfo {
  id: SupportedChain;
  name: string;
  nativeCurrency: string;
  chainId: number;
  explorerUrl: string;
  rpcUrls: string[];
  isTestnet: boolean;
  supportedProtocols: OracleProtocol[];
}

// ============================================================================
// 预言机实例
// ============================================================================

export interface OracleInstance {
  id: EntityId;
  name: string;
  protocol: OracleProtocol;
  chain: SupportedChain;
  enabled: boolean;
  config: OracleConfig;
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  health?: OracleHealthStatus;
}

export interface OracleHealthStatus {
  healthy: boolean;
  reason?: string;
  lastUpdate: number;
  latency?: number;
  blockLag?: number;
}

// ============================================================================
// 配置类型
// ============================================================================

export interface OracleConfig {
  // 连接配置
  rpcUrl: string;
  rpcUrls?: string[];
  chain: SupportedChain;
  timeout?: number;
  retries?: number;

  // 合约配置
  contractAddress?: string;
  contractAddresses?: Record<string, string>;

  // 同步配置
  startBlock?: number;
  maxBlockRange?: number;
  confirmationBlocks?: number;
  syncIntervalMs?: number;

  // UMA 特定
  votingPeriodHours?: number;

  // 协议特定配置
  protocolConfig?: ProtocolSpecificConfig;

  // 认证
  apiKey?: string;
  adminToken?: string;
}

export type OracleConfigPatch = Partial<
  Pick<
    OracleConfig,
    | 'rpcUrl'
    | 'rpcUrls'
    | 'contractAddress'
    | 'contractAddresses'
    | 'chain'
    | 'startBlock'
    | 'maxBlockRange'
    | 'votingPeriodHours'
    | 'confirmationBlocks'
    | 'syncIntervalMs'
    | 'timeout'
    | 'retries'
  >
>;

export type ProtocolSpecificConfig =
  | UMAProtocolConfig
  | ChainlinkProtocolConfig
  | PythProtocolConfig
  | BandProtocolConfig
  | API3ProtocolConfig
  | RedStoneProtocolConfig
  | FluxProtocolConfig
  | DIAProtocolConfig;

// 各协议配置
export interface UMAProtocolConfig {
  optimisticOracleV2Address?: string;
  optimisticOracleV3Address?: string;
  votingPeriodHours?: number;
  defaultBond?: bigint;
}

export interface ChainlinkProtocolConfig {
  dataFeedAddress?: string;
  registryAddress?: string;
  linkTokenAddress?: string;
  heartbeat?: number;
  deviationThreshold?: number;
  decimals?: number;
  description?: string;
}

export interface PythProtocolConfig {
  pythContractAddress?: string;
  priceFeedIds?: string[];
  stalenessThreshold?: number;
}

export interface BandProtocolConfig {
  endpoint?: string;
  dataSource?: string;
}

export interface API3ProtocolConfig {
  airnodeAddress?: string;
  endpointId?: string;
  sponsorAddress?: string;
}

export interface RedStoneProtocolConfig {
  feedIds?: string[];
  apiEndpoint?: string;
  stalenessThreshold?: number;
}

export interface FluxProtocolConfig {
  feedId?: string;
  apiEndpoint?: string;
  roundId?: bigint;
}

export interface DIAProtocolConfig {
  assets?: string[];
  apiEndpoint?: string;
}

// ============================================================================
// 配置模板
// ============================================================================

export interface ConfigTemplate {
  id: EntityId;
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// 批量操作
// ============================================================================

export interface BatchConfigUpdate {
  instanceId: EntityId;
  config: Partial<OracleConfig>;
}

export interface BatchUpdateResult {
  success: EntityId[];
  failed: Array<{ instanceId: EntityId; error: string }>;
}

// ============================================================================
// 统计类型
// ============================================================================

export interface OracleStats {
  protocol: OracleProtocol;
  chain: SupportedChain;
  totalAssertions: number;
  totalDisputes: number;
  pendingAssertions: number;
  activeDisputes: number;
  avgBondSize: bigint;
  totalVolume: bigint;
  lastUpdated: number;
}

// ============================================================================
// 同步状态
// ============================================================================

export interface SyncState {
  instanceId?: EntityId;
  protocol?: OracleProtocol;
  chain?: SupportedChain;
  lastSyncedBlock?: number;
  lastSyncedAt?: number;
  lastProcessedBlock?: number;
  lastSyncAt?: Timestamp;
  lastSyncDurationMs?: number;
  avgSyncDurationMs?: number;
  isSyncing?: boolean;
  status?: HealthStatus | 'lagging' | 'stalled' | 'error';
  error?: string;
  lastError?: string;
  lastErrorAt?: Timestamp;
  retryCount?: number;
  consecutiveFailures?: number;
}
