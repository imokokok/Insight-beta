import { query } from "./db";

export async function ensureSchema() {
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

    CREATE TABLE IF NOT EXISTS assertions (
      id TEXT PRIMARY KEY,
      chain TEXT NOT NULL,
      asserter TEXT NOT NULL,
      protocol TEXT,
      market TEXT,
      assertion_data TEXT,
      asserted_at TIMESTAMP WITH TIME ZONE NOT NULL,
      liveness_ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
      resolved_at TIMESTAMP WITH TIME ZONE,
      status TEXT NOT NULL,
      bond_usd NUMERIC,
      disputer TEXT,
      tx_hash TEXT
    );

    CREATE TABLE IF NOT EXISTS disputes (
      id TEXT PRIMARY KEY,
      chain TEXT NOT NULL,
      assertion_id TEXT NOT NULL REFERENCES assertions(id),
      market TEXT,
      reason TEXT,
      disputer TEXT NOT NULL,
      disputed_at TIMESTAMP WITH TIME ZONE NOT NULL,
      voting_ends_at TIMESTAMP WITH TIME ZONE,
      status TEXT NOT NULL,
      votes_for NUMERIC DEFAULT 0,
      votes_against NUMERIC DEFAULT 0,
      total_votes NUMERIC DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS votes (
      id BIGSERIAL PRIMARY KEY,
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

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_assertions_date ON assertions(asserted_at);
    CREATE INDEX IF NOT EXISTS idx_assertions_status ON assertions(status);
    CREATE INDEX IF NOT EXISTS idx_assertions_chain ON assertions(chain);
    CREATE INDEX IF NOT EXISTS idx_disputes_assertion ON disputes(assertion_id);
    CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
    CREATE INDEX IF NOT EXISTS idx_disputes_chain ON disputes(chain);
    CREATE INDEX IF NOT EXISTS idx_disputes_date ON disputes(disputed_at);
    CREATE INDEX IF NOT EXISTS idx_votes_assertion ON votes(assertion_id);
    CREATE INDEX IF NOT EXISTS idx_votes_voter ON votes(voter);
    CREATE INDEX IF NOT EXISTS idx_votes_block ON votes(block_number);

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
  `);

  await query(`
    ALTER TABLE assertions ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE assertions ADD COLUMN IF NOT EXISTS settlement_resolution BOOLEAN;
  `);

  await query(`
    ALTER TABLE oracle_config ADD COLUMN IF NOT EXISTS start_block BIGINT;
    ALTER TABLE oracle_config ADD COLUMN IF NOT EXISTS max_block_range INTEGER;
    ALTER TABLE oracle_config ADD COLUMN IF NOT EXISTS voting_period_hours INTEGER;
    ALTER TABLE oracle_config ADD COLUMN IF NOT EXISTS confirmation_blocks INTEGER;
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
}
