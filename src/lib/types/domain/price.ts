/**
 * Price Domain Types - 价格领域类型
 */

import type { EntityId, Timestamp } from './base';
import type { OracleProtocol, SupportedChain } from './oracle';

// ============================================================================
// 价格数据
// ============================================================================

export interface PriceFeed {
  id: EntityId;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  protocol?: OracleProtocol;
  chain?: SupportedChain;
  instanceId?: EntityId;
  price: number;
  priceRaw?: bigint;
  timestamp: number;
  confidence?: number;
  source?: string;
  sources?: string[];
  decimals?: number;
  isStale?: boolean;
  stalenessSeconds?: number;
  blockNumber?: number;
  txHash?: string;
  logIndex?: number;
}

export interface PriceUpdate {
  feedId: EntityId;
  symbol: string;
  price: bigint;
  timestamp: number;
  confidence?: number;
  txHash?: string;
  blockNumber?: number;
}

export interface PriceHistory {
  id: EntityId;
  feedId: EntityId;
  symbol: string;
  price: number;
  timestamp: Timestamp;
  granularity: 'raw' | '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  volume?: number;
  confidence?: number;
}

// ============================================================================
// 价格聚合
// ============================================================================

export interface AggregatedPrice {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  timestamp: number;
  sources: PriceSource[];
  confidence: number;
  method: 'median' | 'weighted' | 'average' | 'best';
}

export interface PriceSource {
  protocol: OracleProtocol;
  instanceId: EntityId;
  price: number;
  timestamp: number;
  confidence: number;
  weight: number;
  isStale: boolean;
}

// ============================================================================
// 跨协议比较
// ============================================================================

export interface CrossProtocolComparison {
  id: EntityId;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  prices: Array<{
    protocol: OracleProtocol;
    instanceId: EntityId;
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
  priceRangePercent: number;
  maxDeviation: number;
  maxDeviationPercent: number;
  outlierProtocols: OracleProtocol[];
  recommendedPrice: number;
  recommendationSource: string;
  timestamp: Timestamp;
}

// CrossOracleComparison 是 CrossProtocolComparison 的别名，用于向后兼容
export type CrossOracleComparison = CrossProtocolComparison;

// ============================================================================
// 价格偏差检测
// ============================================================================

export interface PriceDeviation {
  id: EntityId;
  symbol: string;
  referencePrice: number;
  comparedPrice: number;
  deviation: number;
  deviationPercent: number;
  threshold: number;
  isAnomaly: boolean;
  protocols: OracleProtocol[];
  timestamp: Timestamp;
}

export interface DeviationThreshold {
  symbol: string;
  threshold: number;
  warningThreshold: number;
  criticalThreshold: number;
}

// ============================================================================
// 市场数据
// ============================================================================

export interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  change24hPercent: number;
  volume24h: number;
  marketCap?: number;
  high24h: number;
  low24h: number;
  timestamp: Timestamp;
}
