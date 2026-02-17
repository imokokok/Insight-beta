'use client';

import { useState, useCallback, useEffect } from 'react';

import { useAutoRefresh } from '@/hooks';
import { fetchApiData } from '@/shared/utils';

import type { TrendingFeed, TrendingSortBy } from '../types';

interface UseTrendingFeedsOptions {
  initialSortBy?: TrendingSortBy;
  autoRefreshInterval?: number;
}

interface UseTrendingFeedsReturn {
  feeds: TrendingFeed[];
  sortBy: TrendingSortBy;
  setSortBy: (sortBy: TrendingSortBy) => void;
  isLoading: boolean;
  isRefreshing: boolean;
  isError: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

export function useTrendingFeeds(options: UseTrendingFeedsOptions = {}): UseTrendingFeedsReturn {
  const { initialSortBy = 'volume', autoRefreshInterval = 60000 } = options;

  const [feeds, setFeeds] = useState<TrendingFeed[]>([]);
  const [sortBy, setSortBy] = useState<TrendingSortBy>(initialSortBy);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrendingFeeds = useCallback(async () => {
    try {
      const data = await fetchApiData<TrendingFeed[]>(`/api/explore/trending?sortBy=${sortBy}`);
      setFeeds(data);
      setIsLoading(false);
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to fetch trending feeds');
    }
  }, [sortBy]);

  const { lastUpdated, isRefreshing, isError, error, refresh } = useAutoRefresh({
    pageId: 'trending-feeds',
    fetchFn: fetchTrendingFeeds,
    enabled: true,
    interval: autoRefreshInterval,
  });

  useEffect(() => {
    setIsLoading(true);
    refresh();
  }, [sortBy, refresh]);

  return {
    feeds,
    sortBy,
    setSortBy,
    isLoading,
    isRefreshing,
    isError,
    error: error as Error | null,
    lastUpdated,
    refresh,
  };
}
