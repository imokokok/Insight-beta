import { useEffect, useState } from "react";
import { fetchApiData } from "@/lib/utils";
import type { Assertion, OracleConfig, OracleStats, OracleStatus } from "@/lib/oracleTypes";

export function useOracleData(
  filterStatus: OracleStatus | "All",
  filterChain: OracleConfig["chain"] | "All",
  query: string
) {
  const [items, setItems] = useState<Assertion[]>([]);
  const [stats, setStats] = useState<OracleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filterStatus !== "All") params.set("status", filterStatus);
        if (filterChain !== "All") params.set("chain", filterChain);
        if (query.trim()) params.set("q", query.trim());
        params.set("limit", "30");

        const [assertionsData, statsData] = await Promise.all([
          fetchApiData<{ items: Assertion[]; total: number; nextCursor: number | null }>(
            `/api/oracle/assertions?${params.toString()}`,
            {
              signal: controller.signal
            }
          ),
          fetchApiData<OracleStats>("/api/oracle/stats", { signal: controller.signal })
        ]);

        if (cancelled) return;
        setItems(assertionsData.items ?? []);
        setNextCursor(assertionsData.nextCursor ?? null);
        setStats(statsData);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "unknown_error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const timeout = window.setTimeout(load, 250);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [filterStatus, filterChain, query, refreshKey]);

  const loadMore = async () => {
    if (nextCursor === null) return;
    setLoadingMore(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "All") params.set("status", filterStatus);
      if (filterChain !== "All") params.set("chain", filterChain);
      if (query.trim()) params.set("q", query.trim());
      params.set("limit", "30");
      params.set("cursor", String(nextCursor));

      const data = await fetchApiData<{ items: Assertion[]; total: number; nextCursor: number | null }>(
        `/api/oracle/assertions?${params.toString()}`
      );

      setItems((prev) => prev.concat(data.items ?? []));
      setNextCursor(data.nextCursor ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown_error");
    } finally {
      setLoadingMore(false);
    }
  };

  const refresh = () => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  };

  return { items, stats, loading, loadingMore, error, loadMore, hasMore: nextCursor !== null, refresh };
}
