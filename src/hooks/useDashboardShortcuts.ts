/**
 * Dashboard Keyboard Shortcuts Hook
 *
 * 仪表板键盘快捷键 Hook
 * - R: 刷新数据
 * - E: 导出数据
 * - F: 聚焦搜索
 * - 1-4: 切换标签页
 */

import { useEffect, useCallback, useState, useRef } from 'react';

import { logger } from '@/lib/logger';

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
      // 忽略输入框中的快捷键
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        // 允许在搜索框中使用 Escape 键
        if (event.key !== 'Escape') {
          return;
        }
      }

      // 需要 Ctrl/Cmd 键的快捷键
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

      // 数字键切换标签页
      if (event.key >= '1' && event.key <= '9') {
        const tabIndex = parseInt(event.key, 10) - 1;
        if (tabIndex < tabs.length && tabs[tabIndex]) {
          event.preventDefault();
          onTabChange?.(tabs[tabIndex]!);
          logger.debug('Dashboard shortcut: Tab change triggered', { tab: tabs[tabIndex] });
        }
      }

      // Escape 键清除搜索
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

/**
 * Auto Refresh Hook
 *
 * 自动刷新 Hook
 * - 可开启/关闭自动刷新
 * - 可调整刷新间隔
 * - 页面不可见时暂停刷新
 */

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

  // 刷新函数
  const refresh = useCallback(() => {
    onRefresh();
    setTimeUntilRefresh(refreshInterval);
  }, [onRefresh, refreshInterval]);

  // 设置自动刷新
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

    // 主刷新定时器
    intervalRef.current = setInterval(() => {
      refresh();
    }, refreshInterval);

    // 倒计时定时器（每秒更新）
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

  // 页面可见性变化处理
  useEffect(() => {
    if (!pauseWhenHidden) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏时暂停
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
      } else {
        // 页面显示时恢复
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

/**
 * Data Cache Hook
 *
 * 数据缓存 Hook
 * - 缓存数据到 localStorage
 * - 设置缓存过期时间
 * - 优先使用缓存数据
 */

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
