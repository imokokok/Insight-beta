import { useState, useEffect } from 'react';

import useSWR from 'swr';

import type { BaseResponse } from '@/hooks/useUI';
import { useInfiniteList } from '@/hooks/useUI';
import {
  fetchApiData,
  getOracleInstanceId,
  setOracleInstanceId,
  clearOracleFilters,
  isDefaultOracleInstance,
  buildApiUrl,
} from '@/shared/utils';
import type { Assertion, OracleConfig, OracleStats, OracleStatus } from '@/types/oracleTypes';

import { createSWRConfig, createSWRInfiniteConfig } from './useSWRConfig';

// ============================================================================
// useOracleData - Oracle 数据获取 Hook
// ============================================================================

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
    // If reached the end, return null
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

// ============================================================================
// useOracleFilters - Oracle 过滤器 Hook
// ============================================================================

export function useOracleFilters() {
  const [instanceId, setInstanceIdState] = useState<string>('default');

  useEffect(() => {
    // 组件挂载时从 storage 读取最新值
    getOracleInstanceId().then((id) => setInstanceIdState(id));
  }, []);

  const updateInstanceId = (newInstanceId: string) => {
    const normalized = newInstanceId.trim();
    setInstanceIdState(normalized);
    setOracleInstanceId(normalized);
  };

  const clearInstanceId = () => {
    setInstanceIdState('default');
    clearOracleFilters();
  };

  return {
    instanceId,
    setInstanceId: updateInstanceId,
    clearInstanceId,
    isDefault: isDefaultOracleInstance(instanceId),
  };
}
