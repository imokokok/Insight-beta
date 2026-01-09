import { query } from "./db";

export async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS oracle_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      rpc_url TEXT,
      contract_address TEXT,
      chain TEXT,
      CONSTRAINT single_row CHECK (id = 1)
    );

    CREATE TABLE IF NOT EXISTS sync_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      last_processed_block BIGINT DEFAULT 0,
      last_attempt_at TIMESTAMP WITH TIME ZONE,
      last_success_at TIMESTAMP WITH TIME ZONE,
      last_duration_ms INTEGER,
      last_error TEXT,
      CONSTRAINT single_row CHECK (id = 1)
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

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_assertions_date ON assertions(asserted_at);
    CREATE INDEX IF NOT EXISTS idx_assertions_status ON assertions(status);
    CREATE INDEX IF NOT EXISTS idx_disputes_assertion ON disputes(assertion_id);

    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value JSONB,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query(`
    ALTER TABLE assertions ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
  `);

  // Initialize singleton rows if not exist
  await query(`
    INSERT INTO oracle_config (id, chain) VALUES (1, 'Local') ON CONFLICT (id) DO NOTHING;
    INSERT INTO sync_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
  `);
}
