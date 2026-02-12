import type { BaseResponse } from '@/hooks/useUI';
import { useInfiniteList } from '@/hooks/useUI';
import type { Dispute, OracleConfig, DisputeStatus } from '@/types/oracleTypes';
import { buildApiUrl } from '@/shared/utils';

import { createSWRInfiniteConfig } from './useSWRConfig';

export function useDisputes(
  filterStatus: DisputeStatus | 'All' | null,
  filterChain: OracleConfig['chain'] | 'All' | null,
  query: string | null,
  disputer?: string | null,
  instanceId?: string | null,
) {
  const normalizedInstanceId = (instanceId ?? '').trim();

  const getUrl = (pageIndex: number, previousPageData: BaseResponse<Dispute> | null) => {
    // If reached the end, return null
    if (previousPageData && previousPageData.nextCursor === null) return null;

    const url = buildApiUrl('/api/oracle/disputes', {
      instanceId: normalizedInstanceId || undefined,
      status: filterStatus && filterStatus !== 'All' ? filterStatus : undefined,
      chain: filterChain && filterChain !== 'All' ? filterChain : undefined,
      q: query?.trim() || undefined,
      disputer: disputer || undefined,
      limit: 30,
      cursor: pageIndex > 0 && previousPageData?.nextCursor ? String(previousPageData.nextCursor) : undefined,
    });

    return url;
  };

  const { items, loading, loadingMore, error, loadMore, hasMore, refresh, mutate } =
    useInfiniteList<Dispute>(getUrl, createSWRInfiniteConfig() as Parameters<typeof useInfiniteList>[1]);

  return {
    items,
    loading,
    loadingMore,
    error,
    loadMore,
    hasMore,
    refresh,
    mutate,
  };
}
