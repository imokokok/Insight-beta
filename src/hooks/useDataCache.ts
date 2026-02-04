/**
 * Data Cache Hook - 数据缓存 Hook
 *
 * 提供数据缓存、预取和失效管理功能
 */

import { useState, useCallback, useRef } from 'react';
import { LRUCache } from '@/lib/utils/performance';

interface CacheOptions {
  maxSize?: number;
  ttl?: number; // 毫秒
  staleWhileRevalidate?: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isStale: boolean;
}

export function useDataCache<T>(fetcher: (key: string) => Promise<T>, options: CacheOptions = {}) {
  const { maxSize = 100, ttl = 5 * 60 * 1000, staleWhileRevalidate = true } = options;

  const cacheRef = useRef(new LRUCache<string, CacheEntry<T>>(maxSize));
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());

  const fetch = useCallback(
    async (key: string): Promise<T> => {
      setLoading((prev) => new Set(prev).add(key));
      setErrors((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });

      try {
        const data = await fetcher(key);

        cacheRef.current.set(key, {
          data,
          timestamp: Date.now(),
          isStale: false,
        });

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setErrors((prev) => new Map(prev).set(key, error));
        throw error;
      } finally {
        setLoading((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [fetcher],
  );

  const revalidate = useCallback(
    async (key: string): Promise<void> => {
      try {
        const data = await fetcher(key);

        cacheRef.current.set(key, {
          data,
          timestamp: Date.now(),
          isStale: false,
        });
      } catch {
        // 静默失败，保留旧数据但标记为过期
        const cached = cacheRef.current.get(key);
        if (cached) {
          // 创建新对象而不是修改现有对象
          cacheRef.current.set(key, {
            ...cached,
            isStale: true,
          });
        }
      }
    },
    [fetcher],
  );

  const get = useCallback(
    async (key: string): Promise<T> => {
      const cached = cacheRef.current.get(key);
      const now = Date.now();

      // 缓存命中且未过期
      if (cached && !cached.isStale && now - cached.timestamp < ttl) {
        return cached.data;
      }

      // 缓存命中但已过期，启用 stale-while-revalidate
      if (cached && staleWhileRevalidate) {
        // 后台重新获取
        void revalidate(key);
        return cached.data;
      }

      // 缓存未命中，获取数据
      return fetch(key);
    },
    [ttl, staleWhileRevalidate, fetch, revalidate],
  );

  const invalidate = useCallback((key?: string) => {
    if (key) {
      // 标记为过期而不是删除，这样 stale-while-revalidate 可以工作
      const cached = cacheRef.current.get(key);
      if (cached) {
        cached.isStale = true;
      }
    } else {
      cacheRef.current.clear();
    }
  }, []);

  const prefetch = useCallback(
    async (key: string): Promise<void> => {
      if (!cacheRef.current.get(key)) {
        await fetch(key);
      }
    },
    [fetch],
  );

  const isLoading = useCallback((key: string) => loading.has(key), [loading]);
  const getError = useCallback((key: string) => errors.get(key), [errors]);

  return {
    get,
    fetch,
    invalidate,
    prefetch,
    isLoading,
    getError,
    revalidate,
  };
}

// ============================================================================
// 乐观更新 Hook
// ============================================================================

export function useOptimisticUpdate<T>(
  updater: (data: T) => Promise<T>,
  onError?: (error: Error, rollback: () => void) => void,
) {
  const [optimisticData, setOptimisticData] = useState<T | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const rollbackRef = useRef<(() => void) | null>(null);

  const update = useCallback(
    async (_currentData: T, optimisticValue: T): Promise<T> => {
      setIsUpdating(true);
      setOptimisticData(optimisticValue);

      // 保存回滚函数
      rollbackRef.current = () => {
        setOptimisticData(null);
      };

      try {
        const result = await updater(optimisticValue);
        setOptimisticData(null);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        if (onError) {
          onError(err, () => {
            rollbackRef.current?.();
          });
        } else {
          rollbackRef.current?.();
        }

        throw err;
      } finally {
        setIsUpdating(false);
      }
    },
    [updater, onError],
  );

  return {
    update,
    optimisticData,
    isUpdating,
  };
}

// ============================================================================
// 分页数据 Hook
// ============================================================================

interface PaginationOptions {
  pageSize?: number;
  prefetchPages?: number;
}

export function usePaginatedData<T>(
  fetcher: (page: number, pageSize: number) => Promise<{ data: T[]; total: number }>,
  options: PaginationOptions = {},
) {
  const { pageSize = 20, prefetchPages = 1 } = options;

  const [data, setData] = useState<T[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const prefetchedPages = useRef(new Set<number>());

  const loadPage = useCallback(
    async (page: number) => {
      if (prefetchedPages.current.has(page)) return;

      setLoading(true);
      setError(null);

      try {
        const result = await fetcher(page, pageSize);

        setData((prev) => {
          const newData = [...prev];
          const startIndex = (page - 1) * pageSize;
          result.data.forEach((item, index) => {
            newData[startIndex + index] = item;
          });
          return newData;
        });

        setTotal(result.total);
        prefetchedPages.current.add(page);

        // 预取后续页面
        for (let i = 1; i <= prefetchPages; i++) {
          const nextPage = page + i;
          if (!prefetchedPages.current.has(nextPage)) {
            fetcher(nextPage, pageSize)
              .then((nextResult) => {
                setData((prev) => {
                  const newData = [...prev];
                  const startIndex = (nextPage - 1) * pageSize;
                  nextResult.data.forEach((item, index) => {
                    newData[startIndex + index] = item;
                  });
                  return newData;
                });
                prefetchedPages.current.add(nextPage);
              })
              .catch(() => {
                // 预取失败静默处理
              });
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    },
    [fetcher, pageSize, prefetchPages],
  );

  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(page);
      loadPage(page);
    },
    [loadPage],
  );

  const refresh = useCallback(() => {
    prefetchedPages.current.clear();
    setData([]);
    loadPage(currentPage);
  }, [currentPage, loadPage]);

  const totalPages = Math.ceil(total / pageSize);
  const currentData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return {
    data: currentData,
    allData: data,
    currentPage,
    totalPages,
    total,
    loading,
    error,
    goToPage,
    refresh,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}
