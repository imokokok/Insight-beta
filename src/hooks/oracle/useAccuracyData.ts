'use client';

import { useState, useEffect, useCallback } from 'react';

import { logger } from '@/lib/logger';
import { fetchApiData } from '@/lib/utils';
import type { PricePoint } from '@/server/oracle/priceFetcher';

export interface UseAccuracyDataReturn {
  data: PricePoint[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * useAccuracyData Hook - 获取精度数据
 *
 * @param instanceId - 实例 ID
 * @param enabled - 是否启用获取（用于懒加载）
 * @returns 精度数据、加载状态、错误信息和刷新函数
 */
export function useAccuracyData(
  instanceId?: string | null,
  enabled: boolean = true,
): UseAccuracyDataReturn {
  const [data, setData] = useState<PricePoint[]>([]);
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
        params.set('limit', '100');

        const url = `/api/oracle/accuracy?${params.toString()}`;
        const accuracy = await fetchApiData<PricePoint[]>(url, { signal });
        setData(accuracy);
      } catch (error: unknown) {
        if (signal?.aborted) return;
        logger.error('Failed to fetch accuracy data:', { error });
        setError(error instanceof Error ? error.message : 'unknown_error');
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
