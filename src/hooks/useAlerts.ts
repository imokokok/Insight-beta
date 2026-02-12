import type { IncidentWithAlerts } from '@/app/alerts/AlertsComponents';
import { buildApiUrl, normalizeListResponse } from '@/shared/utils';
import type { OpsMetrics, OpsMetricsSeriesPoint, RiskItem } from '@/types/oracleTypes';

import { useQuery } from './useQuery';

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
  const url = buildApiUrl('/api/oracle/incidents', {
    limit: 20,
    includeAlerts: 1,
    instanceId: instanceId || undefined,
  });

  const { data, error, isLoading, mutate } = useQuery<IncidentWithAlerts[]>({
    url: url,
    transform: normalizeListResponse<IncidentWithAlerts>,
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
  const url = buildApiUrl('/api/oracle/risks', {
    limit: 20,
    instanceId: instanceId || undefined,
  });

  const { data, error, isLoading, mutate } = useQuery<RiskItem[]>({
    url: url,
    transform: normalizeListResponse<RiskItem>,
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
  const url = buildApiUrl('/api/oracle/ops-metrics', {
    windowDays: 7,
    seriesDays: 7,
    instanceId: instanceId || undefined,
  });

  const { data, error, isLoading, mutate } = useQuery<OpsMetricsResponse>({
    url: url,
    transform: (response: unknown) => {
      // Type guard to validate response structure
      if (
        response &&
        typeof response === 'object' &&
        'metrics' in response &&
        response.metrics &&
        typeof response.metrics === 'object'
      ) {
        return response as OpsMetricsResponse;
      }
      // Return default structure if response is invalid
      return {
        metrics: {} as OpsMetrics,
        series: null,
      };
    },
  });

  return {
    opsMetrics: data?.metrics ?? null,
    opsMetricsSeries: data?.series ?? null,
    opsMetricsError: error?.message || null,
    opsMetricsLoading: isLoading,
    reloadOpsMetrics: mutate,
  };
}
