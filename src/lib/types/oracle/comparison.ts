/**
 * Oracle Comparison Analytics Types - 预言机比较分析类型定义
 *
 * 用于价格偏离热力图、延迟分析、成本效益分析等功能
 */

import type { SupportedChain } from './chain';
import type { OracleProtocol } from './protocol';

// ============================================================================
// 价格偏离分析
// ============================================================================

export type PriceDeviationLevel = 'low' | 'medium' | 'high' | 'critical';

export type PriceDeviationCell = {
  protocol: OracleProtocol;
  symbol: string;
  price: number;
  referencePrice: number;
  /** 价格偏差绝对值 */
  deviation: number;
  /** 价格偏差百分比，小数形式 (如 0.01 = 1%) */
  deviationPercent: number;
  deviationLevel: PriceDeviationLevel;
  timestamp: string;
  isStale: boolean;
};

export type PriceHeatmapRow = {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  cells: PriceDeviationCell[];
  /** 最大偏差百分比，小数形式 (如 0.01 = 1%) */
  maxDeviation: number;
  /** 平均偏差百分比，小数形式 (如 0.01 = 1%) */
  avgDeviation: number;
  consensusPrice: number;
  consensusMethod: 'median' | 'weighted' | 'mean';
};

export type PriceHeatmapData = {
  rows: PriceHeatmapRow[];
  protocols: OracleProtocol[];
  lastUpdated: string;
  totalPairs: number;
  criticalDeviations: number;
};

// ============================================================================
// 延迟分析
// ============================================================================

export type LatencyMetric = {
  protocol: OracleProtocol;
  symbol: string;
  chain: SupportedChain;
  lastUpdateTimestamp: string;
  latencyMs: number;
  latencySeconds: number;
  blockLag: number;
  updateFrequency: number; // 平均更新频率（秒）
  expectedFrequency: number; // 预期频率（秒）
  /** 频率偏差百分比，小数形式 (如 0.01 = 1%) */
  frequencyDeviation: number;
  percentile50: number; // P50 延迟
  percentile90: number; // P90 延迟
  percentile99: number; // P99 延迟
  status: 'healthy' | 'degraded' | 'stale';
};

export type LatencyAnalysis = {
  metrics: LatencyMetric[];
  summary: {
    avgLatency: number;
    maxLatency: number;
    minLatency: number;
    totalFeeds: number;
    staleFeeds: number;
    degradedFeeds: number;
    healthyFeeds: number;
  };
  lastUpdated: string;
};

export type LatencyTrendPoint = {
  timestamp: string;
  avgLatency: number;
  maxLatency: number;
  p95Latency: number;
};

export type LatencyTrend = {
  protocol: OracleProtocol;
  symbol: string;
  data: LatencyTrendPoint[];
};

// ============================================================================
// 成本效益分析
// ============================================================================

export type CostType = 'subscription' | 'per_call' | 'hybrid' | 'free';

export type ProtocolCost = {
  protocol: OracleProtocol;
  costType: CostType;
  subscriptionCost?: {
    amount: number;
    currency: string;
    period: 'monthly' | 'yearly';
    tier: string;
  };
  perCallCost?: {
    amount: number;
    currency: string;
    unit: 'call' | '1000_calls';
  };
  gasCostEstimate?: {
    avgGasUnits: number;
    avgGasPrice: number; // in gwei
    avgCostPerUpdate: number; // in USD
  };
  freeTier?: {
    callsPerDay: number;
    feedsLimit: number;
  };
};

export type CostEfficiencyMetric = {
  protocol: OracleProtocol;
  costScore: number; // 0-100, 越高越便宜
  valueScore: number; // 0-100, 综合价值
  feedsCount: number;
  chainsCount: number;
  avgUpdateFrequency: number;
  accuracyScore: number;
  uptimeScore: number;
  costPerFeed: number; // 每个喂价的成本
  costPerChain: number; // 每条链的成本
  costPerUpdate: number; // 每次更新的成本
  roi: number; // 投资回报率估算
};

export type CostComparison = {
  protocols: CostEfficiencyMetric[];
  recommendations: CostRecommendation[];
  summary: {
    cheapestProtocol: OracleProtocol;
    bestValueProtocol: OracleProtocol;
    mostExpensiveProtocol: OracleProtocol;
  };
};

export type CostRecommendation = {
  useCase: 'defi_protocol' | 'trading' | 'enterprise' | 'hobby';
  recommendedProtocol: OracleProtocol;
  reason: string;
  estimatedMonthlyCost: number;
  alternatives: OracleProtocol[];
};

// ============================================================================
// 实时对比
// ============================================================================

export type RealtimeComparisonItem = {
  symbol: string;
  protocols: RealtimeProtocolData[];
  consensus: {
    median: number;
    mean: number;
    weighted: number;
  };
  spread: {
    min: number;
    max: number;
    absolute: number;
    /** 价差百分比，小数形式 (如 0.01 = 1%) */
    percent: number;
  };
  lastUpdated: string;
};

export type RealtimeProtocolData = {
  protocol: OracleProtocol;
  price: number;
  timestamp: string;
  confidence: number;
  latency: number;
  /** 与共识价格的偏差百分比，小数形式 (如 0.01 = 1%) */
  deviationFromConsensus: number;
  status: 'active' | 'stale' | 'error';
};

export type ComparisonFilter = {
  symbols?: string[];
  protocols?: OracleProtocol[];
  chains?: SupportedChain[];
  minDeviation?: number;
  maxLatency?: number;
  showStale?: boolean;
};

export type ComparisonSort = {
  field: 'symbol' | 'deviation' | 'latency' | 'confidence' | 'timestamp';
  direction: 'asc' | 'desc';
};

// ============================================================================
// 分析配置
// ============================================================================

export type ComparisonConfig = {
  refreshInterval: number; // 毫秒
  deviationThresholds: {
    low: number; // 百分比
    medium: number;
    high: number;
    critical: number;
  };
  latencyThresholds: {
    healthy: number; // 秒
    degraded: number;
    stale: number;
  };
  referencePriceMethod: 'median' | 'mean' | 'weighted';
  weights?: Record<OracleProtocol, number>;
  timeRange: '1h' | '24h' | '7d' | '30d';
};

export type ComparisonView = 'heatmap' | 'latency' | 'cost' | 'realtime' | 'table';

// ============================================================================
// API 响应类型
// ============================================================================

export type ComparisonApiResponse<T> = {
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
    timeRange: {
      from: string;
      to: string;
    };
  };
};

export type HeatmapApiResponse = ComparisonApiResponse<PriceHeatmapData>;
export type LatencyApiResponse = ComparisonApiResponse<LatencyAnalysis>;
export type CostApiResponse = ComparisonApiResponse<CostComparison>;
export type RealtimeApiResponse = ComparisonApiResponse<RealtimeComparisonItem[]>;
