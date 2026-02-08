import { useState, useEffect } from 'react';

import useSWR from 'swr';

import type { BaseResponse } from '@/hooks/useUI';
import { useInfiniteList } from '@/hooks/useUI';
import { CACHE_CONFIG } from '@/lib/config/constants';
import { logger } from '@/lib/logger';
import type { Assertion, OracleConfig, OracleStats, OracleStatus } from '@/lib/types/oracleTypes';
import { fetchApiData } from '@/lib/utils';

const STORAGE_KEY = 'oracleFilters';
const DEFAULT_INSTANCE_ID = 'default';

interface OracleFilters {
  instanceId?: string;
}

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

// ============================================================================
// useOracleFilters - Oracle 过滤器 Hook
// ============================================================================

export function useOracleFilters() {
  const [instanceId, setInstanceId] = useState<string>(DEFAULT_INSTANCE_ID);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        setInstanceId(DEFAULT_INSTANCE_ID);
        return;
      }

      const parsed = JSON.parse(saved) as OracleFilters | null;
      const value = parsed?.instanceId;

      if (typeof value === 'string' && value.trim()) {
        setInstanceId(value.trim());
      } else {
        setInstanceId(DEFAULT_INSTANCE_ID);
      }
    } catch {
      setInstanceId(DEFAULT_INSTANCE_ID);
    }
  }, []);

  const updateInstanceId = (newInstanceId: string) => {
    const normalized = newInstanceId.trim() || DEFAULT_INSTANCE_ID;
    setInstanceId(normalized);

    if (typeof window !== 'undefined') {
      try {
        const filters: OracleFilters = { instanceId: normalized };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
      } catch (error) {
        logger.error('Failed to save instanceId', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  };

  const clearInstanceId = () => {
    setInstanceId(DEFAULT_INSTANCE_ID);

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        logger.error('Failed to clear instanceId', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  };

  return {
    instanceId,
    setInstanceId: updateInstanceId,
    clearInstanceId,
    isDefault: instanceId === DEFAULT_INSTANCE_ID,
  };
}
