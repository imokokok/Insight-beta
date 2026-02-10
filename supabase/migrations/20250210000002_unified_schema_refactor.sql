-- Migration: Unified Schema Refactor
-- 统一数据库表结构重构
-- 将 unified_price_feeds + price_history_* 合并为统一的时序存储方案

-- ============================================================================
-- 步骤1: 创建新的统一价格历史表（替代所有价格历史表）
-- ============================================================================

-- 主价格历史表 - 使用分区表优化时序查询
CREATE TABLE IF NOT EXISTS price_history (
    id BIGSERIAL,
    feed_id TEXT NOT NULL, -- 格式: protocol:chain:symbol (例如: chainlink:ethereum:ETH/USD)
    protocol TEXT NOT NULL,
    chain TEXT NOT NULL,
    symbol TEXT NOT NULL,
    base_asset TEXT NOT NULL,
    quote_asset TEXT NOT NULL,
    price NUMERIC(36, 18) NOT NULL,
    price_raw TEXT NOT NULL,
    decimals INTEGER NOT NULL DEFAULT 8,
    timestamp TIMESTAMPTZ NOT NULL,
    block_number BIGINT,
    confidence NUMERIC(5, 4),
    sources INTEGER DEFAULT 1,
    is_stale BOOLEAN DEFAULT false,
    staleness_seconds INTEGER DEFAULT 0,
    tx_hash TEXT,
    log_index INTEGER,
    volume_24h NUMERIC(36, 18),
    change_24h NUMERIC(10, 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- 创建默认分区（最近3个月）
CREATE TABLE IF NOT EXISTS price_history_default PARTITION OF price_history
    DEFAULT;

-- 创建按月分区（可根据需要动态创建更多分区）
CREATE TABLE IF NOT EXISTS price_history_2025_01 PARTITION OF price_history
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE IF NOT EXISTS price_history_2025_02 PARTITION OF price_history
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE IF NOT EXISTS price_history_2025_03 PARTITION OF price_history
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_price_history_feed_id ON price_history(feed_id);
CREATE INDEX IF NOT EXISTS idx_price_history_protocol ON price_history(protocol);
CREATE INDEX IF NOT EXISTS idx_price_history_chain ON price_history(chain);
CREATE INDEX IF NOT EXISTS idx_price_history_symbol ON price_history(symbol);
CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_feed_timestamp ON price_history(feed_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_symbol_protocol_chain_timestamp 
    ON price_history(symbol, protocol, chain, timestamp DESC);

-- ============================================================================
-- 步骤2: 创建物化视图（替代 price_history_min1/5/hour1/day1）
-- ============================================================================

-- 1分钟聚合视图
CREATE MATERIALIZED VIEW IF NOT EXISTS price_history_1min AS
SELECT 
    feed_id,
    protocol,
    chain,
    symbol,
    date_trunc('minute', timestamp) as timestamp,
    (array_agg(price ORDER BY timestamp ASC))[1] as price_open,
    MAX(price) as price_high,
    MIN(price) as price_low,
    (array_agg(price ORDER BY timestamp DESC))[1] as price_close,
    COUNT(*) as sample_count,
    AVG(confidence) as avg_confidence
FROM price_history
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY feed_id, protocol, chain, symbol, date_trunc('minute', timestamp);

CREATE UNIQUE INDEX IF NOT EXISTS idx_price_history_1min_unique 
    ON price_history_1min(feed_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_price_history_1min_symbol_timestamp 
    ON price_history_1min(symbol, timestamp DESC);

-- 5分钟聚合视图
CREATE MATERIALIZED VIEW IF NOT EXISTS price_history_5min AS
SELECT 
    feed_id,
    protocol,
    chain,
    symbol,
    date_trunc('hour', timestamp) + 
        INTERVAL '5 min' * (EXTRACT(MINUTE FROM timestamp)::int / 5) as timestamp,
    (array_agg(price ORDER BY timestamp ASC))[1] as price_open,
    MAX(price) as price_high,
    MIN(price) as price_low,
    (array_agg(price ORDER BY timestamp DESC))[1] as price_close,
    COUNT(*) as sample_count,
    AVG(confidence) as avg_confidence
FROM price_history
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY feed_id, protocol, chain, symbol, 
    date_trunc('hour', timestamp) + INTERVAL '5 min' * (EXTRACT(MINUTE FROM timestamp)::int / 5);

CREATE UNIQUE INDEX IF NOT EXISTS idx_price_history_5min_unique 
    ON price_history_5min(feed_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_price_history_5min_symbol_timestamp 
    ON price_history_5min(symbol, timestamp DESC);

-- 1小时聚合视图
CREATE MATERIALIZED VIEW IF NOT EXISTS price_history_1hour AS
SELECT 
    feed_id,
    protocol,
    chain,
    symbol,
    date_trunc('hour', timestamp) as timestamp,
    (array_agg(price ORDER BY timestamp ASC))[1] as price_open,
    MAX(price) as price_high,
    MIN(price) as price_low,
    (array_agg(price ORDER BY timestamp DESC))[1] as price_close,
    COUNT(*) as sample_count,
    AVG(confidence) as avg_confidence
FROM price_history
WHERE timestamp >= NOW() - INTERVAL '90 days'
GROUP BY feed_id, protocol, chain, symbol, date_trunc('hour', timestamp);

CREATE UNIQUE INDEX IF NOT EXISTS idx_price_history_1hour_unique 
    ON price_history_1hour(feed_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_price_history_1hour_symbol_timestamp 
    ON price_history_1hour(symbol, timestamp DESC);

-- 1天聚合视图
CREATE MATERIALIZED VIEW IF NOT EXISTS price_history_1day AS
SELECT 
    feed_id,
    protocol,
    chain,
    symbol,
    date_trunc('day', timestamp) as timestamp,
    (array_agg(price ORDER BY timestamp ASC))[1] as price_open,
    MAX(price) as price_high,
    MIN(price) as price_low,
    (array_agg(price ORDER BY timestamp DESC))[1] as price_close,
    COUNT(*) as sample_count,
    AVG(confidence) as avg_confidence
FROM price_history
GROUP BY feed_id, protocol, chain, symbol, date_trunc('day', timestamp);

CREATE UNIQUE INDEX IF NOT EXISTS idx_price_history_1day_unique 
    ON price_history_1day(feed_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_price_history_1day_symbol_timestamp 
    ON price_history_1day(symbol, timestamp DESC);

-- ============================================================================
-- 步骤3: 创建当前价格快照视图（替代 unified_price_feeds）
-- ============================================================================

CREATE OR REPLACE VIEW current_price_feeds AS
SELECT DISTINCT ON (feed_id)
    id,
    feed_id,
    protocol,
    chain,
    symbol,
    base_asset,
    quote_asset,
    price,
    price_raw,
    decimals,
    timestamp,
    block_number,
    confidence,
    sources,
    is_stale,
    staleness_seconds,
    tx_hash,
    log_index,
    created_at
FROM price_history
ORDER BY feed_id, timestamp DESC;

-- ============================================================================
-- 步骤4: 创建价格更新事件表（替代 unified_price_updates）
-- ============================================================================

CREATE TABLE IF NOT EXISTS price_update_events (
    id BIGSERIAL PRIMARY KEY,
    feed_id TEXT NOT NULL,
    protocol TEXT NOT NULL,
    chain TEXT NOT NULL,
    symbol TEXT NOT NULL,
    previous_price NUMERIC(36, 18),
    current_price NUMERIC(36, 18) NOT NULL,
    price_change NUMERIC(36, 18),
    price_change_percent NUMERIC(10, 4),
    timestamp TIMESTAMPTZ NOT NULL,
    block_number BIGINT,
    tx_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_update_events_feed ON price_update_events(feed_id);
CREATE INDEX IF NOT EXISTS idx_price_update_events_timestamp ON price_update_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_update_events_feed_timestamp ON price_update_events(feed_id, timestamp DESC);

-- ============================================================================
-- 步骤5: 创建自动刷新物化视图的函数和触发器
-- ============================================================================

-- 刷新1分钟视图的函数
CREATE OR REPLACE FUNCTION refresh_price_history_1min()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY price_history_1min;
END;
$$ LANGUAGE plpgsql;

-- 刷新5分钟视图的函数
CREATE OR REPLACE FUNCTION refresh_price_history_5min()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY price_history_5min;
END;
$$ LANGUAGE plpgsql;

-- 刷新1小时视图的函数
CREATE OR REPLACE FUNCTION refresh_price_history_1hour()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY price_history_1hour;
END;
$$ LANGUAGE plpgsql;

-- 刷新1天视图的函数
CREATE OR REPLACE FUNCTION refresh_price_history_1day()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY price_history_1day;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 步骤6: 创建价格插入触发器（自动记录更新事件）
-- ============================================================================

-- 存储每个feed的最新价格
CREATE TABLE IF NOT EXISTS price_feed_latest (
    feed_id TEXT PRIMARY KEY,
    price NUMERIC(36, 18) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 触发器函数：记录价格更新事件
CREATE OR REPLACE FUNCTION record_price_update_event()
RETURNS TRIGGER AS $$
DECLARE
    prev_price NUMERIC(36, 18);
    price_change NUMERIC(36, 18);
    price_change_percent NUMERIC(10, 4);
BEGIN
    -- 获取之前的价格
    SELECT price INTO prev_price
    FROM price_feed_latest
    WHERE feed_id = NEW.feed_id;

    -- 如果有之前的价格，记录更新事件
    IF prev_price IS NOT NULL AND prev_price != NEW.price THEN
        price_change := NEW.price - prev_price;
        price_change_percent := (price_change / prev_price) * 100;

        INSERT INTO price_update_events (
            feed_id, protocol, chain, symbol,
            previous_price, current_price, price_change, price_change_percent,
            timestamp, block_number, tx_hash
        ) VALUES (
            NEW.feed_id, NEW.protocol, NEW.chain, NEW.symbol,
            prev_price, NEW.price, price_change, price_change_percent,
            NEW.timestamp, NEW.block_number, NEW.tx_hash
        );
    END IF;

    -- 更新最新价格
    INSERT INTO price_feed_latest (feed_id, price, timestamp, updated_at)
    VALUES (NEW.feed_id, NEW.price, NEW.timestamp, NOW())
    ON CONFLICT (feed_id) 
    DO UPDATE SET 
        price = EXCLUDED.price,
        timestamp = EXCLUDED.timestamp,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_record_price_update ON price_history;
CREATE TRIGGER trigger_record_price_update
    AFTER INSERT ON price_history
    FOR EACH ROW
    EXECUTE FUNCTION record_price_update_event();

-- ============================================================================
-- 步骤7: 创建数据清理函数
-- ============================================================================

-- 清理过期数据（保留最近90天的原始数据）
CREATE OR REPLACE FUNCTION cleanup_old_price_history()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    DELETE FROM price_history
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 清理过期更新事件（保留最近30天）
CREATE OR REPLACE FUNCTION cleanup_old_price_events()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    DELETE FROM price_update_events
    WHERE timestamp < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 步骤8: RLS 策略
-- ============================================================================

-- 启用 RLS
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_update_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_feed_latest ENABLE ROW LEVEL SECURITY;

-- 读取策略
CREATE POLICY "Enable read access for all users" ON price_history FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON price_update_events FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON price_feed_latest FOR SELECT USING (true);

-- 写入策略
CREATE POLICY "Enable insert for authenticated users" ON price_history 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON price_update_events 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- 步骤9: 注释
-- ============================================================================

COMMENT ON TABLE price_history IS '统一价格历史表（分区表，替代所有 price_history_* 表）';
COMMENT ON TABLE price_update_events IS '价格更新事件表（替代 unified_price_updates）';
COMMENT ON TABLE price_feed_latest IS '价格feed最新价格缓存表';
COMMENT ON MATERIALIZED VIEW price_history_1min IS '1分钟聚合价格（物化视图）';
COMMENT ON MATERIALIZED VIEW price_history_5min IS '5分钟聚合价格（物化视图）';
COMMENT ON MATERIALIZED VIEW price_history_1hour IS '1小时聚合价格（物化视图）';
COMMENT ON MATERIALIZED VIEW price_history_1day IS '1天聚合价格（物化视图）';
COMMENT ON VIEW current_price_feeds IS '当前价格快照视图（替代 unified_price_feeds）';
