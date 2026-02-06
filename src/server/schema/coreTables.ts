import type { TableDefinition, IndexDefinition, QueryFn } from './types';

export const coreTables: TableDefinition[] = [
  {
    name: 'oracle_config',
    sql: `
      CREATE TABLE IF NOT EXISTS oracle_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        rpc_url TEXT,
        contract_address TEXT,
        chain TEXT,
        start_block BIGINT,
        max_block_range INTEGER,
        voting_period_hours INTEGER,
        confirmation_blocks INTEGER,
        CONSTRAINT single_row CHECK (id = 1)
      )
    `,
  },
  {
    name: 'oracle_instances',
    sql: `
      CREATE TABLE IF NOT EXISTS oracle_instances (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT true,
        rpc_url TEXT,
        contract_address TEXT,
        chain TEXT,
        start_block BIGINT,
        max_block_range INTEGER,
        voting_period_hours INTEGER,
        confirmation_blocks INTEGER,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `,
  },
  {
    name: 'sync_state',
    sql: `
      CREATE TABLE IF NOT EXISTS sync_state (
        id INTEGER PRIMARY KEY DEFAULT 1,
        last_processed_block BIGINT DEFAULT 0,
        latest_block BIGINT,
        safe_block BIGINT,
        last_success_processed_block BIGINT,
        consecutive_failures INTEGER DEFAULT 0,
        rpc_active_url TEXT,
        rpc_stats JSONB,
        last_attempt_at TIMESTAMP WITH TIME ZONE,
        last_success_at TIMESTAMP WITH TIME ZONE,
        last_duration_ms INTEGER,
        last_error TEXT,
        CONSTRAINT single_row CHECK (id = 1)
      )
    `,
  },
  {
    name: 'oracle_sync_state',
    sql: `
      CREATE TABLE IF NOT EXISTS oracle_sync_state (
        instance_id TEXT PRIMARY KEY REFERENCES oracle_instances(id) ON DELETE CASCADE,
        last_processed_block BIGINT DEFAULT 0,
        latest_block BIGINT,
        safe_block BIGINT,
        last_success_processed_block BIGINT,
        consecutive_failures INTEGER DEFAULT 0,
        rpc_active_url TEXT,
        rpc_stats JSONB,
        last_attempt_at TIMESTAMP WITH TIME ZONE,
        last_success_at TIMESTAMP WITH TIME ZONE,
        last_duration_ms INTEGER,
        last_error TEXT
      )
    `,
  },
  {
    name: 'sync_metrics',
    sql: `
      CREATE TABLE IF NOT EXISTS sync_metrics (
        id BIGSERIAL PRIMARY KEY,
        recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        last_processed_block BIGINT NOT NULL,
        latest_block BIGINT,
        safe_block BIGINT,
        lag_blocks BIGINT,
        duration_ms INTEGER,
        error TEXT
      )
    `,
  },
  {
    name: 'oracle_sync_metrics',
    sql: `
      CREATE TABLE IF NOT EXISTS oracle_sync_metrics (
        id BIGSERIAL PRIMARY KEY,
        instance_id TEXT NOT NULL REFERENCES oracle_instances(id) ON DELETE CASCADE,
        recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        last_processed_block BIGINT NOT NULL,
        latest_block BIGINT,
        safe_block BIGINT,
        lag_blocks BIGINT,
        duration_ms INTEGER,
        error TEXT
      )
    `,
  },
  {
    name: 'assertions',
    sql: `
      CREATE TABLE IF NOT EXISTS assertions (
        id TEXT PRIMARY KEY,
        instance_id TEXT NOT NULL DEFAULT 'default',
        chain TEXT NOT NULL,
        asserter TEXT NOT NULL,
        protocol TEXT,
        market TEXT,
        assertion_data TEXT,
        asserted_at TIMESTAMP WITH TIME ZONE NOT NULL,
        liveness_ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
        block_number BIGINT,
        log_index INTEGER,
        resolved_at TIMESTAMP WITH TIME ZONE,
        settlement_resolution BOOLEAN,
        status TEXT NOT NULL,
        bond_usd NUMERIC,
        disputer TEXT,
        tx_hash TEXT
      )
    `,
  },
  {
    name: 'disputes',
    sql: `
      CREATE TABLE IF NOT EXISTS disputes (
        id TEXT PRIMARY KEY,
        instance_id TEXT NOT NULL DEFAULT 'default',
        chain TEXT NOT NULL,
        assertion_id TEXT NOT NULL REFERENCES assertions(id),
        market TEXT,
        reason TEXT,
        disputer TEXT NOT NULL,
        disputed_at TIMESTAMP WITH TIME ZONE NOT NULL,
        voting_ends_at TIMESTAMP WITH TIME ZONE,
        tx_hash TEXT,
        block_number BIGINT,
        log_index INTEGER,
        status TEXT NOT NULL,
        votes_for NUMERIC DEFAULT 0,
        votes_against NUMERIC DEFAULT 0,
        total_votes NUMERIC DEFAULT 0
      )
    `,
  },
  {
    name: 'votes',
    sql: `
      CREATE TABLE IF NOT EXISTS votes (
        id BIGSERIAL PRIMARY KEY,
        instance_id TEXT NOT NULL DEFAULT 'default',
        chain TEXT NOT NULL,
        assertion_id TEXT NOT NULL REFERENCES assertions(id),
        voter TEXT NOT NULL,
        support BOOLEAN NOT NULL,
        weight NUMERIC NOT NULL,
        tx_hash TEXT NOT NULL,
        block_number BIGINT NOT NULL,
        log_index INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE (tx_hash, log_index)
      )
    `,
  },
  {
    name: 'oracle_events',
    sql: `
      CREATE TABLE IF NOT EXISTS oracle_events (
        id BIGSERIAL PRIMARY KEY,
        instance_id TEXT NOT NULL DEFAULT 'default',
        chain TEXT NOT NULL,
        event_type TEXT NOT NULL,
        assertion_id TEXT,
        tx_hash TEXT NOT NULL,
        block_number BIGINT NOT NULL,
        log_index INTEGER NOT NULL,
        payload JSONB NOT NULL,
        payload_checksum TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE (instance_id, tx_hash, log_index)
      )
    `,
  },
];

export const coreIndexes: IndexDefinition[] = [
  {
    name: 'idx_oracle_instances_enabled',
    table: 'oracle_instances',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_instances_enabled ON oracle_instances(enabled)',
  },
  {
    name: 'idx_oracle_sync_metrics_instance_date',
    table: 'oracle_sync_metrics',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_sync_metrics_instance_date ON oracle_sync_metrics(instance_id, recorded_at DESC)',
  },
  {
    name: 'idx_assertions_date',
    table: 'assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_assertions_date ON assertions(asserted_at)',
  },
  {
    name: 'idx_assertions_status',
    table: 'assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_assertions_status ON assertions(status)',
  },
  {
    name: 'idx_assertions_chain',
    table: 'assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_assertions_chain ON assertions(chain)',
  },
  {
    name: 'idx_assertions_instance',
    table: 'assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_assertions_instance ON assertions(instance_id)',
  },
  {
    name: 'idx_assertions_market',
    table: 'assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_assertions_market ON assertions(market)',
  },
  {
    name: 'idx_assertions_tx_hash',
    table: 'assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_assertions_tx_hash ON assertions(tx_hash)',
  },
  {
    name: 'idx_assertions_block_number',
    table: 'assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_assertions_block_number ON assertions(block_number)',
  },
  {
    name: 'idx_assertions_asserter_lower',
    table: 'assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_assertions_asserter_lower ON assertions(LOWER(asserter))',
  },
  {
    name: 'idx_assertions_status_date',
    table: 'assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_assertions_status_date ON assertions(status, asserted_at DESC)',
  },
  {
    name: 'idx_assertions_chain_date',
    table: 'assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_assertions_chain_date ON assertions(chain, asserted_at DESC)',
  },
  {
    name: 'idx_assertions_instance_date',
    table: 'assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_assertions_instance_date ON assertions(instance_id, asserted_at DESC)',
  },
  {
    name: 'idx_assertions_asserter_date',
    table: 'assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_assertions_asserter_date ON assertions(LOWER(asserter), asserted_at DESC)',
  },
  {
    name: 'idx_disputes_assertion',
    table: 'disputes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_disputes_assertion ON disputes(assertion_id)',
  },
  {
    name: 'idx_disputes_status',
    table: 'disputes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status)',
  },
  {
    name: 'idx_disputes_chain',
    table: 'disputes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_disputes_chain ON disputes(chain)',
  },
  {
    name: 'idx_disputes_instance',
    table: 'disputes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_disputes_instance ON disputes(instance_id)',
  },
  {
    name: 'idx_disputes_date',
    table: 'disputes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_disputes_date ON disputes(disputed_at)',
  },
  {
    name: 'idx_disputes_tx_hash',
    table: 'disputes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_disputes_tx_hash ON disputes(tx_hash)',
  },
  {
    name: 'idx_disputes_block_number',
    table: 'disputes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_disputes_block_number ON disputes(block_number)',
  },
  {
    name: 'idx_disputes_disputer_lower',
    table: 'disputes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_disputes_disputer_lower ON disputes(LOWER(disputer))',
  },
  {
    name: 'idx_disputes_status_date',
    table: 'disputes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_disputes_status_date ON disputes(status, disputed_at DESC)',
  },
  {
    name: 'idx_disputes_chain_date',
    table: 'disputes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_disputes_chain_date ON disputes(chain, disputed_at DESC)',
  },
  {
    name: 'idx_disputes_instance_date',
    table: 'disputes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_disputes_instance_date ON disputes(instance_id, disputed_at DESC)',
  },
  {
    name: 'idx_disputes_disputer_date',
    table: 'disputes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_disputes_disputer_date ON disputes(LOWER(disputer), disputed_at DESC)',
  },
  {
    name: 'idx_votes_assertion',
    table: 'votes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_votes_assertion ON votes(assertion_id)',
  },
  {
    name: 'idx_votes_voter',
    table: 'votes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_votes_voter ON votes(voter)',
  },
  {
    name: 'idx_votes_block',
    table: 'votes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_votes_block ON votes(block_number)',
  },
  {
    name: 'idx_votes_instance',
    table: 'votes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_votes_instance ON votes(instance_id)',
  },
  {
    name: 'idx_oracle_events_instance_block',
    table: 'oracle_events',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_events_instance_block ON oracle_events(instance_id, block_number DESC)',
  },
  {
    name: 'idx_oracle_events_assertion',
    table: 'oracle_events',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_events_assertion ON oracle_events(assertion_id)',
  },
  {
    name: 'idx_oracle_events_type',
    table: 'oracle_events',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_events_type ON oracle_events(event_type)',
  },
  {
    name: 'idx_oracle_events_tx_hash',
    table: 'oracle_events',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_events_tx_hash ON oracle_events(tx_hash)',
  },
];

export async function createCoreTables(queryFn: QueryFn): Promise<void> {
  for (const table of coreTables) {
    await queryFn(table.sql);
  }
}

export async function createCoreIndexes(queryFn: QueryFn): Promise<void> {
  for (const index of coreIndexes) {
    await queryFn(index.sql);
  }
}

export async function runCoreMigrations(
  queryFn: QueryFn,
  safeRollback: () => Promise<void>,
): Promise<void> {
  const { logger } = await import('@/lib/logger');

  await queryFn(`
    ALTER TABLE assertions ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE assertions ADD COLUMN IF NOT EXISTS settlement_resolution BOOLEAN;
    ALTER TABLE assertions ADD COLUMN IF NOT EXISTS block_number BIGINT;
    ALTER TABLE assertions ADD COLUMN IF NOT EXISTS log_index INTEGER;
    ALTER TABLE assertions ADD COLUMN IF NOT EXISTS instance_id TEXT;
  `);

  try {
    await queryFn('BEGIN');
    await queryFn(`UPDATE assertions SET instance_id = 'default' WHERE instance_id IS NULL`);
    await queryFn(`
      ALTER TABLE assertions ALTER COLUMN instance_id SET DEFAULT 'default';
      ALTER TABLE assertions ALTER COLUMN instance_id SET NOT NULL;
    `);
    await queryFn('COMMIT');
  } catch (error: unknown) {
    await safeRollback();
    logger.error('Migration failed for assertions instance_id', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Failed to migrate assertions instance_id');
  }

  await queryFn(`
    ALTER TABLE disputes ADD COLUMN IF NOT EXISTS instance_id TEXT;
    ALTER TABLE disputes ADD COLUMN IF NOT EXISTS tx_hash TEXT;
    ALTER TABLE disputes ADD COLUMN IF NOT EXISTS block_number BIGINT;
    ALTER TABLE disputes ADD COLUMN IF NOT EXISTS log_index INTEGER;
  `);

  try {
    await queryFn('BEGIN');
    await queryFn(`UPDATE disputes SET instance_id = 'default' WHERE instance_id IS NULL`);
    await queryFn(`
      ALTER TABLE disputes ALTER COLUMN instance_id SET DEFAULT 'default';
      ALTER TABLE disputes ALTER COLUMN instance_id SET NOT NULL;
    `);
    await queryFn('COMMIT');
  } catch (error: unknown) {
    await safeRollback();
    logger.error('Migration failed for disputes instance_id', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Failed to migrate disputes instance_id');
  }

  await queryFn(`
    ALTER TABLE votes ADD COLUMN IF NOT EXISTS instance_id TEXT;
  `);

  try {
    await queryFn('BEGIN');
    await queryFn(`UPDATE votes SET instance_id = 'default' WHERE instance_id IS NULL`);
    await queryFn(`
      ALTER TABLE votes ALTER COLUMN instance_id SET DEFAULT 'default';
      ALTER TABLE votes ALTER COLUMN instance_id SET NOT NULL;
    `);
    await queryFn('COMMIT');
  } catch (error: unknown) {
    await safeRollback();
    logger.error('Migration failed for votes instance_id', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Failed to migrate votes instance_id');
  }

  await queryFn(`
    ALTER TABLE oracle_config ADD COLUMN IF NOT EXISTS start_block BIGINT;
    ALTER TABLE oracle_config ADD COLUMN IF NOT EXISTS max_block_range INTEGER;
    ALTER TABLE oracle_config ADD COLUMN IF NOT EXISTS voting_period_hours INTEGER;
    ALTER TABLE oracle_config ADD COLUMN IF NOT EXISTS confirmation_blocks INTEGER;
  `);

  await queryFn(`
    ALTER TABLE oracle_events ADD COLUMN IF NOT EXISTS payload_checksum TEXT;
  `);

  await queryFn(`
    ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS latest_block BIGINT;
    ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS safe_block BIGINT;
    ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS last_success_processed_block BIGINT;
    ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER DEFAULT 0;
    ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS rpc_active_url TEXT;
    ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS rpc_stats JSONB;
  `);
}

export async function insertCoreInitialData(queryFn: QueryFn): Promise<void> {
  await queryFn(`
    INSERT INTO oracle_config (id, chain) VALUES (1, 'Local') ON CONFLICT (id) DO NOTHING;
    INSERT INTO sync_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
  `);

  await queryFn(`
    INSERT INTO oracle_instances (
      id, name, enabled, rpc_url, contract_address, chain, start_block, max_block_range, voting_period_hours, confirmation_blocks
    )
    SELECT
      'default', 'Default', true, rpc_url, contract_address, chain, start_block, max_block_range, voting_period_hours, confirmation_blocks
    FROM oracle_config
    WHERE id = 1
    ON CONFLICT (id) DO NOTHING;
  `);

  await queryFn(`
    INSERT INTO oracle_sync_state (
      instance_id, last_processed_block, latest_block, safe_block, last_success_processed_block, consecutive_failures, rpc_active_url, rpc_stats, last_attempt_at, last_success_at, last_duration_ms, last_error
    )
    SELECT
      'default', last_processed_block, latest_block, safe_block, last_success_processed_block, consecutive_failures, rpc_active_url, rpc_stats, last_attempt_at, last_success_at, last_duration_ms, last_error
    FROM sync_state
    WHERE id = 1
    ON CONFLICT (instance_id) DO NOTHING;
  `);
}
