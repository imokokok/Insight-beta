/**
 * useAutoRefresh Hook - 简化版
 *
 * 基础自动刷新功能
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getRefreshStrategy, formatLastUpdated, type RefreshStrategyConfig } from '@/config/refreshStrategy';
import { logger } from '@/shared/logger';

interface UseAutoRefreshOptions {
  pageId: string;
  fetchFn: () => Promise<void>;
  enabled?: boolean;
  interval?: number;
}

interface UseAutoRefreshReturn {
  lastUpdated: Date | null;
  isRefreshing: boolean;
  isError: boolean;
  error: Error | null;
  strategy: RefreshStrategyConfig;
  refresh: () => Promise<void>;
  formattedLastUpdated: string;
}

export function useAutoRefresh(options: UseAutoRefreshOptions): UseAutoRefreshReturn {
  const { pageId, fetchFn, enabled = true, interval: customInterval } = options;

  const strategy = getRefreshStrategy(pageId);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [formattedLastUpdated, setFormattedLastUpdated] = useState(() => formatLastUpdated(null));

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const isRefreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    setIsRefreshing(true);
    setIsError(false);
    setError(null);

    try {
      await fetchFn();
      if (isMountedRef.current) {
        setLastUpdated(new Date());
      }
    } catch (err) {
      logger.error('Refresh failed', { error: err });
      if (isMountedRef.current) {
        setIsError(true);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      isRefreshingRef.current = false;
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [fetchFn]);

  useEffect(() => {
    refresh().catch((error) => {
      logger.warn('Initial refresh failed', { error });
    });
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;

    const pollInterval = customInterval ?? strategy.interval;
    if (pollInterval === 0) return;

    intervalRef.current = setInterval(() => {
      refresh();
    }, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, strategy.interval, customInterval, refresh]);

  useEffect(() => {
    setFormattedLastUpdated(formatLastUpdated(lastUpdated));
    const timeInterval = setInterval(() => {
      setFormattedLastUpdated(formatLastUpdated(lastUpdated));
    }, 1000);
    return () => clearInterval(timeInterval);
  }, [lastUpdated]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    lastUpdated,
    isRefreshing,
    isError,
    error,
    strategy,
    refresh,
    formattedLastUpdated,
  };
}

export default useAutoRefresh;
