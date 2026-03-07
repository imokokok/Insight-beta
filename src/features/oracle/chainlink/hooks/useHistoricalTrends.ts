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
    enableSampling?: boolean;
  }
) {
  const {
    refreshInterval = 60000,
    dedupingInterval = 30000,
    revalidateOnFocus = false,
    enableSampling = true,
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
      keepPreviousData: true,
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
