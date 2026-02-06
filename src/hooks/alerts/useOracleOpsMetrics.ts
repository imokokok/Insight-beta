/**
 * useOracleOpsMetrics Hook
 *
 * 获取 Oracle 运维指标数据
 */

import { useCallback, useEffect, useState } from 'react';
import { fetchApiData, getErrorCode } from '@/lib/utils';
import type { OpsMetrics, OpsMetricsSeriesPoint } from '@/lib/types/oracleTypes';

export interface UseOracleOpsMetricsReturn {
  opsMetrics: OpsMetrics | null;
  opsMetricsSeries: OpsMetricsSeriesPoint[] | null;
  opsMetricsError: string | null;
  opsMetricsLoading: boolean;
  reloadOpsMetrics: () => Promise<void>;
}

export function useOracleOpsMetrics(instanceId: string): UseOracleOpsMetricsReturn {
  const [opsMetrics, setOpsMetrics] = useState<OpsMetrics | null>(null);
  const [opsMetricsSeries, setOpsMetricsSeries] = useState<OpsMetricsSeriesPoint[] | null>(null);
  const [opsMetricsError, setOpsMetricsError] = useState<string | null>(null);
  const [opsMetricsLoading, setOpsMetricsLoading] = useState(false);

  const reloadOpsMetrics = useCallback(async () => {
    setOpsMetricsError(null);
    setOpsMetricsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('windowDays', '7');
      params.set('seriesDays', '7');
      if (instanceId) params.set('instanceId', instanceId);
      const data = await fetchApiData<{
        metrics: OpsMetrics;
        series: OpsMetricsSeriesPoint[] | null;
      }>(`/api/oracle/ops-metrics?${params.toString()}`);
      setOpsMetrics(data.metrics ?? null);
      setOpsMetricsSeries(data.series ?? null);
    } catch (e) {
      setOpsMetricsError(getErrorCode(e));
      setOpsMetricsSeries(null);
    } finally {
      setOpsMetricsLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    void reloadOpsMetrics();
  }, [reloadOpsMetrics]);

  return {
    opsMetrics,
    opsMetricsSeries,
    opsMetricsError,
    opsMetricsLoading,
    reloadOpsMetrics,
  };
}
