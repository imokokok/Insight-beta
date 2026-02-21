import useSWR from 'swr';

import type {
  TimePeriod,
  ReliabilityScore,
  ProtocolRanking,
  ReliabilityApiResponse,
  TrendDataPoint,
} from '@/types/oracle/reliability';

export type { ReliabilityScore, ProtocolRanking, ReliabilityApiResponse, TrendDataPoint };

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useReliabilityScores(period: TimePeriod = '30d') {
  const { data, error, isLoading, mutate } = useSWR<ReliabilityApiResponse>(
    `/api/oracle/reliability?period=${period}`,
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
    },
  );

  return {
    rankings: data?.rankings ?? [],
    scores: data?.scores ?? [],
    lastUpdated: data?.lastUpdated,
    periodStart: data?.periodStart,
    periodEnd: data?.periodEnd,
    isLoading,
    isError: !!error,
    error: error?.message,
    refresh: mutate,
  };
}

export function useReliabilityTrend(protocol: string, days: number = 30) {
  const { data, error, isLoading } = useSWR<{ success: boolean; data: TrendDataPoint[] }>(
    protocol ? `/api/oracle/reliability?protocol=${protocol}&trend=true&trendDays=${days}` : null,
    fetcher,
    {
      refreshInterval: 300000,
      revalidateOnFocus: false,
    },
  );

  return {
    trendData: data?.data ?? [],
    isLoading,
    isError: !!error,
    error: error?.message,
  };
}
