'use client';

import useSWR from 'swr';

import { buildApiUrl } from '@/shared/utils';
import {
  CrossChainComparisonResult,
  CrossChainDeviationAlertsResponse,
  CrossChainDashboardResponse,
  CrossChainHistoricalResponse,
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

export function useCrossChainAlerts(_symbol?: string) {
  const url = buildApiUrl('/api/cross-chain/alerts');
  return useSWR<CrossChainDeviationAlertsResponse>(url, (url: string) =>
    fetcher<CrossChainDeviationAlertsResponse>(url),
  );
}

export function useCrossChainDashboard() {
  const url = buildApiUrl('/api/cross-chain/dashboard');
  return useSWR<CrossChainDashboardResponse>(url, (url: string) =>
    fetcher<CrossChainDashboardResponse>(url),
  );
}

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
