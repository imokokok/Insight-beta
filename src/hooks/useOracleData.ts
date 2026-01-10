import useSWR from "swr";
import { fetchApiData } from "@/lib/utils";
import type { Assertion, OracleConfig, OracleStats, OracleStatus } from "@/lib/oracleTypes";
import { useInfiniteList, BaseResponse } from "./useInfiniteList";

export function useOracleData(
  filterStatus: OracleStatus | "All",
  filterChain: OracleConfig["chain"] | "All",
  query: string,
  asserter?: string | null
) {
  // 1. Stats Fetching (Standard SWR)
  const { 
    data: stats, 
    error: statsError 
  } = useSWR<OracleStats>(
    "/api/oracle/stats", 
    fetchApiData,
    { refreshInterval: 5000 }
  );

  // 2. Assertions Fetching (Infinite SWR for pagination)
  const getUrl = (pageIndex: number, previousPageData: BaseResponse<Assertion> | null) => {
    // If reached the end, return null
    if (previousPageData && previousPageData.nextCursor === null) return null;

    const params = new URLSearchParams();
    if (filterStatus !== "All") params.set("status", filterStatus);
    if (filterChain !== "All") params.set("chain", filterChain);
    if (query.trim()) params.set("q", query.trim());
    if (asserter) params.set("asserter", asserter);
    params.set("limit", "30");
    
    // For first page, no cursor. For next pages, use prev cursor
    if (pageIndex > 0 && previousPageData?.nextCursor) {
      params.set("cursor", String(previousPageData.nextCursor));
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
    refresh 
  } = useInfiniteList<Assertion>(getUrl);

  return { 
    items, 
    stats: stats ?? null, 
    loading, 
    loadingMore, 
    error: (assertionsError || statsError)?.message ?? null, 
    loadMore, 
    hasMore, 
    refresh 
  };
}
