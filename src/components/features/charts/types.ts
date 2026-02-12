import type { PricePoint } from '@/services/oracle/priceFetcher';

export type TabKey = 'activity' | 'tvs' | 'sync' | 'markets' | 'accuracy';

export type Translator = (key: string) => string;

export type ChartItem = {
  date: string;
  count: number;
  volume: number;
};

export type SyncMetricItem = {
  recordedAt: string;
  lagBlocks: string | null;
  durationMs: number | null;
  error: string | null;
};

export type MarketStat = {
  market: string;
  count: number;
  volume: number;
};

export type ChartDataItem = ChartItem & {
  cumulativeVolume: number;
};

export type SyncChartItem = Omit<SyncMetricItem, 'lagBlocks'> & {
  lagBlocks: number | null;
  label: string;
};

export type AccuracyChartItem = PricePoint & {
  label: string;
  deviationPct: string;
};

export type AccuracyStats = {
  avgDeviation: number;
  maxDeviation: number;
  lastDeviation: number | null;
  lastTimestamp: string | null;
  samples: number;
};

export type AccuracyAnomaly = PricePoint & {
  severity: 'critical' | 'warning';
};
