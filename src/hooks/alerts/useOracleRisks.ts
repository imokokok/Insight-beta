/**
 * useOracleRisks Hook
 *
 * 获取 Oracle 风险数据
 */

import { useCallback, useEffect, useState } from 'react';
import { fetchApiData, getErrorCode } from '@/lib/utils';
import type { RiskItem } from '@/lib/types/oracleTypes';

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
    } catch (e) {
      setRisksError(getErrorCode(e));
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
