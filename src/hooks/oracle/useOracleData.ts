import useSWR from 'swr';
import { fetchApiData } from '@/lib/utils';
import type { Assertion, OracleConfig, OracleStats, OracleStatus } from '@/lib/types/oracleTypes';
import type { BaseResponse } from '@/hooks/ui/useInfiniteList';
import { useInfiniteList } from '@/hooks/ui/useInfiniteList';
import { CACHE_CONFIG } from '@/lib/config/constants';

export function useOracleData(
  filterStatus: OracleStatus | 'All',
  filterChain: OracleConfig['chain'] | 'All',
  query: string,
  asserter?: string | null,
  instanceId?: string | null,
) {
  const normalizedInstanceId = (instanceId ?? '').trim();

  // 1. Stats Fetching (Standard SWR)
  const { data: stats, error: statsError } = useSWR<OracleStats>(
    normalizedInstanceId
      ? `/api/oracle/stats?instanceId=${encodeURIComponent(normalizedInstanceId)}`
      : '/api/oracle/stats',
    fetchApiData,
    {
      refreshInterval: CACHE_CONFIG.DEFAULT_REFRESH_INTERVAL,
      dedupingInterval: CACHE_CONFIG.DEFAULT_DEDUPING_INTERVAL,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      revalidateIfStale: false,
      errorRetryCount: 3,
      errorRetryInterval: 1000,
      shouldRetryOnError: true,
      keepPreviousData: true,
      suspense: false,
    },
  );

  // 2. Assertions Fetching (Infinite SWR for pagination)
  const getUrl = (pageIndex: number, previousPageData: BaseResponse<Assertion> | null) => {
    // If reached the end, return null
    if (previousPageData && previousPageData.nextCursor === null) return null;

    const params = new URLSearchParams();
    if (normalizedInstanceId) params.set('instanceId', normalizedInstanceId);
    if (filterStatus !== 'All') params.set('status', filterStatus);
    if (filterChain !== 'All') params.set('chain', filterChain);
    if (query.trim()) params.set('q', query.trim());
    if (asserter != null) params.set('asserter', asserter);
    params.set('limit', '30');

    // For first page, no cursor. For next pages, use prev cursor
    if (pageIndex > 0 && previousPageData?.nextCursor) {
      params.set('cursor', String(previousPageData.nextCursor));
    }

    return `/api/oracle/assertions?${params.toString()}`;
  };

  const {
    items,
    loading,
    loadingMore,
    error: assertionsError,
    loadMore,
    hasMore,
    refresh,
  } = useInfiniteList<Assertion>(getUrl, {
    refreshInterval: CACHE_CONFIG.DEFAULT_REFRESH_INTERVAL,
    revalidateOnFocus: false,
    dedupingInterval: CACHE_CONFIG.DEFAULT_DEDUPING_INTERVAL,
    revalidateFirstPage: false,
  });

  return {
    items,
    stats: stats ?? null,
    loading,
    loadingMore,
    error: (assertionsError || statsError)?.message ?? null,
    loadMore,
    hasMore,
    refresh,
  };
}
