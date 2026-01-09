import { useCallback } from "react";
import useSWRInfinite from "swr/infinite";
import { fetchApiData } from "@/lib/utils";

export interface BaseResponse<T> {
  items: T[];
  total: number;
  nextCursor: number | null;
}

export function useInfiniteList<T>(
  getUrl: (pageIndex: number, previousPageData: BaseResponse<T> | null) => string | null,
  options: {
    refreshInterval?: number;
    revalidateFirstPage?: boolean;
  } = {}
) {
  const { 
    data: pages, 
    error, 
    size, 
    setSize, 
    isValidating,
    mutate
  } = useSWRInfinite<BaseResponse<T>>(
    getUrl, 
    fetchApiData,
    { 
      revalidateFirstPage: false,
      refreshInterval: 5000,
      ...options
    }
  );

  // Flatten items from all pages
  const items = pages ? pages.flatMap(page => page.items) : [];
  
  // Check if we can load more
  const lastPage = pages ? pages[pages.length - 1] : null;
  const hasMore = lastPage?.nextCursor !== null && lastPage?.nextCursor !== undefined;

  // Loading states
  const loading = !pages && !error; // Initial load
  const loadingMore = !!(size > 0 && pages && typeof pages[size - 1] === "undefined");

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
    mutate
  };
}
