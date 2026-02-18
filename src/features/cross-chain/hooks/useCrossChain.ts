'use client';

import useSWR from 'swr';

import { buildApiUrl } from '@/shared/utils';
import { fetchApiData } from '@/shared/utils/api';

import type {
  CrossChainComparisonResult,
  CrossChainDeviationAlertsResponse,
  CrossChainDashboardResponse,
  CrossChainHistoricalResponse,
} from '../types';

export function useCrossChainComparison(symbol: string, chains?: string[]) {
  const params: Record<string, string> = { symbol };
  if (chains && chains.length > 0) {
    params.chains = chains.join(',');
  }
  const url = buildApiUrl('/api/cross-chain/comparison', params);
  return useSWR<CrossChainComparisonResult>(url, (url: string) =>
    fetchApiData<CrossChainComparisonResult>(url),
  );
}

export function useCrossChainAlerts(_symbol?: string) {
  const url = buildApiUrl('/api/cross-chain/alerts');
  return useSWR<CrossChainDeviationAlertsResponse['data']>(url, (url: string) =>
    fetchApiData<CrossChainDeviationAlertsResponse['data']>(url),
  );
}

export function useCrossChainDashboard() {
  const url = buildApiUrl('/api/cross-chain/dashboard');
  return useSWR<CrossChainDashboardResponse['data']>(url, (url: string) =>
    fetchApiData<CrossChainDashboardResponse['data']>(url),
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
  return useSWR<CrossChainHistoricalResponse['data']>(url, (url: string) =>
    fetchApiData<CrossChainHistoricalResponse['data']>(url),
  );
}
