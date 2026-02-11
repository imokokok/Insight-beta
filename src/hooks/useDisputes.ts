import { createSWRInfiniteConfig } from '@/hooks/common/useSWRConfig';
import type { BaseResponse } from '@/hooks/useUI';
import { useInfiniteList } from '@/hooks/useUI';
import type { Dispute, OracleConfig, DisputeStatus } from '@/lib/types/oracleTypes';

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

    const params = new URLSearchParams();
    if (normalizedInstanceId) params.set('instanceId', normalizedInstanceId);
    if (filterStatus && filterStatus !== 'All') params.set('status', filterStatus);
    if (filterChain && filterChain !== 'All') params.set('chain', filterChain);
    if (query && query.trim()) params.set('q', query.trim());
    if (disputer) params.set('disputer', disputer);
    params.set('limit', '30');

    // For first page, no cursor. For next pages, use prev cursor
    if (pageIndex > 0 && previousPageData?.nextCursor) {
      params.set('cursor', String(previousPageData.nextCursor));
    }

    return `/api/oracle/disputes?${params.toString()}`;
  };

  const { items, loading, loadingMore, error, loadMore, hasMore, refresh } =
    useInfiniteList<Dispute>(getUrl, createSWRInfiniteConfig() as Parameters<typeof useInfiniteList>[1]);

  return {
    items,
    loading,
    loadingMore,
    error,
    loadMore,
    hasMore,
    refresh,
  };
}
