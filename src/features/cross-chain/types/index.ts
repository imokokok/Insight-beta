export interface CrossChainComparison {
  timestamp: string;
  recommendedPrice?: number;
  avgPrice?: number;
  medianPrice?: number;
}

export interface CrossChainComparisonData {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  timestamp: string;
  pricesByChain: {
    chain: string;
    protocol: string;
    price: number;
    confidence?: number;
    timestamp: string;
    isStale: boolean;
  }[];
  statistics: {
    avgPrice: number;
    medianPrice: number;
    minPrice: number;
    maxPrice: number;
    minChain: string;
    maxChain: string;
    priceRange: number;
    priceRangePercent: number;
  };
  deviations: {
    chain: string;
    price: number;
    protocol: string;
    deviationFromAvg: number;
    deviationFromAvgPercent: number;
    deviationFromMedian: number;
    deviationFromMedianPercent: number;
    isOutlier: boolean;
    confidence: number;
  }[];
  recommendations: {
    mostReliableChain: string;
    reason: string;
    alternativeChains: string[];
  };
}

export interface CrossChainComparisonResult {
  data: CrossChainComparisonData;
}

export interface CrossChainDeviationAlert {
  id: string;
  symbol: string;
  chainA: string;
  chainB: string;
  timestamp: string;
  deviationPercent: number;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  status: string;
  priceA: number;
  priceB: number;
  avgPrice: number;
  reason?: string;
  suggestedAction?: string;
}

export interface CrossChainDeviationAlertsResponse {
  success: boolean;
  data: {
    alerts: CrossChainDeviationAlert[];
    summary: {
      total: number;
      critical: number;
      warning: number;
    };
  };
  timestamp: string;
}

export interface CrossChainDashboardData {
  lastUpdated: string;
  monitoredSymbols: string[];
  monitoredChains: string[];
  activeAlerts: number;
  priceComparisons: {
    symbol: string;
    chainsCount: number;
    priceRangePercent: number;
    status: 'normal' | 'warning' | 'critical';
  }[];
  chainHealth: {
    chain: string;
    status: 'healthy' | 'degraded' | 'offline';
    lastPriceTimestamp: string;
    staleMinutes?: number;
  }[];
}

export interface CrossChainDashboardResponse {
  success: boolean;
  data: CrossChainDashboardData;
  timestamp: string;
}

export interface CrossChainHistoricalDataPoint {
  timestamp: string;
  avgPrice: number;
  medianPrice: number;
  maxDeviation: number;
  pricesByChain?: Record<string, number | null>;
}

export interface CrossChainHistoricalSummary {
  avgPriceRangePercent: number;
  maxObservedDeviation: number;
  convergenceCount: number;
  divergenceCount: number;
  significantDeviationCount: number;
  mostVolatileChain: string;
  mostStableChain: string;
}

export interface CrossChainHistoricalResponse {
  success: boolean;
  data: {
    symbol: string;
    analysisType: string;
    startTime: string;
    endTime: string;
    timeInterval: string;
    dataPoints: CrossChainHistoricalDataPoint[];
    summary: CrossChainHistoricalSummary;
  };
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: number;
    hasPreviousPage: number;
  };
  timestamp: string;
}

export interface BridgeStatus {
  name: string;
  displayName: string;
  status: 'healthy' | 'degraded' | 'offline';
  latencyMs: number;
  feePercent: number;
  supportedChains: string[];
  volume24h: number;
  lastUpdated: string;
  alerts: string[];
}

export interface BridgeSummary {
  total: number;
  healthy: number;
  degraded: number;
  offline: number;
  avgLatencyMs: number;
  totalVolume24h: number;
}

export interface BridgesResponse {
  success: boolean;
  bridges: BridgeStatus[];
  summary: BridgeSummary;
  meta: {
    timestamp: string;
  };
}

export interface CorrelationData {
  chain1: string;
  chain2: string;
  correlation: number;
  sampleSize: number;
}

export interface CorrelationResponse {
  success: boolean;
  chains: string[];
  matrix: number[][];
  correlations: CorrelationData[];
  meta: {
    symbol: string;
    timeRange: string;
    timestamp: string;
  };
}

export interface ChainLiquidity {
  chain: string;
  displayName: string;
  totalLiquidity: number;
  liquidityChange24h: number;
  liquidityChangePercent24h: number;
  topPools: {
    symbol: string;
    liquidity: number;
    share: number;
    tvl: number;
    volume24h: number;
    feeTier?: string;
  }[];
  avgSlippage: number;
  avgFee: number;
  timestamp: string;
}

export interface LiquiditySummary {
  totalLiquidity: number;
  avgLiquidity: number;
  topChain: string;
  liquidityChange24h: number;
  liquidityChangePercent24h: number;
  avgSlippage: number;
  mostLiquidSymbol: string;
  mostLiquidChain: string;
}

export interface LiquidityResponse {
  success: boolean;
  chains: ChainLiquidity[];
  summary: LiquiditySummary;
  meta: {
    timestamp: string;
    dataSource?: string;
    isExample?: boolean;
    disclaimer?: string;
  };
}
