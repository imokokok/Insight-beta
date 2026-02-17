'use client';

import useSWR from 'swr';

import { buildApiUrl } from '@/shared/utils';

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData: Record<string, unknown> = await res.json().catch(() => ({}));
    const error = new Error(
      (errorData.error as string) || `HTTP ${res.status}: Failed to fetch data`,
    );
    (error as { code?: string; status?: number }).code =
      (errorData.code as string) || 'FETCH_ERROR';
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

// ============================================================================
// Hooks
// ============================================================================

/**
 * 跨链价格比较 Hook
 */
export function useCrossChainComparison(symbol: string, chains?: string[]) {
  const params: Record<string, string> = { symbol };
  if (chains && chains.length > 0) {
    params.chains = chains.join(',');
  }
  const url = buildApiUrl('/api/cross-chain/comparison', params);
  return useSWR<CrossChainComparisonResult>(url, (url: string) =>
    fetcher<CrossChainComparisonResult>(url),
  );
}

/**
 * 跨链偏离度告警 Hook
 */
export function useCrossChainAlerts(_symbol?: string) {
  const url = buildApiUrl('/api/cross-chain/alerts');
  return useSWR<CrossChainDeviationAlertsResponse>(url, (url: string) =>
    fetcher<CrossChainDeviationAlertsResponse>(url),
  );
}

/**
 * 跨链仪表盘数据 Hook
 */
export function useCrossChainDashboard() {
  const url = buildApiUrl('/api/cross-chain/dashboard');
  return useSWR<CrossChainDashboardResponse>(url, (url: string) =>
    fetcher<CrossChainDashboardResponse>(url),
  );
}

/**
 * 跨链历史数据 Hook
 */
export function useCrossChainHistory(
  symbol: string,
  startTime?: string,
  endTime?: string,
  interval?: string,
) {
  const params: Record<string, string> = { symbol };
  if (startTime) params.startTime = startTime;
  if (endTime) params.endTime = endTime;
  if (interval) params.interval = interval;
  const url = buildApiUrl('/api/cross-chain/history', params);
  return useSWR<CrossChainHistoricalResponse>(url, (url: string) =>
    fetcher<CrossChainHistoricalResponse>(url),
  );
}
