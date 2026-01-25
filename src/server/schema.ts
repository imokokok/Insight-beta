import { hasDatabase, query } from "./db";

export async function ensureSchema() {
  if (!hasDatabase()) return;
  await query(`
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
    );

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
    );

    CREATE INDEX IF NOT EXISTS idx_oracle_instances_enabled ON oracle_instances(enabled);

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
    );

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
    );

    CREATE TABLE IF NOT EXISTS sync_metrics (
      id BIGSERIAL PRIMARY KEY,
      recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      last_processed_block BIGINT NOT NULL,
      latest_block BIGINT,
      safe_block BIGINT,
      lag_blocks BIGINT,
      duration_ms INTEGER,
      error TEXT
    );

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
    );

    CREATE INDEX IF NOT EXISTS idx_oracle_sync_metrics_instance_date ON oracle_sync_metrics(instance_id, recorded_at DESC);

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
    );

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
    );

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
    );

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
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_assertions_date ON assertions(asserted_at);
    CREATE INDEX IF NOT EXISTS idx_assertions_status ON assertions(status);
    CREATE INDEX IF NOT EXISTS idx_assertions_chain ON assertions(chain);
    CREATE INDEX IF NOT EXISTS idx_assertions_instance ON assertions(instance_id);
    CREATE INDEX IF NOT EXISTS idx_assertions_market ON assertions(market);
    CREATE INDEX IF NOT EXISTS idx_assertions_tx_hash ON assertions(tx_hash);
    CREATE INDEX IF NOT EXISTS idx_assertions_block_number ON assertions(block_number);
    CREATE INDEX IF NOT EXISTS idx_assertions_asserter_lower ON assertions(LOWER(asserter));
    CREATE INDEX IF NOT EXISTS idx_assertions_status_date ON assertions(status, asserted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_assertions_chain_date ON assertions(chain, asserted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_assertions_instance_date ON assertions(instance_id, asserted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_assertions_asserter_date ON assertions(LOWER(asserter), asserted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_disputes_assertion ON disputes(assertion_id);
    CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
    CREATE INDEX IF NOT EXISTS idx_disputes_chain ON disputes(chain);
    CREATE INDEX IF NOT EXISTS idx_disputes_instance ON disputes(instance_id);
    CREATE INDEX IF NOT EXISTS idx_disputes_date ON disputes(disputed_at);
    CREATE INDEX IF NOT EXISTS idx_disputes_tx_hash ON disputes(tx_hash);
    CREATE INDEX IF NOT EXISTS idx_disputes_block_number ON disputes(block_number);
    CREATE INDEX IF NOT EXISTS idx_disputes_disputer_lower ON disputes(LOWER(disputer));
    CREATE INDEX IF NOT EXISTS idx_disputes_status_date ON disputes(status, disputed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_disputes_chain_date ON disputes(chain, disputed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_disputes_instance_date ON disputes(instance_id, disputed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_disputes_disputer_date ON disputes(LOWER(disputer), disputed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_votes_assertion ON votes(assertion_id);
    CREATE INDEX IF NOT EXISTS idx_votes_voter ON votes(voter);
    CREATE INDEX IF NOT EXISTS idx_votes_block ON votes(block_number);
    CREATE INDEX IF NOT EXISTS idx_votes_instance ON votes(instance_id);
    CREATE INDEX IF NOT EXISTS idx_oracle_events_instance_block ON oracle_events(instance_id, block_number DESC);
    CREATE INDEX IF NOT EXISTS idx_oracle_events_assertion ON oracle_events(assertion_id);
    CREATE INDEX IF NOT EXISTS idx_oracle_events_type ON oracle_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_oracle_events_tx_hash ON oracle_events(tx_hash);

    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value JSONB,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id BIGSERIAL PRIMARY KEY,
      fingerprint TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      status TEXT NOT NULL DEFAULT 'Open',
      occurrences INTEGER NOT NULL DEFAULT 1,
      first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      acknowledged_at TIMESTAMP WITH TIME ZONE,
      resolved_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
    CREATE INDEX IF NOT EXISTS idx_alerts_last_seen ON alerts(last_seen_at);
    CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
    CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
    CREATE INDEX IF NOT EXISTS idx_alerts_status_last_seen ON alerts(status, last_seen_at DESC);

    CREATE TABLE IF NOT EXISTS audit_log (
      id BIGSERIAL PRIMARY KEY,
      actor TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details JSONB,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      reset_at TIMESTAMP WITH TIME ZONE NOT NULL,
      count INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at);
  `);

  await query(`
    ALTER TABLE assertions ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE assertions ADD COLUMN IF NOT EXISTS settlement_resolution BOOLEAN;
    ALTER TABLE assertions ADD COLUMN IF NOT EXISTS block_number BIGINT;
    ALTER TABLE assertions ADD COLUMN IF NOT EXISTS log_index INTEGER;
    ALTER TABLE assertions ADD COLUMN IF NOT EXISTS instance_id TEXT;
  `);

  try {
    await query("BEGIN");
    await query(`
      UPDATE assertions SET instance_id = 'default' WHERE instance_id IS NULL;
    `);
    await query(`
      ALTER TABLE assertions ALTER COLUMN instance_id SET DEFAULT 'default';
      ALTER TABLE assertions ALTER COLUMN instance_id SET NOT NULL;
    `);
    await query("COMMIT");
  } catch {
    await query("ROLLBACK").catch(() => null);
    throw new Error("Failed to migrate assertions instance_id");
  }

  await query(`
    ALTER TABLE disputes ADD COLUMN IF NOT EXISTS instance_id TEXT;
    ALTER TABLE disputes ADD COLUMN IF NOT EXISTS tx_hash TEXT;
    ALTER TABLE disputes ADD COLUMN IF NOT EXISTS block_number BIGINT;
    ALTER TABLE disputes ADD COLUMN IF NOT EXISTS log_index INTEGER;
  `);

  try {
    await query("BEGIN");
    await query(`
      UPDATE disputes SET instance_id = 'default' WHERE instance_id IS NULL;
    `);
    await query(`
      ALTER TABLE disputes ALTER COLUMN instance_id SET DEFAULT 'default';
      ALTER TABLE disputes ALTER COLUMN instance_id SET NOT NULL;
    `);
    await query("COMMIT");
  } catch {
    await query("ROLLBACK").catch(() => null);
    throw new Error("Failed to migrate disputes instance_id");
  }

  await query(`
    ALTER TABLE votes ADD COLUMN IF NOT EXISTS instance_id TEXT;
  `);

  try {
    await query("BEGIN");
    await query(`
      UPDATE votes SET instance_id = 'default' WHERE instance_id IS NULL;
    `);
    await query(`
      ALTER TABLE votes ALTER COLUMN instance_id SET DEFAULT 'default';
      ALTER TABLE votes ALTER COLUMN instance_id SET NOT NULL;
    `);
    await query("COMMIT");
  } catch {
    await query("ROLLBACK").catch(() => null);
    throw new Error("Failed to migrate votes instance_id");
  }

  await query(`
    ALTER TABLE oracle_config ADD COLUMN IF NOT EXISTS start_block BIGINT;
    ALTER TABLE oracle_config ADD COLUMN IF NOT EXISTS max_block_range INTEGER;
    ALTER TABLE oracle_config ADD COLUMN IF NOT EXISTS voting_period_hours INTEGER;
    ALTER TABLE oracle_config ADD COLUMN IF NOT EXISTS confirmation_blocks INTEGER;
  `);

  await query(`
    ALTER TABLE oracle_events ADD COLUMN IF NOT EXISTS payload_checksum TEXT;
  `);

  await query(`
    ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS latest_block BIGINT;
    ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS safe_block BIGINT;
    ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS last_success_processed_block BIGINT;
    ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER DEFAULT 0;
    ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS rpc_active_url TEXT;
    ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS rpc_stats JSONB;
  `);

  // Initialize singleton rows if not exist
  await query(`
    INSERT INTO oracle_config (id, chain) VALUES (1, 'Local') ON CONFLICT (id) DO NOTHING;
    INSERT INTO sync_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
  `);

  await query(`
    INSERT INTO oracle_instances (
      id, name, enabled, rpc_url, contract_address, chain, start_block, max_block_range, voting_period_hours, confirmation_blocks
    )
    SELECT
      'default', 'Default', true, rpc_url, contract_address, chain, start_block, max_block_range, voting_period_hours, confirmation_blocks
    FROM oracle_config
    WHERE id = 1
    ON CONFLICT (id) DO NOTHING;
  `);

  await query(`
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
