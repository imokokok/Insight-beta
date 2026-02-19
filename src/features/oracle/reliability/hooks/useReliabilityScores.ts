import useSWR from 'swr';

import type { TimePeriod } from '@/lib/database/reliabilityTables';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface ProtocolRanking {
  protocol: string;
  score: number;
  rank: number;
  metrics: {
    protocol: string;
    symbol: string | null;
    chain: string | null;
    periodStart: Date;
    periodEnd: Date;
    score: number;
    accuracyScore: number;
    latencyScore: number;
    availabilityScore: number;
    deviationAvg: number;
    deviationMax: number;
    deviationMin: number;
    latencyAvgMs: number;
    successCount: number;
    totalCount: number;
    sampleCount: number;
  };
}

export interface ReliabilityScore {
  id: number;
  protocol: string;
  symbol: string | null;
  chain: string | null;
  score: number;
  accuracy_score: number | null;
  latency_score: number | null;
  availability_score: number | null;
  deviation_avg: number | null;
  deviation_max: number | null;
  deviation_min: number | null;
  latency_avg_ms: number | null;
  success_count: number | null;
  total_count: number | null;
  sample_count: number | null;
  period_start: Date;
  period_end: Date;
  calculated_at: Date;
}

export interface ReliabilityApiResponse {
  success: boolean;
  period: TimePeriod;
  rankings: ProtocolRanking[];
  scores: ReliabilityScore[];
  lastUpdated: string;
}

export interface TrendDataPoint {
  date: Date;
  score: number;
}

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
