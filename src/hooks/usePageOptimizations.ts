/**
 * Page Optimizations Hook
 *
 * 页面优化组合 Hook - 为所有页面提供统一的交互优化
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useToast } from '@/components/ui';

interface PageOptimizationOptions {
  /** 页面名称 */
  pageName?: string;
  /** 是否启用刷新 */
  enableRefresh?: boolean;
  /** 刷新回调函数 */
  onRefresh?: () => void | Promise<void>;
  /** 搜索输入框选择器 */
  searchSelector?: string;
  /** 页面可见性变化回调 */
  onVisibilityChange?: (isVisible: boolean) => void;
  /** 是否显示刷新提示 */
  showRefreshToast?: boolean;
  /** 是否启用搜索 */
  enableSearch?: boolean;
}

/**
 * 页面优化组合 Hook
 * 为所有页面提供统一的键盘快捷键、页面可见性检测等功能
 */
export function usePageOptimizations(options: PageOptimizationOptions = {}) {
  const {
    onRefresh,
    searchSelector = 'input[type="search"], input[placeholder*="搜索"], input[placeholder*="Search"]',
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

  return {
    handleRefresh,
    handleSearchFocus,
  };
}

export default usePageOptimizations;
