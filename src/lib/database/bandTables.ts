import type { TableDefinition, IndexDefinition, QueryFn } from './types';

export const bandTables: TableDefinition[] = [
  {
    name: 'band_bridges',
    sql: `
      CREATE TABLE IF NOT EXISTS band_bridges (
        id SERIAL PRIMARY KEY,
        bridge_id VARCHAR(100) NOT NULL UNIQUE,
        source_chain VARCHAR(50) NOT NULL,
        destination_chain VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        last_transfer_at TIMESTAMP WITH TIME ZONE,
        total_transfers BIGINT DEFAULT 0,
        total_volume NUMERIC(30,18) DEFAULT 0,
        avg_latency_ms INTEGER,
        success_rate NUMERIC(5,2),
        config JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `,
  },
  {
    name: 'band_data_sources',
    sql: `
      CREATE TABLE IF NOT EXISTS band_data_sources (
        id SERIAL PRIMARY KEY,
        source_id VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        chain VARCHAR(50) NOT NULL,
        source_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        update_interval_seconds INTEGER,
        last_update_at TIMESTAMP WITH TIME ZONE,
        reliability_score NUMERIC(5,2),
        config JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `,
  },
  {
    name: 'band_transfers',
    sql: `
      CREATE TABLE IF NOT EXISTS band_transfers (
        id SERIAL PRIMARY KEY,
        transfer_id VARCHAR(100) NOT NULL UNIQUE,
        bridge_id VARCHAR(100) NOT NULL,
        source_chain VARCHAR(50) NOT NULL,
        destination_chain VARCHAR(50) NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        amount NUMERIC(30,18),
        status VARCHAR(20) NOT NULL,
        source_tx_hash VARCHAR(66),
        destination_tx_hash VARCHAR(66),
        latency_ms INTEGER,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `,
  },
  {
    name: 'band_price_history',
    sql: `
      CREATE TABLE IF NOT EXISTS band_price_history (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        chain VARCHAR(50) NOT NULL,
        price NUMERIC(30,18) NOT NULL,
        request_id BIGINT,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        sources_count INTEGER,
        aggregation_valid BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `,
  },
];

export const bandIndexes: IndexDefinition[] = [
  {
    name: 'idx_band_bridges_source_dest',
    table: 'band_bridges',
    sql: 'CREATE INDEX IF NOT EXISTS idx_band_bridges_source_dest ON band_bridges(source_chain, destination_chain)',
  },
  {
    name: 'idx_band_bridges_status',
    table: 'band_bridges',
    sql: 'CREATE INDEX IF NOT EXISTS idx_band_bridges_status ON band_bridges(status)',
  },
  {
    name: 'idx_band_data_sources_chain_symbol',
    table: 'band_data_sources',
    sql: 'CREATE INDEX IF NOT EXISTS idx_band_data_sources_chain_symbol ON band_data_sources(chain, symbol)',
  },
  {
    name: 'idx_band_data_sources_status',
    table: 'band_data_sources',
    sql: 'CREATE INDEX IF NOT EXISTS idx_band_data_sources_status ON band_data_sources(status)',
  },
  {
    name: 'idx_band_transfers_bridge_id',
    table: 'band_transfers',
    sql: 'CREATE INDEX IF NOT EXISTS idx_band_transfers_bridge_id ON band_transfers(bridge_id)',
  },
  {
    name: 'idx_band_transfers_timestamp',
    table: 'band_transfers',
    sql: 'CREATE INDEX IF NOT EXISTS idx_band_transfers_timestamp ON band_transfers(timestamp)',
  },
  {
    name: 'idx_band_price_history_symbol_timestamp',
    table: 'band_price_history',
    sql: 'CREATE INDEX IF NOT EXISTS idx_band_price_history_symbol_timestamp ON band_price_history(symbol, timestamp)',
  },
  {
    name: 'idx_band_price_history_chain_symbol',
    table: 'band_price_history',
    sql: 'CREATE INDEX IF NOT EXISTS idx_band_price_history_chain_symbol ON band_price_history(chain, symbol)',
  },
];

export async function createBandTables(queryFn: QueryFn): Promise<void> {
  for (const table of bandTables) {
    await queryFn(table.sql);
  }
}

export async function createBandIndexes(queryFn: QueryFn): Promise<void> {
  for (const index of bandIndexes) {
    await queryFn(index.sql);
  }
}

export async function insertBandInitialData(queryFn: QueryFn): Promise<void> {
  await queryFn(`
    INSERT INTO band_bridges (bridge_id, source_chain, destination_chain, status, config)
    VALUES
      ('band-eth-polygon', 'Ethereum', 'Polygon', 'active', '{"min_amount": "10000000000000000", "max_amount": "1000000000000000000000"}'),
      ('band-eth-bsc', 'Ethereum', 'BSC', 'active', '{"min_amount": "10000000000000000", "max_amount": "1000000000000000000000"}'),
      ('band-polygon-eth', 'Polygon', 'Ethereum', 'active', '{"min_amount": "10000000000000000", "max_amount": "1000000000000000000000"}')
    ON CONFLICT (bridge_id) DO NOTHING;
  `);

  await queryFn(`
    INSERT INTO band_data_sources (source_id, name, symbol, chain, source_type, status, update_interval_seconds, reliability_score, config)
    VALUES
      ('band-btc-mainnet', 'Bitcoin Price Feed', 'BTC', 'Ethereum', 'oracle', 'active', 60, 99.5, '{"decimals": 8, "pair": "BTC/USD"}'),
      ('band-eth-mainnet', 'Ethereum Price Feed', 'ETH', 'Ethereum', 'oracle', 'active', 60, 99.8, '{"decimals": 8, "pair": "ETH/USD"}'),
      ('band-usdc-mainnet', 'USDC Price Feed', 'USDC', 'Ethereum', 'oracle', 'active', 60, 99.9, '{"decimals": 8, "pair": "USDC/USD"}'),
      ('band-btc-polygon', 'Bitcoin Price Feed', 'BTC', 'Polygon', 'oracle', 'active', 60, 99.5, '{"decimals": 8, "pair": "BTC/USD"}'),
      ('band-eth-polygon', 'Ethereum Price Feed', 'ETH', 'Polygon', 'oracle', 'active', 60, 99.8, '{"decimals": 8, "pair": "ETH/USD"}')
    ON CONFLICT (source_id) DO NOTHING;
  `);
}
