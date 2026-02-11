import type { IncidentWithAlerts } from '@/app/alerts/alertsComponents';
import type { OpsMetrics, OpsMetricsSeriesPoint, RiskItem } from '@/lib/types/oracleTypes';

import { useQuery } from './common/useQuery';

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
  const params = new URLSearchParams();
  params.set('limit', '20');
  params.set('includeAlerts', '1');
  if (instanceId) {
    params.set('instanceId', instanceId);
  }
  const url = `/api/oracle/incidents?${params.toString()}`;

  const { data, error, isLoading, mutate } = useQuery<IncidentWithAlerts[]>({
    url: url,
    transform: (response: any) => {
      if (Array.isArray(response)) {
        return response;
      }
      // Handle case where response might have an items property
      if (response && typeof response === 'object' && 'items' in response) {
        return response.items as IncidentWithAlerts[];
      }
      return [];
    },
  });

  return {
    incidents: data || [],
    incidentsError: error?.message || null,
    incidentsLoading: isLoading,
    reloadIncidents: mutate,
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
  const params = new URLSearchParams();
  params.set('limit', '20');
  if (instanceId) {
    params.set('instanceId', instanceId);
  }
  const url = `/api/oracle/risks?${params.toString()}`;

  const { data, error, isLoading, mutate } = useQuery<RiskItem[]>({
    url: url,
    transform: (response: any) => {
      if (Array.isArray(response)) {
        return response;
      }
      // Handle case where response might have an items property
      if (response && typeof response === 'object' && 'items' in response) {
        return response.items as RiskItem[];
      }
      return [];
    },
  });

  return {
    risks: data || [],
    risksError: error?.message || null,
    risksLoading: isLoading,
    reloadRisks: mutate,
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
  const params = new URLSearchParams();
  params.set('windowDays', '7');
  params.set('seriesDays', '7');
  if (instanceId) {
    params.set('instanceId', instanceId);
  }
  const url = `/api/oracle/ops-metrics?${params.toString()}`;

  const { data, error, isLoading, mutate } = useQuery<OpsMetricsResponse>({
    url: url,
    transform: (response: any) => response as OpsMetricsResponse,
  });

  return {
    opsMetrics: data?.metrics ?? null,
    opsMetricsSeries: data?.series ?? null,
    opsMetricsError: error?.message || null,
    opsMetricsLoading: isLoading,
    reloadOpsMetrics: mutate,
  };
}
