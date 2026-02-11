/**
 * Page Optimizations Hook
 *
 * 页面优化组合 Hook - 为所有页面提供统一的交互优化
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useCommonShortcuts } from './useKeyboardShortcuts';
import { useToast } from '@/components/ui/toast';

interface PageOptimizationOptions {
  /** 页面名称，用于快捷键帮助 */
  pageName?: string;
  /** 是否启用刷新快捷键 */
  enableRefresh?: boolean;
  /** 刷新回调函数 */
  onRefresh?: () => void | Promise<void>;
  /** 是否启用搜索快捷键 */
  enableSearch?: boolean;
  /** 搜索输入框选择器 */
  searchSelector?: string;
  /** 是否启用帮助快捷键 */
  enableHelp?: boolean;
  /** 自定义快捷键 */
  customShortcuts?: Array<{
    key: string;
    modifier?: 'ctrl' | 'alt' | 'shift' | 'meta';
    handler: () => void;
    description: string;
  }>;
  /** 页面可见性变化回调 */
  onVisibilityChange?: (isVisible: boolean) => void;
  /** 是否显示刷新提示 */
  showRefreshToast?: boolean;
}

/**
 * 页面优化组合 Hook
 * 为所有页面提供统一的键盘快捷键、页面可见性检测等功能
 */
export function usePageOptimizations(options: PageOptimizationOptions = {}) {
  const {
    pageName: _pageName = '当前页面',
    enableRefresh = true,
    onRefresh,
    enableSearch = true,
    searchSelector = 'input[type="search"], input[placeholder*="搜索"], input[placeholder*="Search"]',
    enableHelp: _enableHelp = true,
    customShortcuts = [],
    onVisibilityChange,
    showRefreshToast = false,
  } = options;

  const { toast } = useToast();
  const refreshCallbackRef = useRef(onRefresh);

  // 更新 ref
  useEffect(() => {
    refreshCallbackRef.current = onRefresh;
  }, [onRefresh]);

  // 刷新处理函数
  const handleRefresh = useCallback(async () => {
    if (refreshCallbackRef.current) {
      try {
        await refreshCallbackRef.current();
        if (showRefreshToast) {
          toast({
            title: '刷新成功',
            type: 'success',
            duration: 2000,
          });
        }
      } catch (error) {
        toast({
          title: '刷新失败',
          message: error instanceof Error ? error.message : '请稍后重试',
          type: 'error',
          duration: 3000,
        });
      }
    }
  }, [showRefreshToast, toast]);

  // 搜索聚焦处理
  const handleSearchFocus = useCallback(() => {
    const searchInput = document.querySelector(searchSelector) as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchSelector]);

  // 基础快捷键
  const shortcuts = useCommonShortcuts({
    onRefresh: enableRefresh ? handleRefresh : undefined,
    onSearch: enableSearch ? handleSearchFocus : undefined,
  });

  // 页面可见性检测
  useEffect(() => {
    if (!onVisibilityChange) return;

    const handleVisibilityChange = () => {
      onVisibilityChange(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onVisibilityChange]);

  // 自定义快捷键
  useEffect(() => {
    if (customShortcuts.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of customShortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const modifierMatch = shortcut.modifier
          ? e[`${shortcut.modifier}Key`]
          : !e.ctrlKey && !e.altKey && !e.metaKey;

        if (keyMatch && modifierMatch) {
          e.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [customShortcuts]);

  return {
    shortcuts,
    handleRefresh,
    handleSearchFocus,
  };
}

/**
 * 数据获取优化 Hook
 * 为数据展示页面提供统一的加载、错误、刷新管理
 */
export function useDataFetching<T>(
  fetcher: () => Promise<T>,
  options: {
    autoFetch?: boolean;
    refreshInterval?: number;
    onError?: (error: Error) => void;
    onSuccess?: (data: T) => void;
  } = {}
) {
  const { autoFetch = true, refreshInterval, onError, onSuccess } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [fetcher, onError, onSuccess]);

  useEffect(() => {
    if (autoFetch) {
      fetch();
    }

    if (refreshInterval && refreshInterval > 0) {
      intervalRef.current = setInterval(fetch, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoFetch, fetch, refreshInterval]);

  return {
    data,
    loading,
    error,
    refresh: fetch,
  };
}

import { useState } from 'react';

export default usePageOptimizations;
