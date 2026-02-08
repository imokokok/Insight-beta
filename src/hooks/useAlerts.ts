import { useCallback, useEffect, useState } from 'react';

import type { IncidentWithAlerts } from '@/app/alerts/alertsComponents';
import type { OpsMetrics, OpsMetricsSeriesPoint, RiskItem } from '@/lib/types/oracleTypes';
import { fetchApiData, getErrorCode } from '@/lib/utils';

// ============================================================================
// useOracleIncidents - Oracle 事件 Hook
// ============================================================================

export interface UseOracleIncidentsReturn {
  incidents: IncidentWithAlerts[];
  incidentsError: string | null;
  incidentsLoading: boolean;
  reloadIncidents: () => Promise<void>;
}

export function useOracleIncidents(instanceId: string): UseOracleIncidentsReturn {
  const [incidents, setIncidents] = useState<IncidentWithAlerts[]>([]);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);
  const [incidentsLoading, setIncidentsLoading] = useState(false);

  const reloadIncidents = useCallback(async () => {
    setIncidentsError(null);
    setIncidentsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '20');
      params.set('includeAlerts', '1');
      if (instanceId) params.set('instanceId', instanceId);
      const data = await fetchApiData<{ items: IncidentWithAlerts[] }>(
        `/api/oracle/incidents?${params.toString()}`,
      );
      setIncidents(data.items ?? []);
    } catch (error: unknown) {
      setIncidentsError(getErrorCode(error));
    } finally {
      setIncidentsLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    void reloadIncidents();
  }, [reloadIncidents]);

  return {
    incidents,
    incidentsError,
    incidentsLoading,
    reloadIncidents,
  };
}

// ============================================================================
// useOracleRisks - Oracle 风险 Hook
// ============================================================================

export interface UseOracleRisksReturn {
  risks: RiskItem[];
  risksError: string | null;
  risksLoading: boolean;
  reloadRisks: () => Promise<void>;
}

export function useOracleRisks(instanceId: string): UseOracleRisksReturn {
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [risksError, setRisksError] = useState<string | null>(null);
  const [risksLoading, setRisksLoading] = useState(false);

  const reloadRisks = useCallback(async () => {
    setRisksError(null);
    setRisksLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '20');
      if (instanceId) params.set('instanceId', instanceId);
      const data = await fetchApiData<{ items: RiskItem[] }>(
        `/api/oracle/risks?${params.toString()}`,
      );
      setRisks(data.items ?? []);
    } catch (error: unknown) {
      setRisksError(getErrorCode(error));
    } finally {
      setRisksLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    void reloadRisks();
  }, [reloadRisks]);

  return {
    risks,
    risksError,
    risksLoading,
    reloadRisks,
  };
}

// ============================================================================
// useOracleOpsMetrics - Oracle 运维指标 Hook
// ============================================================================

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
    } catch (error: unknown) {
      setOpsMetricsError(getErrorCode(error));
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
