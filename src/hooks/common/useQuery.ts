/**
 * Query Hook - 统一的数据查询 Hook
 *
 * 提供统一的数据获取接口，支持简单查询和分页查询
 */

import { useCallback, useMemo, useState } from 'react';

import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';

import { fetchApiData } from '@/lib/utils';
import type { PaginationParams, PaginatedResult } from '@/lib/types/common';

// ============================================================================
// 类型定义
// ============================================================================

export interface UseQueryOptions<T> {
  url: string | null;
  enabled?: boolean;
  config?: {
    refreshInterval?: number;
    dedupingInterval?: number;
    revalidateOnFocus?: boolean;
    revalidateOnReconnect?: boolean;
    revalidateIfStale?: boolean;
    errorRetryCount?: number;
    errorRetryInterval?: number;
    shouldRetryOnError?: boolean;
    keepPreviousData?: boolean;
    suspense?: boolean;
  };
  transform?: (data: T) => T;
}

export interface UseQueryReturn<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isValidating: boolean;
  mutate: () => Promise<void>;
}

export interface UseInfiniteQueryOptions<T> {
  getUrl: (pageIndex: number, previousPageData: PaginatedResult<T> | null) => string | null;
  config?: {
    refreshInterval?: number;
    dedupingInterval?: number;
    revalidateOnFocus?: boolean;
    revalidateFirstPage?: boolean;
    errorRetryCount?: number;
    errorRetryInterval?: number;
    shouldRetryOnError?: boolean;
  };
  transform?: (pages: PaginatedResult<T>[]) => T[];
}

export interface UseInfiniteQueryReturn<T> {
  items: T[];
  error: Error | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  mutate: () => Promise<void>;
}

export interface UsePaginatedQueryReturn<T> extends UseQueryReturn<PaginatedResult<T>> {
  pagination: {
    page: number;
    totalPages: number;
  };
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
}

// ============================================================================
// 简单查询 Hook
// ============================================================================

export function useQuery<T>(options: UseQueryOptions<T>): UseQueryReturn<T> {
  const { url, enabled = true, config = {}, transform } = options;

  const shouldFetch = enabled && url !== null;

  const { data, error, isLoading, isValidating, mutate: swrMutate } = useSWR<T>(
    shouldFetch ? url : null,
    fetchApiData,
    {
      refreshInterval: config.refreshInterval ?? 0,
      dedupingInterval: config.dedupingInterval ?? 2000,
      revalidateOnFocus: config.revalidateOnFocus ?? false,
      revalidateOnReconnect: config.revalidateOnReconnect ?? true,
      revalidateIfStale: config.revalidateIfStale ?? false,
      errorRetryCount: config.errorRetryCount ?? 3,
      errorRetryInterval: config.errorRetryInterval ?? 1000,
      shouldRetryOnError: config.shouldRetryOnError ?? true,
      keepPreviousData: config.keepPreviousData ?? true,
      suspense: config.suspense ?? false,
    },
  );

  const mutate = useCallback(async () => {
    await swrMutate();
  }, [swrMutate]);

  const transformedData = useMemo(() => {
    if (!data || !transform) return data;
    return transform(data);
  }, [data, transform]);

  return {
    data: transformedData ?? null,
    error: error as Error | null,
    isLoading: isLoading && !data,
    isValidating,
    mutate,
  };
}

// ============================================================================
// 无限查询 Hook
// ============================================================================

export function useInfiniteQuery<T>(options: UseInfiniteQueryOptions<T>): UseInfiniteQueryReturn<T> {
  const { getUrl, config = {}, transform } = options;

  const { data, error, isLoading, size, setSize, mutate: swrMutate } = useSWRInfinite<
    PaginatedResult<T>
  >(getUrl, fetchApiData, {
    revalidateFirstPage: config.revalidateFirstPage ?? false,
    revalidateOnFocus: config.revalidateOnFocus ?? false,
    revalidateAll: false,
    refreshInterval: config.refreshInterval ?? 0,
    dedupingInterval: config.dedupingInterval ?? 10000,
    revalidateOnReconnect: true,
    errorRetryCount: config.errorRetryCount ?? 3,
    errorRetryInterval: config.errorRetryInterval ?? 5000,
    shouldRetryOnError: config.shouldRetryOnError ?? true,
  });

  const items = useMemo(() => {
    if (!data) return [];
    const allItems = data.flatMap((page) => page.items);
    if (!transform) return allItems;
    return transform(data);
  }, [data, transform]);

  const lastPage = data ? data[data.length - 1] : null;
  const hasMore = lastPage ? lastPage.meta.hasNext : false;
  const isLoadingMore = isLoading && size > 0 && (!data || data[size - 1] === undefined);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      setSize(size + 1);
    }
  }, [hasMore, isLoadingMore, setSize, size]);

  const mutate = useCallback(async () => {
    await swrMutate();
  }, [swrMutate]);

  return {
    items,
    error: error as Error | null,
    isLoading: isLoading && !data,
    isLoadingMore,
    hasMore,
    loadMore,
    mutate,
  };
}

// ============================================================================
// 分页查询 Hook
// ============================================================================

export function usePaginatedQuery<T>(
  baseUrl: string,
  params: PaginationParams = {},
  options: Omit<UseQueryOptions<PaginatedResult<T>>, 'url'> = {},
): UsePaginatedQueryReturn<T> {
  const [page, setPage] = useState(params.page ?? 1);
  const [paginationParams, setPaginationParams] = useState<PaginationParams>(params);

  const queryParams = new URLSearchParams();
  if (paginationParams.page) queryParams.set('page', String(paginationParams.page));
  if (paginationParams.limit) queryParams.set('limit', String(paginationParams.limit));
  if (paginationParams.cursor) queryParams.set('cursor', paginationParams.cursor);

  const url = `${baseUrl}?${queryParams.toString()}`;

  const result = useQuery<PaginatedResult<T>>({
    ...options,
    url,
    enabled: options.enabled !== false,
  });

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
    setPaginationParams((prev) => ({ ...prev, page: newPage }));
  }, []);

  const nextPage = useCallback(() => {
    if (result.data && page < result.data.meta.totalPages) {
      goToPage(page + 1);
    }
  }, [result.data, page, goToPage]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      goToPage(page - 1);
    }
  }, [page, goToPage]);

  return {
    ...result,
    pagination: {
      page,
      totalPages: result.data?.meta.totalPages ?? 0,
    },
    goToPage,
    nextPage,
    prevPage,
  };
}

// ============================================================================
// 实时查询 Hook
// ============================================================================

export function useRealtimeQuery<T>(url: string | null, refreshInterval = 5000) {
  return useQuery<T>({
    url,
    enabled: url !== null,
    config: {
      refreshInterval,
      dedupingInterval: 1000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateIfStale: true,
      errorRetryCount: 5,
    },
  });
}

// ============================================================================
// 一次性查询 Hook
// ============================================================================

export function useLazyQuery<T>(url: string | null) {
  const [shouldFetch, setShouldFetch] = useState(false);

  const result = useQuery<T>({
    url: shouldFetch ? url : null,
    enabled: shouldFetch,
    config: {
      refreshInterval: 0,
      dedupingInterval: Infinity,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      errorRetryCount: 0,
      shouldRetryOnError: false,
    },
  });

  const execute = useCallback(() => {
    setShouldFetch(true);
  }, []);

  return {
    ...result,
    execute,
  };
}
