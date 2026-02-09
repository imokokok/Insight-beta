import { useCallback, useMemo, useState, useEffect, useRef } from 'react';

import useSWRInfinite from 'swr/infinite';

import { fetchApiData } from '@/lib/utils';

// ============================================================================
// useInfiniteList - 无限列表 Hook
// ============================================================================

export interface BaseResponse<T> {
  items: T[];
  total: number;
  nextCursor: number | null;
}

export function useInfiniteList<T>(
  getUrl: (pageIndex: number, previousPageData: BaseResponse<T> | null) => string | null,
  options: {
    refreshInterval?: number;
    revalidateFirstPage?: boolean;
    revalidateOnFocus?: boolean;
    dedupingInterval?: number;
  } = {},
) {
  const {
    data: pages,
    error,
    isLoading,
    size,
    setSize,
    mutate,
  } = useSWRInfinite<BaseResponse<T>>(getUrl, fetchApiData, {
    revalidateFirstPage: false,
    revalidateOnFocus: false,
    revalidateAll: false,
    refreshInterval: 0,
    dedupingInterval: 10_000,
    revalidateOnReconnect: true,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
    shouldRetryOnError: true,
    ...options,
  });

  // Flatten items from all pages
  const items = useMemo(() => (pages ? pages.flatMap((page) => page.items) : []), [pages]);

  // Check if we can load more
  const lastPage = pages ? pages[pages.length - 1] : null;
  const hasMore = Boolean(lastPage?.nextCursor);

  // Loading states
  const loading = isLoading || (!pages && !error);
  const loadingMore = !!(size > 0 && pages && typeof pages[size - 1] === 'undefined');

  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore) {
      setSize(size + 1);
    }
  }, [hasMore, loadingMore, setSize, size]);

  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);

  return {
    items,
    loading,
    loadingMore,
    error: error?.message ?? null,
    loadMore,
    hasMore,
    refresh,
    mutate,
  };
}

// ============================================================================
// useDebounce - 防抖 Hook
// ============================================================================

/**
 * useDebounce Hook - 防抖处理
 *
 * 用于延迟更新值，常用于搜索输入等场景
 *
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 *
 * useEffect(() => {
 *   // 只在 debouncedSearchTerm 变化 300ms 后执行
 *   fetchSearchResults(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useDebouncedCallback Hook - 防抖回调函数
 *
 * 用于防抖处理回调函数，常用于搜索按钮点击等场景
 *
 * @example
 * const debouncedSearch = useDebouncedCallback(
 *   (query: string) => fetchSearchResults(query),
 *   300
 * );
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number,
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay],
  );
}
