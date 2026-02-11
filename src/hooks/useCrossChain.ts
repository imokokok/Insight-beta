'use client';

import useSWR from 'swr';

import { buildApiUrl } from '@/lib/utils';

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData: Record<string, unknown> = await res.json().catch(() => ({}));
    const error = new Error((errorData.error as string) || `HTTP ${res.status}: Failed to fetch data`);
    (error as { code?: string; status?: number }).code = (errorData.code as string) || 'FETCH_ERROR';
    (error as { code?: string; status?: number }).status = res.status;
    throw error;
  }
  return res.json() as Promise<T>;
};

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

export interface CrossChainArbitrageOpportunity {
  id: string;
  symbol: string;
  timestamp: string;
  opportunityType: string;
  buy: {
    chain: string;
    protocol: string;
    price: number;
    confidence: number;
    timestamp: string;
  };
  sell: {
    chain: string;
    protocol: string;
    price: number;
    confidence: number;
    timestamp: string;
  };
  priceDiff: number;
  priceDiffPercent: number;
  potentialProfitPercent: number;
  gasCostEstimate: number;
  fromGasCost: number;
  toGasCost: number;
  bridgeCost: number;
  netProfitEstimate: number;
  riskLevel: 'low' | 'medium' | 'high';
  isActionable: boolean;
  warnings: string[];
}

export interface CrossChainArbitrageSummary {
  total: number;
  actionable: number;
  avgProfitPercent: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  thresholdApplied: number | null;
}

export interface CrossChainArbitrageResponse {
  success: boolean;
  data: {
    symbol: string;
    opportunities: CrossChainArbitrageOpportunity[];
    summary: CrossChainArbitrageSummary;
  };
  timestamp: string;
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
}

export interface CrossChainHistoricalSummary {
  avgPriceRangePercent: number;
  maxObservedDeviation: number;
  convergenceCount: number;
  divergenceCount: number;
  arbitrageOpportunitiesCount: number;
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

// ============================================================================
// Hooks
// ============================================================================

/**
 * 跨链价格比较 Hook
 */
export function useCrossChainComparison(symbol: string, chains?: string[]) {
  const chainsParam = chains && chains.length > 0 ? `&chains=${chains.join(',')}` : '';
  const url = buildApiUrl(`/api/cross-chain/comparison/${symbol}?${chainsParam}`);
  return useSWR<CrossChainComparisonResult>(url, (url: string) => fetcher<CrossChainComparisonResult>(url));
}

/**
 * 跨链套利机会 Hook
 */
export function useCrossChainArbitrage(symbol: string, threshold?: number) {
  const url = buildApiUrl(`/api/cross-chain/arbitrage?symbol=${symbol}${threshold ? `&threshold=${threshold}` : ''}`);
  return useSWR<CrossChainArbitrageResponse>(url, (url: string) => fetcher<CrossChainArbitrageResponse>(url));
}

/**
 * 跨链偏离度告警 Hook
 */
export function useCrossChainAlerts(_symbol?: string) {
  const url = buildApiUrl('/api/cross-chain/alerts');
  return useSWR<CrossChainDeviationAlertsResponse>(url, (url: string) => fetcher<CrossChainDeviationAlertsResponse>(url));
}

/**
 * 跨链仪表盘数据 Hook
 */
export function useCrossChainDashboard() {
  const url = buildApiUrl('/api/cross-chain/dashboard');
  return useSWR<CrossChainDashboardResponse>(url, (url: string) => fetcher<CrossChainDashboardResponse>(url));
}

/**
 * 跨链历史数据 Hook
 */
export function useCrossChainHistory(
  symbol: string,
  startTime?: string,
  endTime?: string,
  interval?: string
) {
  const params = new URLSearchParams({ symbol });
  if (startTime) params.set('startTime', startTime);
  if (endTime) params.set('endTime', endTime);
  if (interval) params.set('interval', interval);
  const url = buildApiUrl(`/api/cross-chain/history?${params.toString()}`);
  return useSWR<CrossChainHistoricalResponse>(url, (url: string) => fetcher<CrossChainHistoricalResponse>(url));
}


