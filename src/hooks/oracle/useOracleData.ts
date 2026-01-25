import useSWR from "swr";
import { fetchApiData } from "@/lib/utils";
import type {
  Assertion,
  OracleConfig,
  OracleStats,
  OracleStatus,
} from "@/lib/types/oracleTypes";
import type { BaseResponse } from "@/hooks/ui/useInfiniteList";
import { useInfiniteList } from "@/hooks/ui/useInfiniteList";

export function useOracleData(
  filterStatus: OracleStatus | "All",
  filterChain: OracleConfig["chain"] | "All",
  query: string,
  asserter?: string | null,
  instanceId?: string | null,
) {
  const normalizedInstanceId = (instanceId ?? "").trim();

  // 1. Stats Fetching (Standard SWR)
  const { data: stats, error: statsError } = useSWR<OracleStats>(
    normalizedInstanceId
      ? `/api/oracle/stats?instanceId=${encodeURIComponent(normalizedInstanceId)}`
      : "/api/oracle/stats",
    fetchApiData,
    {
      refreshInterval: 30_000, // 延长刷新间隔到30秒
      dedupingInterval: 15_000, // 延长去重间隔到15秒
      revalidateOnFocus: true, // 保持焦点重验证
      revalidateOnReconnect: true, // 连接恢复时重新验证
      errorRetryCount: 3, // 错误重试3次
      errorRetryInterval: 1000, // 初始重试间隔
      shouldRetryOnError: true,
    },
  );

  // 2. Assertions Fetching (Infinite SWR for pagination)
  const getUrl = (
    pageIndex: number,
    previousPageData: BaseResponse<Assertion> | null,
  ) => {
    // If reached the end, return null
    if (previousPageData && previousPageData.nextCursor === null) return null;

    const params = new URLSearchParams();
    if (normalizedInstanceId) params.set("instanceId", normalizedInstanceId);
    if (filterStatus !== "All") params.set("status", filterStatus);
    if (filterChain !== "All") params.set("chain", filterChain);
    if (query.trim()) params.set("q", query.trim());
    if (asserter != null) params.set("asserter", asserter);
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
    refresh,
  } = useInfiniteList<Assertion>(getUrl, {
    refreshInterval: 30_000, // 延长刷新间隔到30秒
    revalidateOnFocus: false, // 关闭焦点重验证
    dedupingInterval: 15_000, // 延长去重间隔到15秒
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
