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
  totalSubmissions: number;
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

// ==================== Pyth 特定类型 ====================

export interface PythFeed extends BaseProtocolFeed {
  confidence: number;
  sources: number;
  publishTime: string;
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
  disputeCount: number;
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

// ==================== API3 特定类型 ====================

export interface API3Feed extends BaseProtocolFeed {
  dapiName: string;
  beaconCount: number;
  updateThreshold: number;
}

// ==================== 通用协议数据类型 ====================

export interface ProtocolData {
  protocol: OracleProtocol;
  feeds?: BaseProtocolFeed[];
  nodes?: BaseProtocolNode[];
  stats?: BaseProtocolStats;
  lastUpdated: string;
}

// ==================== 支持的链 ====================

export { SUPPORTED_CHAINS } from '@/lib/types/chains';
