/**
 * useAutoRefreshWithStats Hook
 *
 * 增强版自动刷新 Hook
 * - 支持刷新历史记录
 * - 支持刷新统计信息
 * - 支持策略切换
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getRefreshStrategy,
  formatLastUpdated,
  type RefreshStrategyConfig,
  type RefreshHistoryItem,
  type RefreshStats,
  createEmptyRefreshStats,
  REFRESH_STRATEGIES,
} from '@/config/refreshStrategy';
import { logger } from '@/shared/logger';

interface UseAutoRefreshWithStatsOptions {
  pageId: string;
  fetchFn: () => Promise<void>;
  enabled?: boolean;
  interval?: number;
  maxHistorySize?: number;
}

interface UseAutoRefreshWithStatsReturn {
  lastUpdated: Date | null;
  isRefreshing: boolean;
  isError: boolean;
  error: Error | null;
  strategy: RefreshStrategyConfig;
  refresh: () => Promise<void>;
  formattedLastUpdated: string;
  refreshHistory: RefreshHistoryItem[];
  refreshStats: RefreshStats;
  setStrategy: (strategyId: string) => void;
  clearHistory: () => void;
}

export function useAutoRefreshWithStats(
  options: UseAutoRefreshWithStatsOptions,
): UseAutoRefreshWithStatsReturn {
  const {
    pageId,
    fetchFn,
    enabled = true,
    interval: customInterval,
    maxHistorySize = 50,
  } = options;

  const initialStrategy = getRefreshStrategy(pageId);
  const [strategy, setStrategyState] = useState<RefreshStrategyConfig>(initialStrategy);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [formattedLastUpdated, setFormattedLastUpdated] = useState(() => formatLastUpdated(null));
  const [refreshHistory, setRefreshHistory] = useState<RefreshHistoryItem[]>([]);
  const [refreshStats, setRefreshStats] = useState<RefreshStats>(createEmptyRefreshStats());

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const isRefreshingRef = useRef(false);
  const refreshStartTimeRef = useRef<number>(0);

  const updateStats = useCallback(
    (success: boolean, duration: number, errorMessage?: string) => {
      setRefreshStats((prev) => {
        const newTotal = prev.totalRefreshes + 1;
        const newSuccessful = success ? prev.successfulRefreshes + 1 : prev.successfulRefreshes;
        const newFailed = success ? prev.failedRefreshes : prev.failedRefreshes + 1;
        const newAverageDuration =
          (prev.averageDuration * prev.totalRefreshes + duration) / newTotal;

        return {
          totalRefreshes: newTotal,
          successfulRefreshes: newSuccessful,
          failedRefreshes: newFailed,
          averageDuration: Math.round(newAverageDuration),
          lastRefresh: new Date(),
          lastError: success ? prev.lastError : new Date(),
          lastErrorMessage: success ? prev.lastErrorMessage : errorMessage || null,
        };
      });

      const historyItem: RefreshHistoryItem = {
        timestamp: new Date(),
        duration,
        success,
        error: errorMessage,
      };

      setRefreshHistory((prev) => {
        const newHistory = [...prev, historyItem];
        return newHistory.slice(-maxHistorySize);
      });
    },
    [maxHistorySize],
  );

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    refreshStartTimeRef.current = Date.now();
    setIsRefreshing(true);
    setIsError(false);
    setError(null);

    try {
      await fetchFn();

      if (isMountedRef.current) {
        const duration = Date.now() - refreshStartTimeRef.current;
        setLastUpdated(new Date());
        updateStats(true, duration);
      }
    } catch (err) {
      logger.error('Refresh failed', { error: err });

      if (isMountedRef.current) {
        const duration = Date.now() - refreshStartTimeRef.current;
        const errorMessage = err instanceof Error ? err.message : String(err);
        setIsError(true);
        setError(err instanceof Error ? err : new Error(errorMessage));
        updateStats(false, duration, errorMessage);
      }
    } finally {
      isRefreshingRef.current = false;
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [fetchFn, updateStats]);

  const setStrategy = useCallback((strategyId: string) => {
    const newStrategy = REFRESH_STRATEGIES[strategyId as keyof typeof REFRESH_STRATEGIES];
    if (newStrategy) {
      setStrategyState(newStrategy);
    }
  }, []);

  const clearHistory = useCallback(() => {
    setRefreshHistory([]);
    setRefreshStats(createEmptyRefreshStats());
  }, []);

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
    refreshHistory,
    refreshStats,
    setStrategy,
    clearHistory,
  };
}

export default useAutoRefreshWithStats;
