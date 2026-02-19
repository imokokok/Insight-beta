import type { TableDefinition, IndexDefinition, QueryFn } from './types';

export const priceHistoryTables: TableDefinition[] = [
  {
    name: 'price_history',
    sql: `
      CREATE TABLE IF NOT EXISTS price_history (
        id BIGSERIAL PRIMARY KEY,
        protocol TEXT NOT NULL,
        symbol TEXT NOT NULL,
        chain TEXT,
        price NUMERIC NOT NULL,
        confidence NUMERIC,
        source_price NUMERIC,
        deviation NUMERIC,
        latency_ms INTEGER,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `,
  },
];

export const priceHistoryIndexes: IndexDefinition[] = [
  {
    name: 'idx_price_history_protocol_symbol',
    table: 'price_history',
    sql: 'CREATE INDEX IF NOT EXISTS idx_price_history_protocol_symbol ON price_history(protocol, symbol)',
  },
  {
    name: 'idx_price_history_timestamp',
    table: 'price_history',
    sql: 'CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp DESC)',
  },
  {
    name: 'idx_price_history_protocol_symbol_time',
    table: 'price_history',
    sql: 'CREATE INDEX IF NOT EXISTS idx_price_history_protocol_symbol_time ON price_history(protocol, symbol, timestamp DESC)',
  },
  {
    name: 'idx_price_history_chain',
    table: 'price_history',
    sql: 'CREATE INDEX IF NOT EXISTS idx_price_history_chain ON price_history(chain)',
  },
];

export async function createPriceHistoryTables(queryFn: QueryFn): Promise<void> {
  for (const table of priceHistoryTables) {
    await queryFn(table.sql);
  }
}

export async function createPriceHistoryIndexes(queryFn: QueryFn): Promise<void> {
  for (const index of priceHistoryIndexes) {
    await queryFn(index.sql);
  }
}

export interface PriceHistoryRecord {
  id: number;
  protocol: string;
  symbol: string;
  chain: string | null;
  price: number;
  confidence: number | null;
  source_price: number | null;
  deviation: number | null;
  latency_ms: number | null;
  timestamp: Date;
  created_at: Date;
}

export interface InsertPriceHistoryParams {
  protocol: string;
  symbol: string;
  chain?: string;
  price: number;
  confidence?: number;
  source_price?: number;
  deviation?: number;
  latency_ms?: number;
  timestamp: Date;
}
