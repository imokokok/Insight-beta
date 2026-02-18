'use client';

import useSWR from 'swr';

import { buildApiUrl } from '@/shared/utils';
import {
  ArbitrageResponse,
  BridgesResponse,
  CorrelationResponse,
  LiquidityResponse,
} from '../types';

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

export function useArbitrage(symbol?: string, minProfitPercent?: number) {
  const params: Record<string, string> = {};
  if (symbol) params.symbol = symbol;
  if (minProfitPercent !== undefined) params.minProfitPercent = minProfitPercent.toString();
  const url = buildApiUrl('/api/cross-chain/arbitrage', params);
  return useSWR<ArbitrageResponse>(url, (url: string) => fetcher<ArbitrageResponse>(url));
}

export function useBridgeStatus() {
  const url = buildApiUrl('/api/cross-chain/bridges');
  return useSWR<BridgesResponse>(url, (url: string) => fetcher<BridgesResponse>(url));
}

export function useCorrelation(symbol?: string, timeRange?: string) {
  const params: Record<string, string> = {};
  if (symbol) params.symbol = symbol;
  if (timeRange) params.timeRange = timeRange;
  const url = buildApiUrl('/api/cross-chain/correlation', params);
  return useSWR<CorrelationResponse>(url, (url: string) => fetcher<CorrelationResponse>(url));
}

export function useLiquidity() {
  const url = buildApiUrl('/api/cross-chain/liquidity');
  return useSWR<LiquidityResponse>(url, (url: string) => fetcher<LiquidityResponse>(url));
}
