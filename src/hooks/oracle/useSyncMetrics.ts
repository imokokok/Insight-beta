'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchApiData } from '@/lib/utils';
import { logger } from '@/lib/logger';
import type { SyncMetricItem } from '@/components/features/charts/types';

export interface UseSyncMetricsReturn {
  data: SyncMetricItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * useSyncMetrics Hook - 获取同步指标数据
 *
 * @param instanceId - 实例 ID
 * @param enabled - 是否启用获取（用于懒加载）
 * @returns 同步指标数据、加载状态、错误信息和刷新函数
 */
export function useSyncMetrics(
  instanceId?: string | null,
  enabled: boolean = true,
): UseSyncMetricsReturn {
  const [data, setData] = useState<SyncMetricItem[]>([]);
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
        params.set('limit', '50');

        const url = `/api/oracle/sync-metrics?${params.toString()}`;
        const metrics = await fetchApiData<SyncMetricItem[]>(url, { signal });
        setData(metrics);
      } catch (e) {
        if (signal?.aborted) return;
        logger.error('Failed to fetch sync metrics:', { error: e });
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
