-- ============================================================================
-- Universal Oracle Database Migration Script
-- 将UMA专用表迁移到通用预言机表结构
-- ============================================================================

-- 开始事务
BEGIN;

-- ============================================================================
-- Step 1: Create Universal Tables (if not exists)
-- ============================================================================

-- 通用协议配置表
CREATE TABLE IF NOT EXISTS oracle_protocol_config (
    id TEXT PRIMARY KEY,
    protocol VARCHAR(50) NOT NULL,
    chain TEXT NOT NULL,
    name TEXT NOT NULL,
    rpc_url TEXT,
    contract_addresses JSONB DEFAULT '{}',
    start_block BIGINT DEFAULT 0,
    max_block_range INTEGER DEFAULT 10000,
    voting_period_hours INTEGER DEFAULT 72,
    confirmation_blocks INTEGER DEFAULT 12,
    protocol_config JSONB DEFAULT '{}',
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(protocol, chain)
);

-- 通用同步状态表
CREATE TABLE IF NOT EXISTS oracle_protocol_sync_state (
    id TEXT PRIMARY KEY,
    protocol VARCHAR(50) NOT NULL,
    chain TEXT NOT NULL,
    instance_id TEXT NOT NULL,
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
    total_synced INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(protocol, chain, instance_id)
);

-- 通用断言表
CREATE TABLE IF NOT EXISTS oracle_assertions (
    id TEXT PRIMARY KEY,
    protocol VARCHAR(50) NOT NULL,
    chain TEXT NOT NULL,
    instance_id TEXT NOT NULL DEFAULT 'default',
    assertion_id TEXT NOT NULL,
    identifier TEXT,
    claim TEXT,
    proposer TEXT NOT NULL,
    proposed_value NUMERIC,
    reward NUMERIC,
    bond NUMERIC,
    currency TEXT,
    disputer TEXT,
    dispute_bond NUMERIC,
    settlement_value NUMERIC,
    resolution_result BOOLEAN,
    proposed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expiration_at TIMESTAMP WITH TIME ZONE,
    disputed_at TIMESTAMP WITH TIME ZONE,
    settled_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    block_number BIGINT NOT NULL,
    log_index INTEGER NOT NULL,
    version TEXT NOT NULL DEFAULT 'v1',
    protocol_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(protocol, chain, assertion_id)
);

-- 通用争议表
CREATE TABLE IF NOT EXISTS oracle_disputes (
    id TEXT PRIMARY KEY,
    protocol VARCHAR(50) NOT NULL,
    chain TEXT NOT NULL,
    instance_id TEXT NOT NULL DEFAULT 'default',
    assertion_id TEXT NOT NULL,
    assertion_uuid TEXT REFERENCES oracle_assertions(id),
    dispute_id TEXT,
    identifier TEXT,
    ancillary_data TEXT,
    disputer TEXT NOT NULL,
    dispute_bond NUMERIC NOT NULL,
    voting_ends_at TIMESTAMP WITH TIME ZONE,
    current_votes_for NUMERIC DEFAULT 0,
    current_votes_against NUMERIC DEFAULT 0,
    total_votes NUMERIC DEFAULT 0,
    status TEXT NOT NULL,
    resolution_result BOOLEAN,
    tx_hash TEXT NOT NULL,
    block_number BIGINT NOT NULL,
    log_index INTEGER NOT NULL,
    protocol_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 通用投票表
CREATE TABLE IF NOT EXISTS oracle_votes (
    id BIGSERIAL PRIMARY KEY,
    protocol VARCHAR(50) NOT NULL,
    chain TEXT NOT NULL,
    instance_id TEXT NOT NULL DEFAULT 'default',
    assertion_id TEXT NOT NULL,
    assertion_uuid TEXT REFERENCES oracle_assertions(id),
    voter TEXT NOT NULL,
    support BOOLEAN NOT NULL,
    weight NUMERIC DEFAULT 0,
    tx_hash TEXT NOT NULL,
    block_number BIGINT NOT NULL,
    log_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(protocol, chain, tx_hash, log_index)
);

-- 通用价格源表
CREATE TABLE IF NOT EXISTS oracle_price_feeds (
    id BIGSERIAL PRIMARY KEY,
    protocol VARCHAR(50) NOT NULL,
    chain TEXT NOT NULL,
    instance_id TEXT NOT NULL DEFAULT 'default',
    pair TEXT NOT NULL,
    base_asset TEXT NOT NULL,
    quote_asset TEXT NOT NULL,
    price NUMERIC NOT NULL,
    decimals INTEGER DEFAULT 8,
    confidence NUMERIC,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    block_number BIGINT,
    round_id TEXT,
    contract_address TEXT,
    protocol_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(protocol, chain, pair, timestamp)
);

-- 通用奖励表
CREATE TABLE IF NOT EXISTS oracle_rewards (
    id TEXT PRIMARY KEY,
    protocol VARCHAR(50) NOT NULL,
    chain TEXT NOT NULL,
    recipient TEXT NOT NULL,
    recipient_type TEXT NOT NULL,
    assertion_id TEXT,
    dispute_id TEXT,
    reward_amount NUMERIC NOT NULL DEFAULT 0,
    reward_token TEXT,
    claimed BOOLEAN NOT NULL DEFAULT false,
    claimed_at TIMESTAMP WITH TIME ZONE,
    claim_deadline TIMESTAMP WITH TIME ZONE,
    tx_hash TEXT,
    block_number BIGINT,
    protocol_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 通用质押表
CREATE TABLE IF NOT EXISTS oracle_staking (
    id TEXT PRIMARY KEY,
    protocol VARCHAR(50) NOT NULL,
    chain TEXT NOT NULL,
    staker TEXT NOT NULL,
    staked_amount NUMERIC NOT NULL DEFAULT 0,
    staked_token TEXT,
    pending_rewards NUMERIC NOT NULL DEFAULT 0,
    last_update_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    cooldown_end TIMESTAMP WITH TIME ZONE,
    tx_hash TEXT,
    block_number BIGINT,
    protocol_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(protocol, chain, staker)
);

-- 通用惩罚表
CREATE TABLE IF NOT EXISTS oracle_slashing (
    id TEXT PRIMARY KEY,
    protocol VARCHAR(50) NOT NULL,
    chain TEXT NOT NULL,
    slashed_entity TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    assertion_id TEXT,
    dispute_id TEXT,
    slash_amount NUMERIC NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    tx_hash TEXT NOT NULL,
    block_number BIGINT NOT NULL,
    protocol_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 通用TVL表
CREATE TABLE IF NOT EXISTS oracle_tvl (
    id TEXT PRIMARY KEY,
    protocol VARCHAR(50) NOT NULL,
    chain TEXT NOT NULL,
    chain_id INTEGER NOT NULL,
    total_staked NUMERIC NOT NULL DEFAULT 0,
    total_bonded NUMERIC NOT NULL DEFAULT 0,
    total_rewards NUMERIC NOT NULL DEFAULT 0,
    oracle_tvl NUMERIC NOT NULL DEFAULT 0,
    active_assertions INTEGER NOT NULL DEFAULT 0,
    active_disputes INTEGER NOT NULL DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    protocol_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Step 2: Migrate Data from UMA Tables
-- ============================================================================

-- 迁移配置数据
INSERT INTO oracle_protocol_config (
    id, protocol, chain, name, rpc_url, contract_addresses,
    start_block, max_block_range, voting_period_hours, confirmation_blocks,
    protocol_config, enabled, created_at, updated_at
)
SELECT 
    id, 'uma', chain, 'UMA ' || chain, rpc_url,
    jsonb_build_object(
        'optimisticOracleV2', optimistic_oracle_v2_address,
        'optimisticOracleV3', optimistic_oracle_v3_address
    ),
    start_block, max_block_range, voting_period_hours, confirmation_blocks,
    '{}', enabled, created_at, updated_at
FROM uma_oracle_config
ON CONFLICT (id) DO NOTHING;

-- 迁移同步状态
INSERT INTO oracle_protocol_sync_state (
    id, protocol, chain, instance_id, last_processed_block, latest_block, safe_block,
    last_success_processed_block, consecutive_failures, rpc_active_url, rpc_stats,
    last_attempt_at, last_success_at, last_duration_ms, last_error,
    total_synced, success_count, error_count, created_at, updated_at
)
SELECT 
    instance_id || '_uma', 'uma', 'ethereum', instance_id,
    last_processed_block, latest_block, safe_block,
    last_success_processed_block, consecutive_failures, rpc_active_url, rpc_stats,
    last_attempt_at, last_success_at, last_duration_ms, last_error,
    0, 0, 0, NOW(), updated_at
FROM uma_sync_state
ON CONFLICT (id) DO NOTHING;

-- 迁移断言数据
INSERT INTO oracle_assertions (
    id, protocol, chain, instance_id, assertion_id, identifier, claim,
    proposer, proposed_value, reward, bond, currency,
    disputer, dispute_bond, settlement_value, resolution_result,
    proposed_at, expiration_at, disputed_at, settled_at, status,
    tx_hash, block_number, log_index, version, protocol_data, created_at, updated_at
)
SELECT 
    'uma_' || id, 'uma', chain, instance_id, id, identifier, ancillary_data,
    proposer, proposed_value, reward, bond, currency,
    disputer, dispute_bond, settlement_value, resolution_result,
    proposed_at, NULL, disputed_at, settled_at, status,
    tx_hash, block_number, log_index, version,
    jsonb_build_object('original_table', 'uma_assertions'), created_at, updated_at
FROM uma_assertions
ON CONFLICT (id) DO NOTHING;

-- 迁移争议数据
INSERT INTO oracle_disputes (
    id, protocol, chain, instance_id, assertion_id, assertion_uuid, dispute_id,
    identifier, ancillary_data, disputer, dispute_bond,
    voting_ends_at, current_votes_for, current_votes_against, total_votes,
    status, resolution_result, tx_hash, block_number, log_index,
    protocol_data, created_at, updated_at
)
SELECT 
    'uma_' || d.id, 'uma', d.chain, d.instance_id, d.assertion_id, 
    'uma_' || d.assertion_id, d.id, d.identifier, d.ancillary_data,
    d.disputer, d.dispute_bond, d.voting_ends_at, d.current_votes_for,
    d.current_votes_against, d.total_votes, d.status, NULL, d.tx_hash,
    d.block_number, d.log_index,
    jsonb_build_object('original_table', 'uma_disputes'), d.created_at, d.updated_at
FROM uma_disputes d
ON CONFLICT (id) DO NOTHING;

-- 迁移投票数据
INSERT INTO oracle_votes (
    protocol, chain, instance_id, assertion_id, assertion_uuid, voter, support, weight,
    tx_hash, block_number, log_index, created_at
)
SELECT 
    'uma', chain, instance_id, assertion_id, 'uma_' || assertion_id, voter, support, weight,
    tx_hash, block_number, log_index, created_at
FROM uma_votes
ON CONFLICT (protocol, chain, tx_hash, log_index) DO NOTHING;

-- 迁移奖励数据
INSERT INTO oracle_rewards (
    id, protocol, chain, recipient, recipient_type, assertion_id, reward_amount,
    reward_token, claimed, claimed_at, claim_deadline, tx_hash, block_number,
    protocol_data, created_at, updated_at
)
SELECT 
    'uma_' || id, 'uma', chain, voter, 'voter', assertion_id, reward_amount,
    NULL, claimed, claimed_at, claim_deadline, tx_hash, block_number,
    jsonb_build_object('original_table', 'uma_voter_rewards'), created_at, updated_at
FROM uma_voter_rewards
ON CONFLICT (id) DO NOTHING;

-- 迁移质押数据
INSERT INTO oracle_staking (
    id, protocol, chain, staker, staked_amount, staked_token, pending_rewards,
    last_update_time, cooldown_end, tx_hash, block_number,
    protocol_data, created_at, updated_at
)
SELECT 
    'uma_' || id, 'uma', chain, voter, staked_amount, NULL, pending_rewards,
    last_update_time, cooldown_end, tx_hash, block_number,
    jsonb_build_object('original_table', 'uma_staking'), created_at, updated_at
FROM uma_staking
ON CONFLICT (id) DO NOTHING;

-- 迁移惩罚数据
INSERT INTO oracle_slashing (
    id, protocol, chain, slashed_entity, entity_type, assertion_id,
    slash_amount, reason, timestamp, tx_hash, block_number,
    protocol_data, created_at
)
SELECT 
    'uma_' || id, 'uma', chain, voter, 'voter', assertion_id,
    slash_amount, reason, timestamp, tx_hash, block_number,
    jsonb_build_object('original_table', 'uma_slashing'), created_at
FROM uma_slashing
ON CONFLICT (id) DO NOTHING;

-- 迁移TVL数据
INSERT INTO oracle_tvl (
    id, protocol, chain, chain_id, total_staked, total_bonded, total_rewards,
    oracle_tvl, active_assertions, active_disputes, timestamp,
    protocol_data, created_at
)
SELECT 
    'uma_' || id, 'uma', 'ethereum', chain_id, total_staked, total_bonded, total_rewards,
    oracle_tvl, active_assertions, active_disputes, timestamp,
    jsonb_build_object('original_table', 'uma_tvl'), created_at
FROM uma_tvl
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Step 3: Create Indexes
-- ============================================================================

-- 配置表索引
CREATE INDEX IF NOT EXISTS idx_oracle_config_protocol_chain ON oracle_protocol_config(protocol, chain);
CREATE INDEX IF NOT EXISTS idx_oracle_config_enabled ON oracle_protocol_config(enabled);

-- 同步状态表索引
CREATE INDEX IF NOT EXISTS idx_oracle_sync_protocol_chain ON oracle_protocol_sync_state(protocol, chain);
CREATE INDEX IF NOT EXISTS idx_oracle_sync_instance ON oracle_protocol_sync_state(instance_id);

-- 断言表索引
CREATE INDEX IF NOT EXISTS idx_oracle_assertions_protocol ON oracle_assertions(protocol);
CREATE INDEX IF NOT EXISTS idx_oracle_assertions_chain ON oracle_assertions(chain);
CREATE INDEX IF NOT EXISTS idx_oracle_assertions_status ON oracle_assertions(status);
CREATE INDEX IF NOT EXISTS idx_oracle_assertions_proposer ON oracle_assertions(proposer);
CREATE INDEX IF NOT EXISTS idx_oracle_assertions_proposed_at ON oracle_assertions(proposed_at DESC);
CREATE INDEX IF NOT EXISTS idx_oracle_assertions_protocol_chain ON oracle_assertions(protocol, chain);

-- 争议表索引
CREATE INDEX IF NOT EXISTS idx_oracle_disputes_protocol ON oracle_disputes(protocol);
CREATE INDEX IF NOT EXISTS idx_oracle_disputes_assertion ON oracle_disputes(assertion_id);
CREATE INDEX IF NOT EXISTS idx_oracle_disputes_status ON oracle_disputes(status);
CREATE INDEX IF NOT EXISTS idx_oracle_disputes_disputer ON oracle_disputes(disputer);

-- 投票表索引
CREATE INDEX IF NOT EXISTS idx_oracle_votes_protocol ON oracle_votes(protocol);
CREATE INDEX IF NOT EXISTS idx_oracle_votes_assertion ON oracle_votes(assertion_id);
CREATE INDEX IF NOT EXISTS idx_oracle_votes_voter ON oracle_votes(voter);

-- 价格表索引
CREATE INDEX IF NOT EXISTS idx_oracle_prices_protocol ON oracle_price_feeds(protocol);
CREATE INDEX IF NOT EXISTS idx_oracle_prices_pair ON oracle_price_feeds(pair);
CREATE INDEX IF NOT EXISTS idx_oracle_prices_timestamp ON oracle_price_feeds(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_oracle_prices_protocol_pair ON oracle_price_feeds(protocol, pair);

-- 奖励表索引
CREATE INDEX IF NOT EXISTS idx_oracle_rewards_protocol ON oracle_rewards(protocol);
CREATE INDEX IF NOT EXISTS idx_oracle_rewards_recipient ON oracle_rewards(recipient);
CREATE INDEX IF NOT EXISTS idx_oracle_rewards_claimed ON oracle_rewards(claimed);

-- 质押表索引
CREATE INDEX IF NOT EXISTS idx_oracle_staking_protocol ON oracle_staking(protocol);
CREATE INDEX IF NOT EXISTS idx_oracle_staking_staker ON oracle_staking(staker);

-- 惩罚表索引
CREATE INDEX IF NOT EXISTS idx_oracle_slashing_protocol ON oracle_slashing(protocol);
CREATE INDEX IF NOT EXISTS idx_oracle_slashing_entity ON oracle_slashing(slashed_entity);

-- TVL表索引
CREATE INDEX IF NOT EXISTS idx_oracle_tvl_protocol ON oracle_tvl(protocol);
CREATE INDEX IF NOT EXISTS idx_oracle_tvl_chain ON oracle_tvl(chain);
CREATE INDEX IF NOT EXISTS idx_oracle_tvl_timestamp ON oracle_tvl(timestamp DESC);

-- ============================================================================
-- Step 4: Create Compatibility Views
-- ============================================================================

CREATE OR REPLACE VIEW uma_assertions_view AS
SELECT * FROM oracle_assertions WHERE protocol = 'uma';

CREATE OR REPLACE VIEW uma_disputes_view AS
SELECT * FROM oracle_disputes WHERE protocol = 'uma';

CREATE OR REPLACE VIEW uma_votes_view AS
SELECT * FROM oracle_votes WHERE protocol = 'uma';

CREATE OR REPLACE VIEW uma_rewards_view AS
SELECT * FROM oracle_rewards WHERE protocol = 'uma';

CREATE OR REPLACE VIEW uma_staking_view AS
SELECT * FROM oracle_staking WHERE protocol = 'uma';

-- ============================================================================
-- Step 5: Verification
-- ============================================================================

-- 验证迁移结果
SELECT 'Migration Summary' as report;

SELECT 
    'Assertions' as table_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE protocol = 'uma') as uma_count
FROM oracle_assertions
UNION ALL
SELECT 
    'Disputes' as table_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE protocol = 'uma') as uma_count
FROM oracle_disputes
UNION ALL
SELECT 
    'Votes' as table_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE protocol = 'uma') as uma_count
FROM oracle_votes
UNION ALL
SELECT 
    'Rewards' as table_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE protocol = 'uma') as uma_count
FROM oracle_rewards
UNION ALL
SELECT 
    'Staking' as table_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE protocol = 'uma') as uma_count
FROM oracle_staking;

-- 提交事务
COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================
