/**
 * Cross-Chain Analysis Types - 跨链价格分析类型定义
 *
 * 支持跨链价格对比、历史偏差分析等功能
 */

import type { OracleProtocol, SupportedChain } from './unifiedOracleTypes';

export type CrossChainAnalysisType =
  | 'price_comparison' // 价格对比
  | 'deviation_analysis' // 偏差分析
  | 'convergence_trend' // 收敛趋势
  | 'historical_comparison'; // 历史对比

export interface CrossChainPriceData {
  chain: SupportedChain;
  protocol: OracleProtocol;
  symbol: string;
  price: number;
  priceRaw: string;
  decimals: number;
  timestamp: Date;
  confidence?: number;
  blockNumber?: number;
  txHash?: string;
  isStale?: boolean;
  stalenessSeconds?: number;
}

export interface CrossChainComparisonResult {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  timestamp: Date;
  pricesByChain: {
    chain: SupportedChain;
    protocol: OracleProtocol;
    price: number;
    confidence?: number;
    timestamp: Date;
    isStale: boolean;
  }[];
  statistics: {
    avgPrice: number;
    medianPrice: number;
    minPrice: number;
    maxPrice: number;
    minChain: SupportedChain;
    maxChain: SupportedChain;
    priceRange: number;
    priceRangePercent: number;
  };
  deviations: {
    chain: SupportedChain;
    price: number;
    deviationFromAvg: number;
    deviationFromAvgPercent: number;
    deviationFromMedian: number;
    deviationFromMedianPercent: number;
    isOutlier: boolean;
  }[];
  recommendations: {
    mostReliableChain: SupportedChain;
    reason: string;
    alternativeChains: SupportedChain[];
  };
}

export interface CrossChainArbitrageOpportunity {
  id: string;
  symbol: string;
  timestamp: Date;
  opportunityType: 'cross_chain' | 'cross_protocol' | 'combined';
  buy: {
    chain: SupportedChain;
    protocol: OracleProtocol;
    price: number;
    confidence: number;
    timestamp: Date;
  };
  sell: {
    chain: SupportedChain;
    protocol: OracleProtocol;
    price: number;
    confidence: number;
    timestamp: Date;
  };
  priceDiff: number;
  priceDiffPercent: number;
  potentialProfitPercent: number;
  gasCostEstimate: number;
  netProfitEstimate: number;
  riskLevel: 'low' | 'medium' | 'high';
  isActionable: boolean;
  warnings: string[];
}

export interface CrossChainDeviationAlert {
  id: string;
  symbol: string;
  chainA: SupportedChain;
  chainB: SupportedChain;
  timestamp: Date;
  deviationPercent: number;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  priceA: number;
  priceB: number;
  avgPrice: number;
  reason?: string;
  suggestedAction?: string;
}

export interface CrossChainHistoricalAnalysis {
  symbol: string;
  analysisType: CrossChainAnalysisType;
  startTime: Date;
  endTime: Date;
  timeInterval: string;
  dataPoints: {
    timestamp: Date;
    pricesByChain: Record<SupportedChain, number | null>;
    avgPrice: number;
    medianPrice: number;
    maxDeviation: number;
    maxDeviationChains: [SupportedChain, SupportedChain];
  }[];
  summary: {
    avgPriceRangePercent: number;
    maxObservedDeviation: number;
    convergenceCount: number;
    divergenceCount: number;
    significantDeviationCount: number;
    mostVolatileChain: SupportedChain;
    mostStableChain: SupportedChain;
  };
}

export interface CrossChainAnalysisConfig {
  enabled: boolean;
  symbols: string[];
  chains: SupportedChain[];
  protocols: OracleProtocol[];
  deviationThreshold: number; // 偏差告警阈值（百分比）
  criticalDeviationThreshold: number; // 严重偏差阈值
  analysisIntervalMs: number; // 分析间隔（毫秒）
  alertEnabled: boolean;
  alertChannels: string[];
}

export interface CrossChainDashboardData {
  lastUpdated: Date;
  monitoredSymbols: string[];
  monitoredChains: SupportedChain[];
  activeAlerts: number;
  opportunities: {
    total: number;
    actionable: number;
    avgProfitPercent: number;
  };
  priceComparisons: {
    symbol: string;
    chainsCount: number;
    priceRangePercent: number;
    status: 'normal' | 'warning' | 'critical';
  }[];
  chainHealth: {
    chain: SupportedChain;
    status: 'healthy' | 'degraded' | 'offline';
    lastPriceTimestamp: Date;
    staleMinutes?: number;
  }[];
}
