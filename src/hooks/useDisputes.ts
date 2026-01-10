import type { Dispute, OracleConfig, DisputeStatus } from "@/lib/oracleTypes";
import { useInfiniteList, BaseResponse } from "./useInfiniteList";

export function useDisputes(
  filterStatus: DisputeStatus | "All" | null,
  filterChain: OracleConfig["chain"] | "All" | null,
  query: string | null,
  disputer?: string | null
) {
  const getUrl = (pageIndex: number, previousPageData: BaseResponse<Dispute> | null) => {
    // If reached the end, return null
    if (previousPageData && previousPageData.nextCursor === null) return null;

    const params = new URLSearchParams();
    if (filterStatus && filterStatus !== "All") params.set("status", filterStatus);
    if (filterChain && filterChain !== "All") params.set("chain", filterChain);
    if (query && query.trim()) params.set("q", query.trim());
    if (disputer) params.set("disputer", disputer);
    params.set("limit", "30");
    
    // For first page, no cursor. For next pages, use prev cursor
    if (pageIndex > 0 && previousPageData?.nextCursor) {
      params.set("cursor", String(previousPageData.nextCursor));
    }

    return `/api/oracle/disputes?${params.toString()}`;
  };

  const { 
    items, 
    loading, 
    loadingMore, 
    error, 
    loadMore, 
    hasMore, 
    refresh 
  } = useInfiniteList<Dispute>(getUrl);

  return { 
    items, 
    loading, 
    loadingMore, 
    error, 
    loadMore, 
    hasMore, 
    refresh 
  };
}
