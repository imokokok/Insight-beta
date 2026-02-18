'use client';

import useSWR from 'swr';

import { buildApiUrl } from '@/shared/utils';
import { fetchApiData } from '@/shared/utils/api';

import type {
  ArbitrageResponse,
  BridgesResponse,
  CorrelationResponse,
  LiquidityResponse,
} from '../types';

export function useArbitrage(symbol?: string, minProfitPercent?: number) {
  const params: Record<string, string> = {};
  if (symbol) params.symbol = symbol;
  if (minProfitPercent !== undefined) params.minProfitPercent = minProfitPercent.toString();
  const url = buildApiUrl('/api/cross-chain/arbitrage', params);
  return useSWR<ArbitrageResponse>(url, (url: string) => fetchApiData<ArbitrageResponse>(url));
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
