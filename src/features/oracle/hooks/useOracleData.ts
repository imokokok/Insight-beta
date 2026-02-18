import { useState, useEffect } from 'react';

import useSWR from 'swr';

import {
  createSWRConfig,
  createSWRInfiniteConfig,
  useInfiniteList,
  type BaseResponse,
} from '@/hooks';
import { fetchApiData, buildApiUrl } from '@/shared/utils';
import type { Assertion, OracleStats, OracleStatus } from '@/types/oracleTypes';
import type { OracleConfig } from '@/types/oracleTypes';

export function useOracleData(
  filterStatus: OracleStatus | 'All',
  filterChain: OracleConfig['chain'] | 'All',
  query: string,
  asserter?: string | null,
  instanceId?: string | null,
) {
  const normalizedInstanceId = (instanceId ?? '').trim();

  const {
    data: stats,
    error: statsError,
    mutate: mutateStats,
  } = useSWR<OracleStats>(
    normalizedInstanceId
      ? `/api/oracle/stats?instanceId=${encodeURIComponent(normalizedInstanceId)}`
      : '/api/oracle/stats',
    fetchApiData,
    createSWRConfig<OracleStats>(),
  );

  const getUrl = (pageIndex: number, previousPageData: BaseResponse<Assertion> | null) => {
    if (previousPageData && previousPageData.nextCursor === null) return null;

    const url = buildApiUrl('/api/oracle/assertions', {
      instanceId: normalizedInstanceId || undefined,
      status: filterStatus !== 'All' ? filterStatus : undefined,
      chain: filterChain !== 'All' ? filterChain : undefined,
      q: query.trim() || undefined,
      asserter: asserter ?? undefined,
      limit: 30,
      cursor:
        pageIndex > 0 && previousPageData?.nextCursor
          ? String(previousPageData.nextCursor)
          : undefined,
    });

    return url;
  };

  const {
    items,
    loading,
    loadingMore,
    error: assertionsError,
    loadMore,
    hasMore,
    refresh,
    mutate: mutateAssertions,
  } = useInfiniteList<Assertion>(
    getUrl,
    createSWRInfiniteConfig() as Parameters<typeof useInfiniteList>[1],
  );

  const mutate = async () => {
    await Promise.all([mutateAssertions(), mutateStats()]);
  };

  return {
    items,
    stats: stats ?? null,
    loading,
    loadingMore,
    error: (assertionsError || statsError)?.message ?? null,
    loadMore,
    hasMore,
    refresh,
    mutate,
  };
}

export function useOracleFilters() {
  const [instanceId, setInstanceIdState] = useState<string>('default');

  useEffect(() => {
    const saved = localStorage.getItem('oracleInstanceId');
    if (saved) setInstanceIdState(saved);
  }, []);

  const updateInstanceId = (newInstanceId: string) => {
    const normalized = newInstanceId.trim();
    setInstanceIdState(normalized);
    localStorage.setItem('oracleInstanceId', normalized);
  };

  const clearInstanceId = () => {
    setInstanceIdState('default');
    localStorage.removeItem('oracleInstanceId');
  };

  return {
    instanceId,
    setInstanceId: updateInstanceId,
    clearInstanceId,
    isDefault: instanceId === 'default',
  };
}
