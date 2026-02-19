import type { TableDefinition, IndexDefinition, QueryFn } from './types';

export const reliabilityTables: TableDefinition[] = [
  {
    name: 'oracle_reliability_scores',
    sql: `
      CREATE TABLE IF NOT EXISTS oracle_reliability_scores (
        id BIGSERIAL PRIMARY KEY,
        protocol TEXT NOT NULL,
        symbol TEXT,
        chain TEXT,
        score NUMERIC NOT NULL,
        accuracy_score NUMERIC,
        latency_score NUMERIC,
        availability_score NUMERIC,
        deviation_avg NUMERIC,
        deviation_max NUMERIC,
        deviation_min NUMERIC,
        latency_avg_ms NUMERIC,
        success_count INTEGER,
        total_count INTEGER,
        sample_count INTEGER,
        period_start TIMESTAMP WITH TIME ZONE NOT NULL,
        period_end TIMESTAMP WITH TIME ZONE NOT NULL,
        calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT unique_reliability_score UNIQUE(protocol, symbol, chain, period_start, period_end)
      )
    `,
  },
];

export const reliabilityIndexes: IndexDefinition[] = [
  {
    name: 'idx_reliability_protocol',
    table: 'oracle_reliability_scores',
    sql: 'CREATE INDEX IF NOT EXISTS idx_reliability_protocol ON oracle_reliability_scores(protocol)',
  },
  {
    name: 'idx_reliability_protocol_symbol',
    table: 'oracle_reliability_scores',
    sql: 'CREATE INDEX IF NOT EXISTS idx_reliability_protocol_symbol ON oracle_reliability_scores(protocol, symbol)',
  },
  {
    name: 'idx_reliability_period',
    table: 'oracle_reliability_scores',
    sql: 'CREATE INDEX IF NOT EXISTS idx_reliability_period ON oracle_reliability_scores(period_start, period_end)',
  },
  {
    name: 'idx_reliability_chain',
    table: 'oracle_reliability_scores',
    sql: 'CREATE INDEX IF NOT EXISTS idx_reliability_chain ON oracle_reliability_scores(chain)',
  },
];

export async function createReliabilityTables(queryFn: QueryFn): Promise<void> {
  for (const table of reliabilityTables) {
    await queryFn(table.sql);
  }
}

export async function createReliabilityIndexes(queryFn: QueryFn): Promise<void> {
  for (const index of reliabilityIndexes) {
    await queryFn(index.sql);
  }
}

export interface ReliabilityScoreRecord {
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

export type TimePeriod = '7d' | '30d' | '90d';

export function getTimePeriodDates(period: TimePeriod): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
  }

  return { start, end };
}
