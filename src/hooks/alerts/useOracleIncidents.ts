/**
 * useOracleIncidents Hook
 *
 * 获取 Oracle 事件数据
 */

import { useCallback, useEffect, useState } from 'react';

import type { IncidentWithAlerts } from '@/app/alerts/alertsComponents';
import { fetchApiData, getErrorCode } from '@/lib/utils';

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
