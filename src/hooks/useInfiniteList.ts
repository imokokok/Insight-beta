import { useCallback, useMemo } from "react";
import useSWRInfinite from "swr/infinite";
import { fetchApiData } from "@/lib/utils";

export interface BaseResponse<T> {
  items: T[];
  total: number;
  nextCursor: number | null;
}

export function useInfiniteList<T>(
  getUrl: (
    pageIndex: number,
    previousPageData: BaseResponse<T> | null,
  ) => string | null,
  options: {
    refreshInterval?: number;
    revalidateFirstPage?: boolean;
    revalidateOnFocus?: boolean;
    dedupingInterval?: number;
  } = {},
) {
  const {
    data: pages,
    error,
    isLoading,
    size,
    setSize,
    mutate,
  } = useSWRInfinite<BaseResponse<T>>(getUrl, fetchApiData, {
    revalidateFirstPage: false,
    revalidateOnFocus: false,
    revalidateAll: false,
    refreshInterval: 0,
    dedupingInterval: 10_000,
    revalidateOnReconnect: true,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
    shouldRetryOnError: true,
    ...options,
  });

  // Flatten items from all pages
  const items = useMemo(
    () => (pages ? pages.flatMap((page) => page.items) : []),
    [pages],
  );

  // Check if we can load more
  const lastPage = pages ? pages[pages.length - 1] : null;
  const hasMore = Boolean(lastPage?.nextCursor);

  // Loading states
  const loading = isLoading || (!pages && !error);
  const loadingMore = !!(
    size > 0 &&
    pages &&
    typeof pages[size - 1] === "undefined"
  );

  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore) {
      setSize(size + 1);
    }
  }, [hasMore, loadingMore, setSize, size]);

  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);

  return {
    items,
    loading,
    loadingMore,
    error: error?.message ?? null,
    loadMore,
    hasMore,
    refresh,
    mutate,
  };
}
