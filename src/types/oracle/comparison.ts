/**
 * Oracle Comparison Analytics Types - 预言机比较分析类型定义
 *
 * 用于价格偏离热力图、延迟分析、成本效益分析等功能
 */

import type { SupportedChain } from '@/types/chains';

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
  /** 偏离持续时间（分钟） */
  duration?: number;
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

export type PriceDeviationHistoryPoint = {
  timestamp: string;
  protocol: OracleProtocol;
  symbol: string;
  deviation: number;
  deviationPercent: number;
  price: number;
  referencePrice: number;
  deviationLevel: PriceDeviationLevel;
};

export type PriceDeviationHistory = {
  symbol: string;
  protocol: OracleProtocol;
  data: PriceDeviationHistoryPoint[];
  summary: {
    avgDeviation: number;
    maxDeviation: number;
    minDeviation: number;
    deviationCount: number;
    criticalCount: number;
    avgDuration: number;
  };
};

export type PriceDeviationEvent = {
  id: string;
  timestamp: string;
  protocol: OracleProtocol;
  symbol: string;
  deviation: number;
  deviationPercent: number;
  deviationLevel: PriceDeviationLevel;
  duration: number;
  startPrice: number;
  endPrice: number;
  referencePrice: number;
  resolved: boolean;
};

export type PriceDeviationTimeline = {
  events: PriceDeviationEvent[];
  totalEvents: number;
  lastUpdated: string;
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

export type LatencyAnomalyEvent = {
  id: string;
  timestamp: string;
  protocol: OracleProtocol;
  symbol: string;
  chain: SupportedChain;
  latencyMs: number;
  threshold: number;
  duration: number;
  severity: 'warning' | 'critical' | 'emergency';
  cause?: string;
  resolved: boolean;
  resolvedAt?: string;
  impact: {
    affectedFeeds: number;
    avgLatencyIncrease: number;
    blockLagIncrease: number;
  };
};

export type LatencyAnomalyTimeline = {
  events: LatencyAnomalyEvent[];
  totalEvents: number;
  lastUpdated: string;
};

export type LatencyBlockCorrelation = {
  timestamp: string;
  blockHeight: number;
  latency: number;
  transactionCount: number;
  gasPrice: number;
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
  costScore: number;
  valueScore: number;
  feedsCount: number;
  chainsCount: number;
  avgUpdateFrequency: number;
  accuracyScore: number;
  uptimeScore: number;
  costPerFeed: number;
  costPerChain: number;
  costPerUpdate: number;
  roi: number;
  /** 数据来源 */
  dataSource?: {
    name: string;
    url?: string;
    lastUpdated: string;
    confidence: number;
  };
  /** Gas费用估算详情 */
  gasEstimate?: {
    avgGasUnits: number;
    avgGasPrice: number;
    avgCostPerUpdate: number;
    chainBreakdown?: Record<
      string,
      {
        gasPrice: number;
        costPerUpdate: number;
      }
    >;
  };
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
  status: 'active' | 'warning' | 'stale' | 'error';
};

// ============================================================================
// 跨链价格差异分析
// ============================================================================

export type CrossChainPriceDifference = {
  symbol: string;
  chains: CrossChainPriceData[];
  consensus: {
    median: number;
    mean: number;
    weighted: number;
  };
  spread: {
    min: number;
    max: number;
    absolute: number;
    percent: number;
  };
  arbitrageOpportunity?: {
    profitPercent: number;
    buyChain: string;
    sellChain: string;
  };
  lastUpdated: string;
};

export type CrossChainPriceData = {
  chain: SupportedChain;
  price: number;
  timestamp: string;
  deviation: number;
  deviationPercent: number;
  confidence: number;
  liquidity?: number;
  volume24h?: number;
};

export type CrossChainPriceHistory = {
  symbol: string;
  data: CrossChainPriceHistoryPoint[];
  summary: {
    avgSpread: number;
    maxSpread: number;
    arbitrageOpportunities: number;
  };
};

export type CrossChainPriceHistoryPoint = {
  timestamp: string;
  chain: SupportedChain;
  price: number;
  spread: number;
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

export type ComparisonView = 'heatmap' | 'latency' | 'cost' | 'realtime' | 'table' | 'compare';

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
