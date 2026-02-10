-- ============================================================================
-- Cache Table for Price Aggregation
-- 替代 Redis 的 PostgreSQL 缓存方案
-- ============================================================================

-- 创建缓存表
CREATE TABLE IF NOT EXISTS cache_store (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建过期时间索引（用于快速清理）
CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON cache_store(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_created_at ON cache_store(created_at DESC);

-- 创建自动清理过期缓存的函数
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM cache_store
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 创建获取缓存的函数（自动检查过期）
CREATE OR REPLACE FUNCTION get_cache(p_key TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT value INTO result
    FROM cache_store
    WHERE key = p_key
      AND expires_at > NOW();
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 创建设置缓存的函数
CREATE OR REPLACE FUNCTION set_cache(
    p_key TEXT,
    p_value JSONB,
    p_ttl_seconds INTEGER DEFAULT 300
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO cache_store (key, value, expires_at)
    VALUES (
        p_key,
        p_value,
        NOW() + INTERVAL '1 second' * p_ttl_seconds
    )
    ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 创建批量获取缓存的函数
CREATE OR REPLACE FUNCTION get_cache_batch(p_keys TEXT[])
RETURNS TABLE (
    key TEXT,
    value JSONB,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT c.key, c.value, c.expires_at
    FROM cache_store c
    WHERE c.key = ANY(p_keys)
      AND c.expires_at > NOW();
END;
$$ LANGUAGE plpgsql;

-- 创建缓存统计视图
CREATE OR REPLACE VIEW cache_stats AS
SELECT
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE expires_at > NOW()) as active_entries,
    COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_entries,
    pg_size_pretty(pg_total_relation_size('cache_store')) as total_size
FROM cache_store;

-- 添加 RLS 策略
ALTER TABLE cache_store ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" 
ON cache_store FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable write access for authenticated users" 
ON cache_store FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 注释
COMMENT ON TABLE cache_store IS '通用缓存表，用于替代 Redis';
COMMENT ON FUNCTION get_cache IS '获取缓存值，自动过滤过期数据';
COMMENT ON FUNCTION set_cache IS '设置缓存值，支持 TTL';
COMMENT ON FUNCTION cleanup_expired_cache IS '清理过期缓存，返回删除数量';
