import type { TableDefinition, IndexDefinition, QueryFn } from './types';

export const api3Tables: TableDefinition[] = [
  {
    name: 'airnodes',
    sql: `
      CREATE TABLE IF NOT EXISTS airnodes (
        id SERIAL PRIMARY KEY,
        airnode_address TEXT NOT NULL,
        endpoint_id TEXT NOT NULL,
        sponsor_address TEXT NOT NULL,
        chain TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        last_seen_at TIMESTAMP WITH TIME ZONE,
        response_time_ms INTEGER,
        uptime_percentage NUMERIC(5,2),
        config JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `,
  },
  {
    name: 'dapis',
    sql: `
      CREATE TABLE IF NOT EXISTS dapis (
        id SERIAL PRIMARY KEY,
        dapi_name TEXT NOT NULL,
        data_feed_id TEXT NOT NULL,
        airnode_address TEXT NOT NULL,
        chain TEXT NOT NULL,
        symbol TEXT NOT NULL,
        decimals INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        last_price NUMERIC(30,18),
        last_updated_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `,
  },
  {
    name: 'oev_events',
    sql: `
      CREATE TABLE IF NOT EXISTS oev_events (
        id SERIAL PRIMARY KEY,
        dapi_name TEXT NOT NULL,
        chain TEXT NOT NULL,
        block_number BIGINT NOT NULL,
        transaction_hash TEXT NOT NULL,
        oev_value NUMERIC(30,18) NOT NULL,
        price_before NUMERIC(30,18),
        price_after NUMERIC(30,18),
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `,
  },
  {
    name: 'api3_price_history',
    sql: `
      CREATE TABLE IF NOT EXISTS api3_price_history (
        id SERIAL PRIMARY KEY,
        dapi_name TEXT NOT NULL,
        chain TEXT NOT NULL,
        symbol TEXT NOT NULL,
        price NUMERIC(30,18) NOT NULL,
        ema_price NUMERIC(30,18),
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        data_feed_id TEXT,
        signature_valid BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `,
  },
];

export const api3Indexes: IndexDefinition[] = [
  {
    name: 'idx_airnodes_chain',
    table: 'airnodes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_airnodes_chain ON airnodes(chain)',
  },
  {
    name: 'idx_airnodes_status',
    table: 'airnodes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_airnodes_status ON airnodes(status)',
  },
  {
    name: 'idx_dapis_chain_symbol',
    table: 'dapis',
    sql: 'CREATE INDEX IF NOT EXISTS idx_dapis_chain_symbol ON dapis(chain, symbol)',
  },
  {
    name: 'idx_dapis_status',
    table: 'dapis',
    sql: 'CREATE INDEX IF NOT EXISTS idx_dapis_status ON dapis(status)',
  },
  {
    name: 'idx_oev_events_dapi_chain',
    table: 'oev_events',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oev_events_dapi_chain ON oev_events(dapi_name, chain)',
  },
  {
    name: 'idx_oev_events_timestamp',
    table: 'oev_events',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oev_events_timestamp ON oev_events(timestamp)',
  },
  {
    name: 'idx_api3_price_history_dapi_timestamp',
    table: 'api3_price_history',
    sql: 'CREATE INDEX IF NOT EXISTS idx_api3_price_history_dapi_timestamp ON api3_price_history(dapi_name, timestamp)',
  },
  {
    name: 'idx_api3_price_history_chain_symbol',
    table: 'api3_price_history',
    sql: 'CREATE INDEX IF NOT EXISTS idx_api3_price_history_chain_symbol ON api3_price_history(chain, symbol)',
  },
];

export async function createAPI3Tables(queryFn: QueryFn): Promise<void> {
  for (const table of api3Tables) {
    await queryFn(table.sql);
  }
}

export async function createAPI3Indexes(queryFn: QueryFn): Promise<void> {
  for (const index of api3Indexes) {
    await queryFn(index.sql);
  }
}

export async function insertAPI3InitialData(queryFn: QueryFn): Promise<void> {
  await queryFn(`
    INSERT INTO dapis (dapi_name, data_feed_id, airnode_address, chain, symbol, decimals, status)
    VALUES
      ('ETH/USD', '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', 'Ethereum', 'ETH', 18, 'active'),
      ('BTC/USD', '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890', '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', 'Ethereum', 'BTC', 8, 'active')
    ON CONFLICT DO NOTHING;
  `);
}
