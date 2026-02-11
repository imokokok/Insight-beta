'use client';

import useSWR from 'swr';

import { buildApiUrl } from '@/lib/utils';
import { createSWRConfig } from '@/hooks/common/useSWRConfig';

// SWR 配置选项类型
interface SWRConfigOptions {
  refreshInterval?: number | ((latestData: unknown) => number);
  dedupingInterval?: number;
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
  revalidateIfStale?: boolean;
  errorRetryCount?: number;
  errorRetryInterval?: number;
  shouldRetryOnError?: boolean;
  keepPreviousData?: boolean;
  suspense?: boolean;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData: Record<string, unknown> = await res.json().catch(() => ({}));
    const error = new Error((errorData.error as string) || `HTTP ${res.status}: Failed to fetch data`);
    (error as { code?: string; status?: number }).code = (errorData.code as string) || 'FETCH_ERROR';
    (error as { code?: string; status?: number }).status = res.status;
    throw error;
  }
  return res.json();
};

export interface CrossChainComparisonResult {
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

export function useCrossChainComparison(
  symbol: string | null,
  chains?: string[],
  options?: SWRConfigOptions
) {
  const url = symbol
    ? buildApiUrl('/api/cross-chain/comparison', {
        symbol: symbol.toUpperCase(),
        chains: chains?.length ? chains.join(',') : undefined,
      })
    : null;

  return useSWR<{ success: boolean; data: CrossChainComparisonResult }>(
    url,
    fetcher,
    createSWRConfig(options),
  );
}

export function useCrossChainArbitrage(
  symbol: string | null,
  threshold?: number,
  options?: SWRConfigOptions
) {
  const url = symbol
    ? buildApiUrl('/api/cross-chain/arbitrage', {
        symbol: symbol.toUpperCase(),
        threshold,
      })
    : null;

  return useSWR<CrossChainArbitrageResponse>(
    url,
    fetcher,
    createSWRConfig(options),
  );
}

export function useCrossChainAlerts(
  symbol: string | null,
  severity?: string,
  options?: SWRConfigOptions
) {
  const url = symbol
    ? buildApiUrl('/api/cross-chain/alerts', {
        symbol: symbol.toUpperCase(),
        severity,
      })
    : null;

  return useSWR<CrossChainDeviationAlertsResponse>(
    url,
    fetcher,
    createSWRConfig(options),
  );
}

export function useCrossChainDashboard(
  options?: SWRConfigOptions
) {
  return useSWR<CrossChainDashboardResponse>(
    '/api/cross-chain/dashboard',
    fetcher,
    createSWRConfig(options),
  );
}

export function useCrossChainHistory(
  symbol: string | null,
  startTime: Date,
  endTime: Date,
  interval: '1hour' | '1day' = '1day',
  page: number = 1,
  pageSize: number = 100,
  options?: SWRConfigOptions
) {
  const url = symbol
    ? buildApiUrl('/api/cross-chain/history', {
        symbol: symbol.toUpperCase(),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        interval,
        page,
        pageSize: Math.min(pageSize, 1000),
      })
    : null;

  return useSWR<CrossChainHistoricalResponse>(
    url,
    fetcher,
    createSWRConfig({ ...options, refreshInterval: 300000 }),
  );
}
