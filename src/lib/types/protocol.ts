/**
 * Protocol Types - 协议相关的统一类型定义
 */

import { type OracleProtocol } from './oracle';

// ==================== 基础协议类型 ====================

export interface BaseProtocolFeed {
  id: string;
  symbol: string;
  name: string;
  price: number;
  decimals: number;
  status: 'active' | 'stale' | 'error';
  updatedAt: string;
  chain: string;
}

export interface BaseProtocolStats {
  totalFeeds: number;
  activeFeeds: number;
  staleFeeds: number;
  totalNodes: number;
  avgUpdateLatency: number;
  networkUptime: number;
}

export interface BaseProtocolNode {
  id: string;
  name: string;
  address: string;
  status: 'active' | 'inactive';
  lastUpdate: string;
  totalRequests: number;
  accuracy: number;
}

// ==================== Chainlink 特定类型 ====================

export interface ChainlinkFeed extends BaseProtocolFeed {
  roundId: string;
  answeredInRound: string;
  contractAddress: string;
  heartbeat: number;
  deviationThreshold: number;
}

export interface ChainlinkNode extends BaseProtocolNode {
  lastSubmission: string;
  totalSubmissions: number;
  successRate: number;
}

export interface ChainlinkStats extends BaseProtocolStats {
  /** Total number of price submissions across all feeds */
  totalSubmissions?: number;
}

// ==================== Pyth 特定类型 ====================

export interface PythFeed extends BaseProtocolFeed {
  confidence: number;
  sources: number;
  publishTime: string;
}

export interface PythPublisher {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  accuracy: number;
  totalPublishes: number;
  lastPublish: string;
}

export interface PythStats extends BaseProtocolStats {
  totalPublishers: number;
  avgConfidence: number;
}

// ==================== UMA 特定类型 ====================

export interface UMAAssertion {
  id: string;
  claim: string;
  asserter: string;
  bond: number;
  status: 'pending' | 'settled' | 'disputed' | 'expired';
  assertionTime: string;
  expirationTime: string;
  settlementTime?: string;
  disputedBy?: string;
}

export interface UMADispute {
  id: string;
  assertionId: string;
  disputer: string;
  bond: number;
  disputeTime: string;
  status: 'pending' | 'resolved';
  outcome?: 'valid' | 'invalid';
}

// ==================== Band 特定类型 ====================

export interface BandFeed extends BaseProtocolFeed {
  requestId: string;
  blockHeight: number;
  validatorCount: number;
}

export interface BandValidator extends BaseProtocolNode {
  votingPower: number;
  commission: number;
  delegators: number;
}

// ==================== API3 特定类型 ====================

export interface API3Feed extends BaseProtocolFeed {
  dapiName: string;
  beaconCount: number;
  updateThreshold: number;
}

export interface API3Airnode extends BaseProtocolNode {
  endpointId: string;
  xpub: string;
  sponsoredRequests: number;
}

// ==================== RedStone 特定类型 ====================

export interface RedStonePackage {
  id: string;
  symbol: string;
  dataFeedId: string;
  timestamp: string;
  value: number;
  liteSignature: string;
}

export interface RedStoneService {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  dataPackages: number;
  avgLatency: number;
  reliability: number;
}

// ==================== Switchboard 特定类型 ====================

export interface SwitchboardAggregator {
  id: string;
  name: string;
  queueId: string;
  batchSize: number;
  minOracleResults: number;
  varianceThreshold: number;
}

export interface SwitchboardOracle extends BaseProtocolNode {
  queueId: string;
  stake: number;
  jobCount: number;
  lastHeartbeat: string;
}

// ==================== DIA 特定类型 ====================

export interface DIAScraper {
  id: string;
  exchange: string;
  pair: string;
  status: 'active' | 'inactive';
  reliability: number;
  lastUpdate: string;
  updateFrequency: number;
}

export interface DIAAsset extends BaseProtocolFeed {
  source: string;
  volume24h: number;
  marketCap: number;
}

// ==================== Flux 特定类型 ====================

export interface FluxRequest {
  id: string;
  requester: string;
  dataSource: string;
  status: 'pending' | 'fulfilled' | 'expired';
  createdAt: string;
  fulfilledAt?: string;
  finalityThreshold: number;
  providers: FluxProvider[];
}

export interface FluxProvider extends BaseProtocolNode {
  stake: number;
  responseTime: number;
  accuracy: number;
}

// ==================== 通用协议数据类型 ====================

export interface ProtocolData {
  protocol: OracleProtocol;
  feeds?: BaseProtocolFeed[];
  nodes?: BaseProtocolNode[];
  stats?: BaseProtocolStats;
  lastUpdated: string;
}

// ==================== 页面配置类型 ====================

export interface ProtocolPageConfig {
  protocol: OracleProtocol;
  title: string;
  description: string;
  icon: string;
  officialUrl: string;
  supportedChains: { id: string; name: string; icon: string }[];
  tabs: ProtocolTabConfig[];
}

export interface ProtocolTabConfig {
  id: string;
  label: string;
  icon: string;
  component: string;
}

// ==================== 支持的链 ====================

export const SUPPORTED_CHAINS = [
  { id: 'ethereum', name: 'Ethereum', icon: '⬡' },
  { id: 'polygon', name: 'Polygon', icon: '💜' },
  { id: 'arbitrum', name: 'Arbitrum', icon: '🔷' },
  { id: 'optimism', name: 'Optimism', icon: '🔴' },
  { id: 'base', name: 'Base', icon: '🔵' },
  { id: 'avalanche', name: 'Avalanche', icon: '❄️' },
  { id: 'bsc', name: 'BSC', icon: '🟡' },
  { id: 'solana', name: 'Solana', icon: '◎' },
  { id: 'near', name: 'NEAR', icon: '🌐' },
] as const;
