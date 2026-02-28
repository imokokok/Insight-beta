'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { logger } from '@/shared/logger';

export interface UseAutoRefreshOptions {
  interval?: number;
  enabled?: boolean;
  pauseWhenHidden?: boolean;
  onRefresh: () => void | Promise<void>;
  onError?: (error: Error) => void;
}

export interface UseAutoRefreshReturn {
  isPaused: boolean;
  isRefreshing: boolean;
  countdown: number;
  lastRefreshTime: Date | null;
  pause: () => void;
  resume: () => void;
  refresh: () => Promise<void>;
  setInterval: (ms: number) => void;
  formattedCountdown: string;
  formattedLastRefresh: string;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0s';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${seconds}s`;
}

function formatLastRefresh(date: Date | null): string {
  if (!date) return '-';

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) {
    return 'Just now';
  } else if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  }

  return date.toLocaleTimeString();
}

export function useAutoRefresh({
  interval = 30000,
  enabled = true,
  pauseWhenHidden = true,
  onRefresh,
  onError,
}: UseAutoRefreshOptions): UseAutoRefreshReturn {
  const [isPaused, setIsPaused] = useState(!enabled);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(interval);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(interval);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const startTimers = useCallback(() => {
    clearTimers();

    intervalRef.current = setInterval(async () => {
      if (!isMountedRef.current || isPaused) return;

      try {
        setIsRefreshing(true);
        await onRefresh();
        setLastRefreshTime(new Date());
        setCountdown(refreshInterval);
      } catch (error) {
        logger.error('Auto refresh failed', { error });
        onError?.(error instanceof Error ? error : new Error(String(error)));
      } finally {
        if (isMountedRef.current) {
          setIsRefreshing(false);
        }
      }
    }, refreshInterval);

    countdownRef.current = setInterval(() => {
      if (!isMountedRef.current || isPaused) return;

      setCountdown((prev) => {
        if (prev <= 1000) {
          return refreshInterval;
        }
        return prev - 1000;
      });
    }, 1000);
  }, [clearTimers, onRefresh, onError, refreshInterval, isPaused]);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;

    try {
      setIsRefreshing(true);
      await onRefresh();
      setLastRefreshTime(new Date());
      setCountdown(refreshInterval);
    } catch (error) {
      logger.error('Manual refresh failed', { error });
      onError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [onRefresh, onError, refreshInterval, isRefreshing]);

  const pause = useCallback(() => {
    setIsPaused(true);
    clearTimers();
  }, [clearTimers]);

  const resume = useCallback(() => {
    setIsPaused(false);
    setCountdown(refreshInterval);
    startTimers();
  }, [startTimers, refreshInterval]);

  const setIntervalMs = useCallback(
    (ms: number) => {
      setRefreshInterval(ms);
      setCountdown(ms);
      if (!isPaused) {
        startTimers();
      }
    },
    [startTimers, isPaused],
  );

  useEffect(() => {
    if (!isPaused && enabled) {
      startTimers();
    }

    return () => {
      clearTimers();
    };
  }, [isPaused, enabled, startTimers, clearTimers]);

  useEffect(() => {
    if (!pauseWhenHidden) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimers();
      } else if (!isPaused && enabled) {
        refresh();
        startTimers();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pauseWhenHidden, isPaused, enabled, clearTimers, startTimers, refresh]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearTimers();
    };
  }, [clearTimers]);

  return {
    isPaused,
    isRefreshing,
    countdown,
    lastRefreshTime,
    pause,
    resume,
    refresh,
    setInterval: setIntervalMs,
    formattedCountdown: formatCountdown(countdown),
    formattedLastRefresh: formatLastRefresh(lastRefreshTime),
  };
}

export default useAutoRefresh;
