'use client';

import { useState, useEffect, useCallback } from 'react';

import type { ChartItem } from '@/components/features/charts/types';
import { logger } from '@/lib/logger';
import { fetchApiData } from '@/lib/utils';

export interface UseChartDataReturn {
  data: ChartItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * useChartData Hook - 获取图表数据
 *
 * @param instanceId - 实例 ID
 * @returns 图表数据、加载状态、错误信息和刷新函数
 */
export function useChartData(instanceId?: string | null): UseChartDataReturn {
  const [data, setData] = useState<ChartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (instanceId) params.set('instanceId', instanceId);
        params.set('limit', '50');

        const url = `/api/oracle/charts?${params.toString()}`;
        const charts = await fetchApiData<ChartItem[]>(url, { signal });
        setData(charts);
      } catch (error: unknown) {
        if (signal?.aborted) return;
        logger.error('Failed to fetch chart data:', { error });
        setError(error instanceof Error ? error.message : 'unknown_error');
      } finally {
        setLoading(false);
      }
    },
    [instanceId],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}
