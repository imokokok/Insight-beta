/**
 * Query Hook - 统一的数据查询 Hook
 *
 * 提供统一的数据获取接口，支持简单查询
 */

import { useCallback, useMemo } from 'react';

import useSWR from 'swr';

import { fetchApiData } from '@/shared/utils';

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
