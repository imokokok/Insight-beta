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

export type ReliabilityScoreRecord = ReliabilityScore;

export interface InsertReliabilityScoreParams {
  protocol: string;
  symbol?: string;
  chain?: string;
  score: number;
  accuracy_score?: number;
  latency_score?: number;
  availability_score?: number;
  deviation_avg?: number;
  deviation_max?: number;
  deviation_min?: number;
  latency_avg_ms?: number;
  success_count?: number;
  total_count?: number;
  sample_count?: number;
  period_start: Date;
  period_end: Date;
}

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

export interface ReliabilityApiResponse {
  success: boolean;
  period: string;
  rankings: ProtocolRanking[];
  scores: ReliabilityScore[];
  lastUpdated: string;
}

export interface TrendDataPoint {
  date: Date;
  score: number;
}

export type TimePeriod = '7d' | '30d' | '90d';
