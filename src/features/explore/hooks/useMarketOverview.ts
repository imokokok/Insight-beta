'use client';

import useSWR from 'swr';

import { buildApiUrl } from '@/shared/utils';

import type { MarketOverviewData } from '../types';

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

export interface UseMarketOverviewOptions {
  refreshInterval?: number;
  revalidateOnFocus?: boolean;
}

export function useMarketOverview(options: UseMarketOverviewOptions = {}) {
  const { refreshInterval = 30000, revalidateOnFocus = true } = options;

  const url = buildApiUrl('/api/explore/market-overview');

  return useSWR<MarketOverviewData>(
    url,
    (url: string) => fetcher<MarketOverviewData>(url),
    {
      refreshInterval,
      revalidateOnFocus,
      revalidateOnReconnect: true,
    },
  );
}
