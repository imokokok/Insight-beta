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

export function useArbitrage(symbol?: string, minProfitPercent?: number) {
  const params: Record<string, string> = {};
  if (symbol) params.symbol = symbol;
  if (minProfitPercent !== undefined) params.minProfitPercent = minProfitPercent.toString();
  const url = buildApiUrl('/api/cross-chain/arbitrage', params);
  return useSWR<ArbitrageResponse>(url, (url: string) => fetcher<ArbitrageResponse>(url));
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

export function useBridgeStatus() {
  const url = buildApiUrl('/api/cross-chain/bridges');
  return useSWR<BridgesResponse>(url, (url: string) => fetcher<BridgesResponse>(url));
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

export function useCorrelation(symbol?: string, timeRange?: string) {
  const params: Record<string, string> = {};
  if (symbol) params.symbol = symbol;
  if (timeRange) params.timeRange = timeRange;
  const url = buildApiUrl('/api/cross-chain/correlation', params);
  return useSWR<CorrelationResponse>(url, (url: string) => fetcher<CorrelationResponse>(url));
}

export interface ChainLiquidity {
  chain: string;
  displayName: string;
  totalLiquidity: number;
  liquidityChange24h: number;
  topPools: {
    symbol: string;
    liquidity: number;
    share: number;
  }[];
  avgSlippage: number;
  avgFee: number;
}

export interface LiquiditySummary {
  totalLiquidity: number;
  avgLiquidity: number;
  topChain: string;
  liquidityChange24h: number;
}

export interface LiquidityResponse {
  success: boolean;
  chains: ChainLiquidity[];
  summary: LiquiditySummary;
  meta: {
    timestamp: string;
  };
}

export function useLiquidity() {
  const url = buildApiUrl('/api/cross-chain/liquidity');
  return useSWR<LiquidityResponse>(url, (url: string) => fetcher<LiquidityResponse>(url));
}
