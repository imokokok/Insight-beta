'use client';

import useSWR from 'swr';

import { buildApiUrl } from '@/shared/utils';
import { fetchApiData } from '@/shared/utils/api';

import type { MarketOverviewData } from '../types';

export interface UseMarketOverviewOptions {
  refreshInterval?: number;
  revalidateOnFocus?: boolean;
}

export function useMarketOverview(options: UseMarketOverviewOptions = {}) {
  const { refreshInterval = 30000, revalidateOnFocus = true } = options;

  const url = buildApiUrl('/api/explore/market-overview');

  return useSWR<MarketOverviewData>(url, (url: string) => fetchApiData<MarketOverviewData>(url), {
    refreshInterval,
    revalidateOnFocus,
    revalidateOnReconnect: true,
  });
}
