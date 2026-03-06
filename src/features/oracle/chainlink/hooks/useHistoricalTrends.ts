'use client';

import { useCallback, useEffect } from 'react';

import useSWR from 'swr';

import { buildApiUrl } from '@/shared/utils';

import type { HistoricalTrendResponse, TimeRange } from '../types';

const TIME_RANGE_LIMITS: Record<TimeRange, number> = {
  '1h': 60,
  '24h': 96,
  '7d': 168,
  '30d': 180,
  '90d': 180,
};

const MAX_DATA_POINTS = 500;

export function useHistoricalTrends(
  initialTimeRange: TimeRange = '24h',
  options?: {
    refreshInterval?: number;
    dedupingInterval?: number;
    revalidateOnFocus?: boolean;
    revalidateOnReconnect?: boolean;
    enableSampling?: boolean;
    errorRetryInterval?: number;
    errorRetryCount?: number;
  }
) {
  const {
    refreshInterval = 300000,
    dedupingInterval = 60000,
    revalidateOnFocus = false,
    revalidateOnReconnect = true,
    enableSampling = true,
    errorRetryInterval = 30000,
    errorRetryCount = 3,
  } = options || {};

  const buildUrl = useCallback(
    (timeRange: TimeRange) => {
      const params = new URLSearchParams({
        timeRange,
        limit: TIME_RANGE_LIMITS[timeRange].toString(),
      });

      if (enableSampling) {
        params.set('sampling', 'auto');
      }

      return buildApiUrl(`/oracle/chainlink/historical-trends?${params}`);
    },
    [enableSampling]
  );

  const { data, error, mutate, isLoading } = useSWR<HistoricalTrendResponse>(
    buildUrl(initialTimeRange),
    {
      refreshInterval,
      dedupingInterval,
      revalidateOnFocus,
      revalidateOnReconnect,
      keepPreviousData: true,
      errorRetryInterval,
      errorRetryCount,
    }
  );

  const setTimeRange = useCallback(
    async (timeRange: TimeRange) => {
      const url = buildUrl(timeRange);
      await mutate();
    },
    [buildUrl, mutate]
  );

  return {
    data,
    error,
    isLoading,
    isValidating: !data && !error,
    setTimeRange,
    refresh: mutate,
  };
}
