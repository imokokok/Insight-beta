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

export interface ArbitrageOpportunity {
  id: string;
  symbol: string;
  buyChain: string;
  sellChain: string;
  buyPrice: number;
  sellPrice: number;
  priceDiffPercent: number;
  estimatedProfit: number;
  gasCostEstimate: number;
  netProfit: number;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  timestamp: string;
  isActionable: boolean;
  warnings: string[];
}

export interface ArbitrageSummary {
  total: number;
  actionable: number;
  avgProfitPercent: number;
  totalEstimatedProfit: number;
}

export interface ArbitrageResponse {
  success: boolean;
  opportunities: ArbitrageOpportunity[];
  summary: ArbitrageSummary;
  meta: {
    timestamp: string;
    filters: {
      symbol?: string;
      minProfitPercent?: number;
    };
  };
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

export interface OrderBookLevel {
  price: number;
  amount: number;
  total: number;
}

export interface OrderBookDepth {
  symbol: string;
  chain: string;
  protocol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  midPrice: number;
  spread: number;
  spreadPercent: number;
  timestamp: string;
}

export interface LiquidityDepth {
  chain: string;
  protocol: string;
  symbol: string;
  orderBook: OrderBookDepth;
  depthMetrics: {
    depth1Percent: number;
    depth5Percent: number;
    depth10Percent: number;
    buyLiquidity: number;
    sellLiquidity: number;
    totalLiquidity: number;
  };
  timestamp: string;
}

export interface SlippageEstimate {
  symbol: string;
  chain: string;
  protocol: string;
  tradeSize: number;
  tradeDirection: 'buy' | 'sell';
  slippagePercent: number;
  estimatedPrice: number;
  impactCost: number;
  timestamp: string;
}

export interface SlippageAnalysis {
  chain: string;
  symbol: string;
  protocol: string;
  slippageBySize: {
    size: number;
    slippagePercent: number;
  }[];
  optimalTradeSize: number;
  maxRecommendedSize: number;
  timestamp: string;
}

export interface LiquidityTrendDataPoint {
  timestamp: string;
  totalLiquidity: number;
  liquidityByChain: Record<string, number>;
  avgSlippage: number;
  price: number;
}

export interface LiquidityTrend {
  symbol: string;
  chains: string[];
  timeRange: string;
  dataPoints: LiquidityTrendDataPoint[];
  trendAnalysis: {
    liquidityChangePercent: number;
    volatility: number;
    trendDirection: 'up' | 'down' | 'stable';
    projectedLiquidity: number;
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
  liquidityDepth?: LiquidityDepth;
  slippageAnalysis?: SlippageAnalysis;
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
  liquidityTrends?: LiquidityTrend;
  depthData?: LiquidityDepth[];
  meta: {
    timestamp: string;
  };
}
