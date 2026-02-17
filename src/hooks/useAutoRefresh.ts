/**
 * useAutoRefresh Hooks - 自动刷新功能集合
 *
 * 包含两个 Hook:
 * 1. useAutoRefresh - 增强版自动刷新
 *    - 支持请求取消（AbortController）
 *    - 请求去重机制
 *    - 竞态条件防护
 *
 * 2. useAutoRefreshWithCountdown - 带倒计时的自动刷新
 *    - 倒计时显示功能
 *    - 页面可见性暂停
 *    - 动态调整刷新间隔
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getRefreshStrategy, formatLastUpdated, type RefreshStrategyConfig } from '@/config/refreshStrategy';
import { logger } from '@/shared/logger';

// ============================================================================
// useAutoRefresh - 增强版自动刷新 Hook
// ============================================================================

interface UseAutoRefreshOptions {
  pageId: string;
  fetchFn: (signal?: AbortSignal) => Promise<void>;
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
  cancel: () => void;
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isRefreshingRef.current = false;
    if (isMountedRef.current) {
      setIsRefreshing(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) {
      logger.debug('Refresh skipped: already in progress', { pageId });
      return;
    }

    const currentRequestId = ++requestIdRef.current;

    cancel();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    isRefreshingRef.current = true;
    setIsRefreshing(true);
    setIsError(false);
    setError(null);

    try {
      await fetchFn(abortController.signal);

      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
        return;
      }

      if (abortController.signal.aborted) {
        return;
      }

      setLastUpdated(new Date());
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        logger.debug('Refresh aborted', { pageId, requestId: currentRequestId });
        return;
      }

      logger.error('Refresh failed', { error: err, pageId, requestId: currentRequestId });

      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
        return;
      }

      setIsError(true);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (isMountedRef.current && currentRequestId === requestIdRef.current) {
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      }
    }
  }, [fetchFn, pageId, cancel]);

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
  }, [lastUpdated]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cancel();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [cancel]);

  return {
    lastUpdated,
    isRefreshing,
    isError,
    error,
    strategy,
    refresh,
    formattedLastUpdated,
    cancel,
  };
}

// ============================================================================
// useAutoRefreshWithCountdown - 带倒计时的自动刷新 Hook
// ============================================================================

interface UseAutoRefreshWithCountdownOptions {
  onRefresh: () => void;
  interval?: number;
  enabled?: boolean;
  pauseWhenHidden?: boolean;
}

interface UseAutoRefreshWithCountdownReturn {
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
  refreshInterval: number;
  setRefreshInterval: (interval: number) => void;
  timeUntilRefresh: number;
  refresh: () => void;
}

export function useAutoRefreshWithCountdown({
  onRefresh,
  interval = 30000,
  enabled = true,
  pauseWhenHidden = true,
}: UseAutoRefreshWithCountdownOptions): UseAutoRefreshWithCountdownReturn {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [refreshInterval, setRefreshInterval] = useState(interval);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(interval);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const refresh = useCallback(() => {
    onRefresh();
    setTimeUntilRefresh(refreshInterval);
  }, [onRefresh, refreshInterval]);

  useEffect(() => {
    if (!isEnabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      refresh();
    }, refreshInterval);

    countdownRef.current = setInterval(() => {
      setTimeUntilRefresh((prev) => {
        if (prev <= 1000) {
          return refreshInterval;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [isEnabled, refreshInterval, refresh]);

  useEffect(() => {
    if (!pauseWhenHidden) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
      } else {
        if (isEnabled) {
          refresh();
          intervalRef.current = setInterval(refresh, refreshInterval);
          countdownRef.current = setInterval(() => {
            setTimeUntilRefresh((prev) => {
              if (prev <= 1000) {
                return refreshInterval;
              }
              return prev - 1000;
            });
          }, 1000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pauseWhenHidden, isEnabled, refreshInterval, refresh]);

  return {
    isEnabled,
    setIsEnabled,
    refreshInterval,
    setRefreshInterval,
    timeUntilRefresh,
    refresh,
  };
}

export default useAutoRefresh;
