-- Database Performance Optimizations for Oracle Monitor
-- Run these migrations to improve query performance

-- ============================================================================
-- Index Optimizations
-- ============================================================================

-- Indexes for unified_oracle_instances table
CREATE INDEX IF NOT EXISTS idx_oracle_instances_protocol ON unified_oracle_instances(protocol);
CREATE INDEX IF NOT EXISTS idx_oracle_instances_enabled ON unified_oracle_instances(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_oracle_instances_chain ON unified_oracle_instances(chain);
CREATE INDEX IF NOT EXISTS idx_oracle_instances_composite ON unified_oracle_instances(protocol, enabled, chain);

-- Indexes for unified_price_feeds table
CREATE INDEX IF NOT EXISTS idx_price_feeds_timestamp ON unified_price_feeds(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_feeds_instance ON unified_price_feeds(instance_id);
CREATE INDEX IF NOT EXISTS idx_price_feeds_symbol ON unified_price_feeds(symbol);
CREATE INDEX IF NOT EXISTS idx_price_feeds_composite ON unified_price_feeds(instance_id, timestamp DESC);

-- Partial index for recent price feeds (last 24 hours)
CREATE INDEX IF NOT EXISTS idx_price_feeds_recent ON unified_price_feeds(timestamp) 
WHERE timestamp > NOW() - INTERVAL '24 hours';

-- Indexes for unified_alerts table
CREATE INDEX IF NOT EXISTS idx_alerts_status ON unified_alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON unified_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_protocol ON unified_alerts(protocol);
CREATE INDEX IF NOT EXISTS idx_alerts_composite ON unified_alerts(status, created_at DESC);

-- Partial index for open alerts
CREATE INDEX IF NOT EXISTS idx_alerts_open ON unified_alerts(status, severity) 
WHERE status = 'open';

-- Indexes for cross_oracle_comparisons table
CREATE INDEX IF NOT EXISTS idx_comparisons_timestamp ON cross_oracle_comparisons(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_comparisons_symbol ON cross_oracle_comparisons(symbol);
CREATE INDEX IF NOT EXISTS idx_comparisons_composite ON cross_oracle_comparisons(symbol, timestamp DESC);

-- Partial index for recent comparisons
CREATE INDEX IF NOT EXISTS idx_comparisons_recent ON cross_oracle_comparisons(timestamp) 
WHERE timestamp > NOW() - INTERVAL '1 hour';

-- Indexes for unified_sync_state table
CREATE INDEX IF NOT EXISTS idx_sync_state_instance ON unified_sync_state(instance_id);
CREATE INDEX IF NOT EXISTS idx_sync_state_status ON unified_sync_state(status);
CREATE INDEX IF NOT EXISTS idx_sync_state_composite ON unified_sync_state(instance_id, status);

-- Indexes for uma assertions
CREATE INDEX IF NOT EXISTS idx_assertions_status ON uma_assertions(status);
CREATE INDEX IF NOT EXISTS idx_assertions_created_at ON uma_assertions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assertions_asserter ON uma_assertions(asserter);

-- Indexes for uma disputes
CREATE INDEX IF NOT EXISTS idx_disputes_status ON uma_disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON uma_disputes(created_at DESC);

-- ============================================================================
-- Materialized Views for Common Queries
-- ============================================================================

-- Materialized view for protocol statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_protocol_stats AS
SELECT 
    p.id as protocol,
    p.name,
    p.supported_chains as supported_chains,
    COUNT(DISTINCT i.id) as total_feeds,
    AVG(CASE 
        WHEN s.status = 'healthy' THEN 100 
        WHEN s.status = 'lagging' THEN 80 
        WHEN s.status = 'error' THEN 0 
        ELSE 50 
    END) as uptime,
    AVG(s.avg_sync_duration_ms) as avg_latency,
    CASE 
        WHEN COUNT(CASE WHEN s.status = 'error' THEN 1 END) > 0 THEN 'down'
        WHEN COUNT(CASE WHEN s.status = 'lagging' THEN 1 END) > 0 THEN 'degraded'
        ELSE 'healthy'
    END as status
FROM oracle_protocols_info p
LEFT JOIN unified_oracle_instances i ON p.id = i.protocol AND i.enabled = true
LEFT JOIN unified_sync_state s ON i.id = s.instance_id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.supported_chains;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_protocol_stats_protocol ON mv_protocol_stats(protocol);

-- Materialized view for dashboard statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_stats AS
SELECT 
    (SELECT COUNT(DISTINCT protocol) FROM unified_oracle_instances WHERE enabled = true) as total_protocols,
    (SELECT COUNT(*) FROM unified_price_feeds WHERE timestamp > NOW() - INTERVAL '5 minutes') as total_feeds,
    (SELECT COUNT(*) FROM unified_alerts WHERE status = 'open') as active_alerts,
    (SELECT AVG(max_deviation_percent) FROM cross_oracle_comparisons WHERE timestamp > NOW() - INTERVAL '1 hour') as avg_deviation;

-- ============================================================================
-- Function to refresh materialized views
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_protocol_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Partitioning for large tables (optional, for high volume)
-- ============================================================================

-- Partition unified_price_feeds by month (if table grows large)
-- Note: This requires creating a new table and migrating data
/*
CREATE TABLE unified_price_feeds_partitioned (
    LIKE unified_price_feeds INCLUDING ALL
) PARTITION BY RANGE (timestamp);

-- Create partitions for current and next month
CREATE TABLE unified_price_feeds_y2024m01 PARTITION OF unified_price_feeds_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE unified_price_feeds_y2024m02 PARTITION OF unified_price_feeds_partitioned
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
*/

-- ============================================================================
-- Query Optimization Hints
-- ============================================================================

-- Enable parallel query execution
SET max_parallel_workers_per_gather = 4;
SET parallel_tuple_cost = 0.1;
SET parallel_setup_cost = 100;

-- Optimize for read-heavy workload
SET random_page_cost = 1.1;  -- Lower for SSD storage
SET effective_cache_size = '4GB';
SET work_mem = '256MB';

-- ============================================================================
-- Connection Pool Optimization
-- ============================================================================

-- Increase max connections (adjust based on your server capacity)
-- ALTER SYSTEM SET max_connections = 200;

-- Optimize shared buffers (typically 25% of RAM)
-- ALTER SYSTEM SET shared_buffers = '2GB';

-- Optimize WAL settings for write performance
-- ALTER SYSTEM SET wal_buffers = '64MB';
-- ALTER SYSTEM SET checkpoint_completion_target = 0.9;
-- ALTER SYSTEM SET max_wal_size = '4GB';

-- Apply changes
-- SELECT pg_reload_conf();
