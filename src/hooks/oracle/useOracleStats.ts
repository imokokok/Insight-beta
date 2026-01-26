import useSWR from 'swr';
import { fetchApiData } from '@/lib/utils';
import type { OracleStats } from '@/lib/types/oracleTypes';

export function useOracleStats() {
  const {
    data: stats,
    error,
    isLoading,
  } = useSWR<OracleStats>('/api/oracle/stats', fetchApiData, {
    refreshInterval: 15_000,
    dedupingInterval: 10_000,
    revalidateOnFocus: true,
  });

  return {
    stats: stats ?? null,
    loading: isLoading,
    error: error?.message ?? null,
  };
}
