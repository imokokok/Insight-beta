-- Price History Tables Migration
-- 价格历史数据表结构

-- ============================================================================
-- 原始价格数据表 (保留7天)
-- ============================================================================
CREATE TABLE IF NOT EXISTS price_history_raw (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL,
    protocol VARCHAR(50) NOT NULL,
    chain VARCHAR(50) NOT NULL,
    price DECIMAL(36, 18) NOT NULL,
    price_raw VARCHAR(78) NOT NULL,
    decimals INTEGER NOT NULL DEFAULT 8,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    block_number BIGINT,
    confidence DECIMAL(5, 4),
    volume_24h DECIMAL(36, 18),
    change_24h DECIMAL(10, 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_price_history_raw_symbol_timestamp 
    ON price_history_raw(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_raw_protocol_timestamp 
    ON price_history_raw(protocol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_raw_chain_timestamp 
    ON price_history_raw(chain, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_raw_timestamp 
    ON price_history_raw(timestamp DESC);

-- 复合索引
CREATE INDEX IF NOT EXISTS idx_price_history_raw_symbol_protocol_chain_timestamp 
    ON price_history_raw(symbol, protocol, chain, timestamp DESC);

-- ============================================================================
-- 1分钟聚合数据表 (保留30天)
-- ============================================================================
CREATE TABLE IF NOT EXISTS price_history_min1 (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL,
    protocol VARCHAR(50) NOT NULL,
    chain VARCHAR(50) NOT NULL,
    price_open DECIMAL(36, 18) NOT NULL,
    price_high DECIMAL(36, 18) NOT NULL,
    price_low DECIMAL(36, 18) NOT NULL,
    price_close DECIMAL(36, 18) NOT NULL,
    volume BIGINT NOT NULL DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL,
    sample_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(symbol, protocol, chain, timestamp)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_price_history_min1_symbol_timestamp 
    ON price_history_min1(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_min1_timestamp 
    ON price_history_min1(timestamp DESC);

-- ============================================================================
-- 5分钟聚合数据表 (保留90天)
-- ============================================================================
CREATE TABLE IF NOT EXISTS price_history_min5 (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL,
    protocol VARCHAR(50) NOT NULL,
    chain VARCHAR(50) NOT NULL,
    price_open DECIMAL(36, 18) NOT NULL,
    price_high DECIMAL(36, 18) NOT NULL,
    price_low DECIMAL(36, 18) NOT NULL,
    price_close DECIMAL(36, 18) NOT NULL,
    volume BIGINT NOT NULL DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL,
    sample_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(symbol, protocol, chain, timestamp)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_price_history_min5_symbol_timestamp 
    ON price_history_min5(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_min5_timestamp 
    ON price_history_min5(timestamp DESC);

-- ============================================================================
-- 1小时聚合数据表 (保留365天)
-- ============================================================================
CREATE TABLE IF NOT EXISTS price_history_hour1 (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL,
    protocol VARCHAR(50) NOT NULL,
    chain VARCHAR(50) NOT NULL,
    price_open DECIMAL(36, 18) NOT NULL,
    price_high DECIMAL(36, 18) NOT NULL,
    price_low DECIMAL(36, 18) NOT NULL,
    price_close DECIMAL(36, 18) NOT NULL,
    volume BIGINT NOT NULL DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL,
    sample_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(symbol, protocol, chain, timestamp)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_price_history_hour1_symbol_timestamp 
    ON price_history_hour1(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_hour1_timestamp 
    ON price_history_hour1(timestamp DESC);

-- ============================================================================
-- 1天聚合数据表 (永久保留)
-- ============================================================================
CREATE TABLE IF NOT EXISTS price_history_day1 (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL,
    protocol VARCHAR(50) NOT NULL,
    chain VARCHAR(50) NOT NULL,
    price_open DECIMAL(36, 18) NOT NULL,
    price_high DECIMAL(36, 18) NOT NULL,
    price_low DECIMAL(36, 18) NOT NULL,
    price_close DECIMAL(36, 18) NOT NULL,
    volume BIGINT NOT NULL DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL,
    sample_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(symbol, protocol, chain, timestamp)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_price_history_day1_symbol_timestamp 
    ON price_history_day1(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_day1_timestamp 
    ON price_history_day1(timestamp DESC);

-- ============================================================================
-- 分区表 (可选，用于大数据量场景)
-- ============================================================================
-- 如果需要分区，可以使用以下命令：
-- CREATE TABLE price_history_raw_partitioned (LIKE price_history_raw) 
-- PARTITION BY RANGE (timestamp);

-- ============================================================================
-- 注释
-- ============================================================================
COMMENT ON TABLE price_history_raw IS '原始价格数据，保留7天';
COMMENT ON TABLE price_history_min1 IS '1分钟聚合价格数据，保留30天';
COMMENT ON TABLE price_history_min5 IS '5分钟聚合价格数据，保留90天';
COMMENT ON TABLE price_history_hour1 IS '1小时聚合价格数据，保留365天';
COMMENT ON TABLE price_history_day1 IS '1天聚合价格数据，永久保留';
