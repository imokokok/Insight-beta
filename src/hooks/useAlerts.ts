import type { IncidentWithAlerts } from '@/app/alerts/alertsComponents';
import type { OpsMetrics, OpsMetricsSeriesPoint, RiskItem } from '@/lib/types/oracleTypes';

import { useApiQueryArray, useApiQuery } from './useApiQuery';

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
  const { items, error, loading, reload } = useApiQueryArray<IncidentWithAlerts>({
    url: '/api/oracle/incidents',
    params: {
      limit: '20',
      includeAlerts: '1',
      instanceId: instanceId || undefined,
    },
  });

  return {
    incidents: items,
    incidentsError: error,
    incidentsLoading: loading,
    reloadIncidents: reload,
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
  const { items, error, loading, reload } = useApiQueryArray<RiskItem>({
    url: '/api/oracle/risks',
    params: {
      limit: '20',
      instanceId: instanceId || undefined,
    },
  });

  return {
    risks: items,
    risksError: error,
    risksLoading: loading,
    reloadRisks: reload,
  };
}

// ============================================================================
// useOracleOpsMetrics - Oracle 运维指标 Hook
// ============================================================================

interface OpsMetricsResponse {
  metrics: OpsMetrics;
  series: OpsMetricsSeriesPoint[] | null;
}

export interface UseOracleOpsMetricsReturn {
  opsMetrics: OpsMetrics | null;
  opsMetricsSeries: OpsMetricsSeriesPoint[] | null;
  opsMetricsError: string | null;
  opsMetricsLoading: boolean;
  reloadOpsMetrics: () => Promise<void>;
}

export function useOracleOpsMetrics(instanceId: string): UseOracleOpsMetricsReturn {
  const { data, error, loading, reload } = useApiQuery<OpsMetricsResponse>({
    url: '/api/oracle/ops-metrics',
    params: {
      windowDays: '7',
      seriesDays: '7',
      instanceId: instanceId || undefined,
    },
    transform: (response) => response as OpsMetricsResponse,
  });

  return {
    opsMetrics: data?.metrics ?? null,
    opsMetricsSeries: data?.series ?? null,
    opsMetricsError: error,
    opsMetricsLoading: loading,
    reloadOpsMetrics: reload,
  };
}
