/**
 * Price Types - 价格数据相关类型定义
 */

import type { SupportedChain } from './chain';
import type { OracleProtocol } from './protocol';

export type PriceFeed = {
  id: string;
  instanceId: string;
  protocol: OracleProtocol;
  chain: SupportedChain;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  priceRaw: string;
  decimals: number;
  timestamp: string;
  blockNumber?: number;
  confidence?: number;
  sources?: string[] | number;
  isStale: boolean;
  stalenessSeconds?: number;
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
