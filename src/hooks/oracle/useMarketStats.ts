'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchApiData } from '@/lib/utils';
import { logger } from '@/lib/logger';
import type { MarketStat } from '@/components/features/charts/types';

export interface UseMarketStatsReturn {
  data: MarketStat[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * useMarketStats Hook - 获取市场统计数据
 *
 * @param instanceId - 实例 ID
 * @param enabled - 是否启用获取（用于懒加载）
 * @returns 市场统计数据、加载状态、错误信息和刷新函数
 */
export function useMarketStats(
  instanceId?: string | null,
  enabled: boolean = true,
): UseMarketStatsReturn {
  const [data, setData] = useState<MarketStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      if (!enabled) return;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (instanceId) params.set('instanceId', instanceId);

        const url = `/api/oracle/market-stats?${params.toString()}`;
        const stats = await fetchApiData<MarketStat[]>(url, { signal });
        setData(stats);
      } catch (e) {
        if (signal?.aborted) return;
        logger.error('Failed to fetch market stats:', { error: e });
        setError(e instanceof Error ? e.message : 'unknown_error');
      } finally {
        setLoading(false);
      }
    },
    [instanceId, enabled],
  );

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData, enabled]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}
