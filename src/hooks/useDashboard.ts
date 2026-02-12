'use client';

import { useEffect, useCallback, useState, useRef } from 'react';

import { logger } from '@/shared/logger';

// ============================================================================
// useDashboardShortcuts - 仪表板键盘快捷键 Hook
// ============================================================================

interface UseDashboardShortcutsOptions {
  onRefresh?: () => void;
  onExport?: () => void;
  onSearchFocus?: () => void;
  onTabChange?: (tab: string) => void;
  tabs?: string[];
  enabled?: boolean;
}

export function useDashboardShortcuts({
  onRefresh,
  onExport,
  onSearchFocus,
  onTabChange,
  tabs = [],
  enabled = true,
}: UseDashboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        if (event.key !== 'Escape') {
          return;
        }
      }

      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'r':
            event.preventDefault();
            onRefresh?.();
            logger.debug('Dashboard shortcut: Refresh triggered');
            break;
          case 'e':
            event.preventDefault();
            onExport?.();
            logger.debug('Dashboard shortcut: Export triggered');
            break;
          case 'f':
            event.preventDefault();
            onSearchFocus?.();
            logger.debug('Dashboard shortcut: Search focus triggered');
            break;
        }
        return;
      }

      if (event.key >= '1' && event.key <= '9') {
        const tabIndex = parseInt(event.key, 10) - 1;
        const targetTab = tabs[tabIndex];
        if (targetTab) {
          event.preventDefault();
          onTabChange?.(targetTab);
          logger.debug('Dashboard shortcut: Tab change triggered', { tab: targetTab });
        }
      }

      if (event.key === 'Escape') {
        onSearchFocus?.();
        logger.debug('Dashboard shortcut: Clear search triggered');
      }
    },
    [onRefresh, onExport, onSearchFocus, onTabChange, tabs],
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

// ============================================================================
// useAutoRefresh - 自动刷新 Hook
// ============================================================================

interface UseAutoRefreshOptions {
  onRefresh: () => void;
  interval?: number;
  enabled?: boolean;
  pauseWhenHidden?: boolean;
}

export function useAutoRefresh({
  onRefresh,
  interval = 30000,
  enabled = true,
  pauseWhenHidden = true,
}: UseAutoRefreshOptions) {
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

// ============================================================================
// useDataCache - 数据缓存 Hook
// ============================================================================

interface CacheOptions {
  key: string;
  ttl?: number;
}

export function useDataCache<T extends Record<string, unknown>>({
  key,
  ttl = 5 * 60 * 1000,
}: CacheOptions) {
  const getCachedData = useCallback((): T | null => {
    try {
      const cached = localStorage.getItem(`dashboard_cache_${key}`);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();

      if (now - timestamp > ttl) {
        localStorage.removeItem(`dashboard_cache_${key}`);
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }, [key, ttl]);

  const setCachedData = useCallback(
    (data: T) => {
      try {
        localStorage.setItem(
          `dashboard_cache_${key}`,
          JSON.stringify({
            data,
            timestamp: Date.now(),
          }),
        );
      } catch (error) {
        logger.error('Failed to cache data', { error, key });
      }
    },
    [key],
  );

  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(`dashboard_cache_${key}`);
    } catch (error) {
      logger.error('Failed to clear cache', { error, key });
    }
  }, [key]);

  return { getCachedData, setCachedData, clearCache };
}
