import type { TableDefinition, IndexDefinition, QueryFn } from './types';

export const umaTables: TableDefinition[] = [
  {
    name: 'uma_oracle_config',
    sql: `
      CREATE TABLE IF NOT EXISTS uma_oracle_config (
        id TEXT PRIMARY KEY,
        chain TEXT NOT NULL,
        rpc_url TEXT,
        optimistic_oracle_v2_address TEXT,
        optimistic_oracle_v3_address TEXT,
        start_block BIGINT DEFAULT 0,
        max_block_range INTEGER DEFAULT 10000,
        voting_period_hours INTEGER DEFAULT 72,
        confirmation_blocks INTEGER DEFAULT 12,
        enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `,
  },
  {
    name: 'uma_sync_state',
    sql: `
      CREATE TABLE IF NOT EXISTS uma_sync_state (
        instance_id TEXT PRIMARY KEY REFERENCES uma_oracle_config(id) ON DELETE CASCADE,
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
    name: 'uma_assertions',
    sql: `
      CREATE TABLE IF NOT EXISTS uma_assertions (
        id TEXT PRIMARY KEY,
        instance_id TEXT NOT NULL DEFAULT 'uma-default',
        chain TEXT NOT NULL,
        identifier TEXT NOT NULL,
        ancillary_data TEXT,
        proposer TEXT NOT NULL,
        proposed_value NUMERIC,
        reward NUMERIC,
        proposed_at TIMESTAMP WITH TIME ZONE NOT NULL,
        disputed_at TIMESTAMP WITH TIME ZONE,
        settled_at TIMESTAMP WITH TIME ZONE,
        settlement_value NUMERIC,
        status TEXT NOT NULL,
        bond NUMERIC,
        dispute_bond NUMERIC,
        tx_hash TEXT NOT NULL,
        block_number BIGINT NOT NULL,
        log_index INTEGER NOT NULL,
        version TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `,
  },
  {
    name: 'uma_disputes',
    sql: `
      CREATE TABLE IF NOT EXISTS uma_disputes (
        id TEXT PRIMARY KEY,
        instance_id TEXT NOT NULL DEFAULT 'uma-default',
        chain TEXT NOT NULL,
        assertion_id TEXT NOT NULL REFERENCES uma_assertions(id),
        identifier TEXT,
        ancillary_data TEXT,
        disputer TEXT NOT NULL,
        dispute_bond NUMERIC NOT NULL,
        disputed_at TIMESTAMP WITH TIME ZONE NOT NULL,
        voting_ends_at TIMESTAMP WITH TIME ZONE,
        status TEXT NOT NULL,
        current_votes_for NUMERIC DEFAULT 0,
        current_votes_against NUMERIC DEFAULT 0,
        total_votes NUMERIC DEFAULT 0,
        tx_hash TEXT NOT NULL,
        block_number BIGINT NOT NULL,
        log_index INTEGER NOT NULL,
        version TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `,
  },
  {
    name: 'uma_votes',
    sql: `
      CREATE TABLE IF NOT EXISTS uma_votes (
        id BIGSERIAL PRIMARY KEY,
        instance_id TEXT NOT NULL DEFAULT 'uma-default',
        chain TEXT NOT NULL,
        assertion_id TEXT NOT NULL REFERENCES uma_assertions(id),
        voter TEXT NOT NULL,
        support BOOLEAN NOT NULL,
        weight NUMERIC DEFAULT 0,
        tx_hash TEXT NOT NULL,
        block_number BIGINT NOT NULL,
        log_index INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE (tx_hash, log_index)
      )
    `,
  },
  {
    name: 'uma_voter_rewards',
    sql: `
      CREATE TABLE IF NOT EXISTS uma_voter_rewards (
        id TEXT PRIMARY KEY,
        voter TEXT NOT NULL,
        assertion_id TEXT NOT NULL,
        reward_amount NUMERIC NOT NULL DEFAULT 0,
        claimed BOOLEAN NOT NULL DEFAULT false,
        claimed_at TIMESTAMP WITH TIME ZONE,
        claim_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
        chain TEXT NOT NULL,
        block_number BIGINT NOT NULL,
        tx_hash TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `,
  },
  {
    name: 'uma_staking',
    sql: `
      CREATE TABLE IF NOT EXISTS uma_staking (
        id TEXT PRIMARY KEY,
        voter TEXT NOT NULL UNIQUE,
        staked_amount NUMERIC NOT NULL DEFAULT 0,
        pending_rewards NUMERIC NOT NULL DEFAULT 0,
        last_update_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        cooldown_end TIMESTAMP WITH TIME ZONE,
        chain TEXT NOT NULL,
        block_number BIGINT NOT NULL,
        tx_hash TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `,
  },
  {
    name: 'uma_slashing',
    sql: `
      CREATE TABLE IF NOT EXISTS uma_slashing (
        id TEXT PRIMARY KEY,
        voter TEXT NOT NULL,
        assertion_id TEXT NOT NULL,
        slash_amount NUMERIC NOT NULL DEFAULT 0,
        reason TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        chain TEXT NOT NULL,
        block_number BIGINT NOT NULL,
        tx_hash TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `,
  },
  {
    name: 'uma_tvl',
    sql: `
      CREATE TABLE IF NOT EXISTS uma_tvl (
        id TEXT PRIMARY KEY,
        chain_id INTEGER NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        total_staked NUMERIC NOT NULL DEFAULT 0,
        total_bonded NUMERIC NOT NULL DEFAULT 0,
        total_rewards NUMERIC NOT NULL DEFAULT 0,
        oracle_tvl NUMERIC NOT NULL DEFAULT 0,
        dvm_tvl NUMERIC NOT NULL DEFAULT 0,
        active_assertions INTEGER NOT NULL DEFAULT 0,
        active_disputes INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `,
  },
  {
    name: 'polymarket_markets',
    sql: `
      CREATE TABLE IF NOT EXISTS polymarket_markets (
        id TEXT PRIMARY KEY,
        condition_id TEXT NOT NULL,
        question TEXT NOT NULL DEFAULT '',
        creator TEXT NOT NULL,
        collateral_token TEXT NOT NULL,
        fee NUMERIC NOT NULL DEFAULT 0,
        created_at_block BIGINT NOT NULL,
        resolved BOOLEAN NOT NULL DEFAULT false,
        resolution_time TIMESTAMP WITH TIME ZONE,
        outcome INTEGER,
        volume NUMERIC NOT NULL DEFAULT 0,
        liquidity NUMERIC NOT NULL DEFAULT 0,
        chain TEXT NOT NULL DEFAULT '137',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `,
  },
  {
    name: 'polymarket_resolutions',
    sql: `
      CREATE TABLE IF NOT EXISTS polymarket_resolutions (
        id TEXT PRIMARY KEY,
        condition_id TEXT NOT NULL,
        resolved BOOLEAN NOT NULL DEFAULT true,
        outcome INTEGER NOT NULL,
        resolution_time TIMESTAMP WITH TIME ZONE NOT NULL,
        resolver TEXT NOT NULL,
        tx_hash TEXT NOT NULL,
        chain TEXT NOT NULL DEFAULT '137',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `,
  },
];

export const umaIndexes: IndexDefinition[] = [
  {
    name: 'idx_uma_assertions_date',
    table: 'uma_assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_assertions_date ON uma_assertions(proposed_at)',
  },
  {
    name: 'idx_uma_assertions_status',
    table: 'uma_assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_assertions_status ON uma_assertions(status)',
  },
  {
    name: 'idx_uma_assertions_chain',
    table: 'uma_assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_assertions_chain ON uma_assertions(chain)',
  },
  {
    name: 'idx_uma_assertions_identifier',
    table: 'uma_assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_assertions_identifier ON uma_assertions(identifier)',
  },
  {
    name: 'idx_uma_assertions_instance',
    table: 'uma_assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_assertions_instance ON uma_assertions(instance_id)',
  },
  {
    name: 'idx_uma_assertions_proposer',
    table: 'uma_assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_assertions_proposer ON uma_assertions(proposer)',
  },
  {
    name: 'idx_uma_assertions_tx_hash',
    table: 'uma_assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_assertions_tx_hash ON uma_assertions(tx_hash)',
  },
  {
    name: 'idx_uma_assertions_block_number',
    table: 'uma_assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_assertions_block_number ON uma_assertions(block_number)',
  },
  {
    name: 'idx_uma_assertions_status_date',
    table: 'uma_assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_assertions_status_date ON uma_assertions(status, proposed_at DESC)',
  },
  {
    name: 'idx_uma_assertions_chain_date',
    table: 'uma_assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_assertions_chain_date ON uma_assertions(chain, proposed_at DESC)',
  },
  {
    name: 'idx_uma_disputes_assertion',
    table: 'uma_disputes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_disputes_assertion ON uma_disputes(assertion_id)',
  },
  {
    name: 'idx_uma_disputes_status',
    table: 'uma_disputes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_disputes_status ON uma_disputes(status)',
  },
  {
    name: 'idx_uma_disputes_chain',
    table: 'uma_disputes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_disputes_chain ON uma_disputes(chain)',
  },
  {
    name: 'idx_uma_disputes_instance',
    table: 'uma_disputes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_disputes_instance ON uma_disputes(instance_id)',
  },
  {
    name: 'idx_uma_disputes_disputer',
    table: 'uma_disputes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_disputes_disputer ON uma_disputes(disputer)',
  },
  {
    name: 'idx_uma_disputes_date',
    table: 'uma_disputes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_disputes_date ON uma_disputes(disputed_at)',
  },
  {
    name: 'idx_uma_disputes_tx_hash',
    table: 'uma_disputes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_disputes_tx_hash ON uma_disputes(tx_hash)',
  },
  {
    name: 'idx_uma_votes_assertion',
    table: 'uma_votes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_votes_assertion ON uma_votes(assertion_id)',
  },
  {
    name: 'idx_uma_votes_voter',
    table: 'uma_votes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_votes_voter ON uma_votes(voter)',
  },
  {
    name: 'idx_uma_votes_instance',
    table: 'uma_votes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_votes_instance ON uma_votes(instance_id)',
  },
  {
    name: 'idx_uma_sync_state_instance',
    table: 'uma_sync_state',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_sync_state_instance ON uma_sync_state(instance_id)',
  },
  {
    name: 'idx_uma_rewards_voter',
    table: 'uma_voter_rewards',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_rewards_voter ON uma_voter_rewards(voter)',
  },
  {
    name: 'idx_uma_rewards_assertion',
    table: 'uma_voter_rewards',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_rewards_assertion ON uma_voter_rewards(assertion_id)',
  },
  {
    name: 'idx_uma_rewards_claimed',
    table: 'uma_voter_rewards',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_rewards_claimed ON uma_voter_rewards(claimed)',
  },
  {
    name: 'idx_uma_rewards_voter_claimed',
    table: 'uma_voter_rewards',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_rewards_voter_claimed ON uma_voter_rewards(voter, claimed)',
  },
  {
    name: 'idx_uma_rewards_created_at',
    table: 'uma_voter_rewards',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_rewards_created_at ON uma_voter_rewards(created_at DESC)',
  },
  {
    name: 'idx_uma_staking_voter',
    table: 'uma_staking',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_staking_voter ON uma_staking(voter)',
  },
  {
    name: 'idx_uma_staking_amount',
    table: 'uma_staking',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_staking_amount ON uma_staking(staked_amount DESC)',
  },
  {
    name: 'idx_uma_staking_cooldown',
    table: 'uma_staking',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_staking_cooldown ON uma_staking(cooldown_end)',
  },
  {
    name: 'idx_uma_slashing_voter',
    table: 'uma_slashing',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_slashing_voter ON uma_slashing(voter)',
  },
  {
    name: 'idx_uma_slashing_assertion',
    table: 'uma_slashing',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_slashing_assertion ON uma_slashing(assertion_id)',
  },
  {
    name: 'idx_uma_slashing_timestamp',
    table: 'uma_slashing',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_slashing_timestamp ON uma_slashing(timestamp DESC)',
  },
  {
    name: 'idx_uma_slashing_voter_timestamp',
    table: 'uma_slashing',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_slashing_voter_timestamp ON uma_slashing(voter, timestamp DESC)',
  },
  {
    name: 'idx_uma_tvl_chain',
    table: 'uma_tvl',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_tvl_chain ON uma_tvl(chain_id)',
  },
  {
    name: 'idx_uma_tvl_timestamp',
    table: 'uma_tvl',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_tvl_timestamp ON uma_tvl(timestamp DESC)',
  },
  {
    name: 'idx_uma_tvl_chain_timestamp',
    table: 'uma_tvl',
    sql: 'CREATE INDEX IF NOT EXISTS idx_uma_tvl_chain_timestamp ON uma_tvl(chain_id, timestamp DESC)',
  },
  {
    name: 'idx_polymarket_markets_condition',
    table: 'polymarket_markets',
    sql: 'CREATE INDEX IF NOT EXISTS idx_polymarket_markets_condition ON polymarket_markets(condition_id)',
  },
  {
    name: 'idx_polymarket_markets_resolved',
    table: 'polymarket_markets',
    sql: 'CREATE INDEX IF NOT EXISTS idx_polymarket_markets_resolved ON polymarket_markets(resolved)',
  },
  {
    name: 'idx_polymarket_markets_creator',
    table: 'polymarket_markets',
    sql: 'CREATE INDEX IF NOT EXISTS idx_polymarket_markets_creator ON polymarket_markets(creator)',
  },
  {
    name: 'idx_polymarket_markets_created_at',
    table: 'polymarket_markets',
    sql: 'CREATE INDEX IF NOT EXISTS idx_polymarket_markets_created_at ON polymarket_markets(created_at DESC)',
  },
  {
    name: 'idx_polymarket_resolutions_condition',
    table: 'polymarket_resolutions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_polymarket_resolutions_condition ON polymarket_resolutions(condition_id)',
  },
  {
    name: 'idx_polymarket_resolutions_time',
    table: 'polymarket_resolutions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_polymarket_resolutions_time ON polymarket_resolutions(resolution_time DESC)',
  },
];

export async function createUMATables(queryFn: QueryFn): Promise<void> {
  for (const table of umaTables) {
    await queryFn(table.sql);
  }
}

export async function createUMAIndexes(queryFn: QueryFn): Promise<void> {
  for (const index of umaIndexes) {
    await queryFn(index.sql);
  }
}

export async function insertUMAInitialData(queryFn: QueryFn): Promise<void> {
  await queryFn(`
    INSERT INTO uma_oracle_config (
      id, chain, optimistic_oracle_v2_address, optimistic_oracle_v3_address, enabled
    )
    SELECT
      'uma-mainnet', 'Ethereum',
      '0x9923D42eF195B0fA36D6f80f5629Ce76D1eF8754',
      '0xA5B9d8a0B0Fa04B710D7ee40D90d2551E58d0F65',
      true
    ON CONFLICT (id) DO NOTHING;
  `);
}
