import type {
  ReliabilityScoreRecord,
  InsertReliabilityScoreParams,
  TimePeriod,
} from '@/types/oracle/reliability';

import type { TableDefinition, IndexDefinition, QueryFn } from './types';

export { type ReliabilityScoreRecord, type InsertReliabilityScoreParams, type TimePeriod };

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
