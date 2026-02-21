'use client';

import useSWR from 'swr';

import { buildApiUrl } from '@/shared/utils';
import { fetchApiData } from '@/shared/utils/api';

import type {
  BridgesResponse,
  CorrelationResponse,
  LiquidityResponse,
  CrossChainDeviationAlertsResponse,
  CrossChainDashboardResponse,
  CrossChainHistoricalResponse,
  CrossChainComparisonResult,
} from '../types';

export function useLiquidityAnalysis(symbol?: string, chain?: string) {
  const params: Record<string, string> = {};
  if (symbol) params.symbol = symbol;
  if (chain) params.chain = chain;
  const url = buildApiUrl('/api/cross-chain/liquidity', params);
  return useSWR<LiquidityResponse>(url, (url: string) => fetchApiData<LiquidityResponse>(url));
}

export function useBridgeStatus() {
  const url = buildApiUrl('/api/cross-chain/bridges');
  return useSWR<BridgesResponse>(url, (url: string) => fetchApiData<BridgesResponse>(url));
}

export function useCorrelation(symbol?: string, timeRange?: string) {
  const params: Record<string, string> = {};
  if (symbol) params.symbol = symbol;
  if (timeRange) params.timeRange = timeRange;
  const url = buildApiUrl('/api/cross-chain/correlation', params);
  return useSWR<CorrelationResponse>(url, (url: string) => fetchApiData<CorrelationResponse>(url));
}

export function useLiquidity() {
  const url = buildApiUrl('/api/cross-chain/liquidity');
  return useSWR<LiquidityResponse>(url, (url: string) => fetchApiData<LiquidityResponse>(url));
}

export function useCrossChainDashboard() {
  const url = buildApiUrl('/api/cross-chain/dashboard');
  return useSWR<CrossChainDashboardResponse>(url, (url: string) =>
    fetchApiData<CrossChainDashboardResponse>(url),
  );
}

export function useCrossChainAlerts() {
  const url = buildApiUrl('/api/cross-chain/alerts');
  return useSWR<CrossChainDeviationAlertsResponse>(url, (url: string) =>
    fetchApiData<CrossChainDeviationAlertsResponse>(url),
  );
}

export function useCrossChainComparison(symbol?: string, chains?: string[]) {
  const params: Record<string, string> = {};
  if (symbol) params.symbol = symbol;
  if (chains && chains.length > 0) params.chains = chains.join(',');
  const url = buildApiUrl('/api/cross-chain/comparison', params);
  return useSWR<CrossChainComparisonResult>(url, (url: string) =>
    fetchApiData<CrossChainComparisonResult>(url),
  );
}

export function useCrossChainHistory(
  symbol?: string,
  startTime?: string,
  endTime?: string,
  interval?: string,
) {
  const params: Record<string, string> = {};
  if (symbol) params.symbol = symbol;
  if (startTime) params.startTime = startTime;
  if (endTime) params.endTime = endTime;
  if (interval) params.interval = interval;
  const url = buildApiUrl('/api/cross-chain/history', params);
  return useSWR<CrossChainHistoricalResponse>(url, (url: string) =>
    fetchApiData<CrossChainHistoricalResponse>(url),
  );
}
