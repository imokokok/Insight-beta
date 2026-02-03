/**
 * Database Migration: UMA-Specific to Universal Oracle Schema
 * 
 * 将UMA专用的数据库表结构迁移为通用预言机监控平台结构
 * 
 * 执行步骤:
 * 1. 创建新的通用表
 * 2. 迁移现有数据
 * 3. 创建视图保持向后兼容
 * 4. 验证数据完整性
 */

-- ============================================================================
-- Step 1: Create New Universal Tables
-- ============================================================================

-- 通用协议断言表
CREATE TABLE IF NOT EXISTS protocol_assertions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol VARCHAR(50) NOT NULL, -- 'uma', 'insight', 'custom'
    chain VARCHAR(50) NOT NULL,
    contract_address VARCHAR(66) NOT NULL,
    
    -- 断言核心字段
    assertion_id VARCHAR(255) NOT NULL,
    identifier VARCHAR(255),
    claim TEXT,
    bond_amount DECIMAL(78, 0),
    currency VARCHAR(42),
    
    -- 参与方
    proposer VARCHAR(42) NOT NULL,
    disputer VARCHAR(42),
    
    -- 时间戳
    assertion_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    expiration_timestamp TIMESTAMP WITH TIME ZONE,
    dispute_timestamp TIMESTAMP WITH TIME ZONE,
    resolution_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- 状态
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'disputed', 'resolved', 'expired'
    resolution_result BOOLEAN, -- true = approved, false = rejected
    
    -- 元数据
    transaction_hash VARCHAR(66),
    block_number BIGINT,
    log_index INTEGER,
    
    -- 协议特定数据 (JSONB)
    protocol_data JSONB DEFAULT '{}',
    
    -- 创建和更新时间
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 索引
    CONSTRAINT unique_protocol_assertion UNIQUE (protocol, chain, assertion_id)
);

-- 通用协议争议表
CREATE TABLE IF NOT EXISTS protocol_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol VARCHAR(50) NOT NULL,
    chain VARCHAR(50) NOT NULL,
    
    -- 关联断言
    assertion_id VARCHAR(255) NOT NULL,
    assertion_uuid UUID REFERENCES protocol_assertions(id),
    
    -- 争议核心字段
    dispute_id VARCHAR(255),
    disputer VARCHAR(42) NOT NULL,
    bond_amount DECIMAL(78, 0),
    
    -- 时间戳
    dispute_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    resolution_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- 状态
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'resolved'
    resolution_result BOOLEAN,
    
    -- 投票结果
    votes_for DECIMAL(78, 0) DEFAULT 0,
    votes_against DECIMAL(78, 0) DEFAULT 0,
    
    -- 元数据
    transaction_hash VARCHAR(66),
    block_number BIGINT,
    
    -- 协议特定数据
    protocol_data JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 通用价格源表
CREATE TABLE IF NOT EXISTS protocol_price_feeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol VARCHAR(50) NOT NULL,
    chain VARCHAR(50) NOT NULL,
    
    -- 价格对
    pair VARCHAR(50) NOT NULL, -- 'ETH/USD'
    base_asset VARCHAR(50) NOT NULL, -- 'ETH'
    quote_asset VARCHAR(50) NOT NULL, -- 'USD'
    
    -- 价格数据
    price DECIMAL(78, 18) NOT NULL,
    decimals INTEGER DEFAULT 8,
    confidence DECIMAL(10, 4), -- 置信度 (0-100)
    
    -- 时间戳
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    block_number BIGINT,
    round_id VARCHAR(255),
    
    -- 合约信息
    contract_address VARCHAR(42),
    
    -- 元数据
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 索引
    CONSTRAINT unique_protocol_price UNIQUE (protocol, chain, pair, timestamp)
);

-- 通用协议同步状态表
CREATE TABLE IF NOT EXISTS protocol_sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol VARCHAR(50) NOT NULL,
    chain VARCHAR(50) NOT NULL,
    
    -- 同步状态
    last_synced_block BIGINT DEFAULT 0,
    latest_block BIGINT,
    last_sync_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- 健康状态
    status VARCHAR(50) DEFAULT 'idle', -- 'idle', 'syncing', 'error'
    error_message TEXT,
    
    -- 统计
    total_synced INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    
    -- 配置
    sync_config JSONB DEFAULT '{}',
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_protocol_sync UNIQUE (protocol, chain)
);

-- ============================================================================
-- Step 2: Create Indexes
-- ============================================================================

-- 断言表索引
CREATE INDEX idx_assertions_protocol ON protocol_assertions(protocol);
CREATE INDEX idx_assertions_chain ON protocol_assertions(chain);
CREATE INDEX idx_assertions_status ON protocol_assertions(status);
CREATE INDEX idx_assertions_proposer ON protocol_assertions(proposer);
CREATE INDEX idx_assertions_timestamp ON protocol_assertions(assertion_timestamp);
CREATE INDEX idx_assertions_protocol_chain ON protocol_assertions(protocol, chain);

-- 争议表索引
CREATE INDEX idx_disputes_protocol ON protocol_disputes(protocol);
CREATE INDEX idx_disputes_assertion ON protocol_disputes(assertion_id);
CREATE INDEX idx_disputes_status ON protocol_disputes(status);

-- 价格表索引
CREATE INDEX idx_prices_protocol ON protocol_price_feeds(protocol);
CREATE INDEX idx_prices_pair ON protocol_price_feeds(pair);
CREATE INDEX idx_prices_timestamp ON protocol_price_feeds(timestamp);
CREATE INDEX idx_prices_protocol_pair ON protocol_price_feeds(protocol, pair);

-- ============================================================================
-- Step 3: Migrate Data from UMA Tables (if they exist)
-- ============================================================================

-- 迁移断言数据
INSERT INTO protocol_assertions (
    protocol,
    chain,
    contract_address,
    assertion_id,
    identifier,
    claim,
    bond_amount,
    currency,
    proposer,
    disputer,
    assertion_timestamp,
    expiration_timestamp,
    dispute_timestamp,
    resolution_timestamp,
    status,
    resolution_result,
    transaction_hash,
    block_number,
    log_index,
    protocol_data,
    created_at,
    updated_at
)
SELECT 
    'uma' as protocol,
    COALESCE(chain, 'ethereum') as chain,
    COALESCE(contract_address, '0x0000000000000000000000000000000000000000') as contract_address,
    assertion_id,
    identifier,
    claim,
    bond_amount,
    currency,
    proposer,
    disputer,
    assertion_timestamp,
    expiration_timestamp,
    dispute_timestamp,
    resolution_timestamp,
    status,
    resolution_result,
    transaction_hash,
    block_number,
    log_index,
    jsonb_build_object(
        'original_table', 'uma_assertions',
        'migrated_at', NOW()
    ) as protocol_data,
    created_at,
    updated_at
FROM uma_assertions
WHERE NOT EXISTS (
    SELECT 1 FROM protocol_assertions 
    WHERE protocol = 'uma' AND assertion_id = uma_assertions.assertion_id
);

-- 迁移争议数据
INSERT INTO protocol_disputes (
    protocol,
    chain,
    assertion_id,
    assertion_uuid,
    dispute_id,
    disputer,
    bond_amount,
    dispute_timestamp,
    resolution_timestamp,
    status,
    resolution_result,
    votes_for,
    votes_against,
    transaction_hash,
    block_number,
    protocol_data,
    created_at,
    updated_at
)
SELECT 
    'uma' as protocol,
    COALESCE(chain, 'ethereum') as chain,
    d.assertion_id,
    pa.id as assertion_uuid,
    d.dispute_id,
    d.disputer,
    d.bond_amount,
    d.dispute_timestamp,
    d.resolution_timestamp,
    d.status,
    d.resolution_result,
    COALESCE(d.votes_for, 0),
    COALESCE(d.votes_against, 0),
    d.transaction_hash,
    d.block_number,
    jsonb_build_object(
        'original_table', 'uma_disputes',
        'migrated_at', NOW()
    ) as protocol_data,
    d.created_at,
    d.updated_at
FROM uma_disputes d
LEFT JOIN protocol_assertions pa ON pa.assertion_id = d.assertion_id AND pa.protocol = 'uma'
WHERE NOT EXISTS (
    SELECT 1 FROM protocol_disputes 
    WHERE protocol = 'uma' AND dispute_id = d.dispute_id
);

-- ============================================================================
-- Step 4: Create Views for Backward Compatibility
-- ============================================================================

-- 保持旧表名作为视图
CREATE OR REPLACE VIEW uma_assertions_view AS
SELECT * FROM protocol_assertions WHERE protocol = 'uma';

CREATE OR REPLACE VIEW uma_disputes_view AS
SELECT * FROM protocol_disputes WHERE protocol = 'uma';

-- ============================================================================
-- Step 5: Create Triggers for Updated At
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_protocol_assertions_updated_at
    BEFORE UPDATE ON protocol_assertions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_protocol_disputes_updated_at
    BEFORE UPDATE ON protocol_disputes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_protocol_sync_status_updated_at
    BEFORE UPDATE ON protocol_sync_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Step 6: Verification Queries
-- ============================================================================

-- 验证数据迁移
SELECT 
    'Assertions' as table_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE protocol = 'uma') as uma_count
FROM protocol_assertions
UNION ALL
SELECT 
    'Disputes' as table_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE protocol = 'uma') as uma_count
FROM protocol_disputes;

-- 验证协议分布
SELECT 
    protocol,
    COUNT(*) as assertion_count
FROM protocol_assertions
GROUP BY protocol
ORDER BY assertion_count DESC;

-- ============================================================================
-- Migration Complete
-- ============================================================================

COMMENT ON TABLE protocol_assertions IS 'Universal protocol assertions table supporting multiple optimistic oracle protocols';
COMMENT ON TABLE protocol_disputes IS 'Universal protocol disputes table supporting multiple optimistic oracle protocols';
COMMENT ON TABLE protocol_price_feeds IS 'Universal price feed table supporting multiple oracle protocols';
COMMENT ON TABLE protocol_sync_status IS 'Universal sync status tracking for all protocols';
