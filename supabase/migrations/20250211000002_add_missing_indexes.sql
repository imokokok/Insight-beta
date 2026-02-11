-- Migration: Add Missing Indexes for Unified Tables
-- 补充统一预言机表的缺失索引，与 dbIndexes.ts 保持一致

-- ============================================================================
-- Unified Price Feeds - 统一喂价表索引
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_unified_price_feeds_instance ON unified_price_feeds(instance_id);
CREATE INDEX IF NOT EXISTS idx_unified_price_feeds_protocol ON unified_price_feeds(protocol);
CREATE INDEX IF NOT EXISTS idx_unified_price_feeds_chain ON unified_price_feeds(chain);
CREATE INDEX IF NOT EXISTS idx_unified_price_feeds_symbol ON unified_price_feeds(symbol);
CREATE INDEX IF NOT EXISTS idx_unified_price_feeds_timestamp ON unified_price_feeds(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_unified_price_feeds_instance_symbol ON unified_price_feeds(instance_id, symbol);
CREATE INDEX IF NOT EXISTS idx_unified_price_feeds_symbol_timestamp ON unified_price_feeds(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_unified_price_feeds_protocol_chain_symbol ON unified_price_feeds(protocol, chain, symbol);
CREATE INDEX IF NOT EXISTS idx_unified_price_feeds_is_stale ON unified_price_feeds(is_stale);

COMMENT ON INDEX idx_unified_price_feeds_instance IS 'Filter price feeds by instance';
COMMENT ON INDEX idx_unified_price_feeds_protocol IS 'Filter price feeds by protocol';
COMMENT ON INDEX idx_unified_price_feeds_chain IS 'Filter price feeds by chain';
COMMENT ON INDEX idx_unified_price_feeds_symbol IS 'Filter price feeds by symbol';
COMMENT ON INDEX idx_unified_price_feeds_timestamp IS 'Time-based price feed queries';
COMMENT ON INDEX idx_unified_price_feeds_instance_symbol IS 'Composite index for instance and symbol queries';
COMMENT ON INDEX idx_unified_price_feeds_symbol_timestamp IS 'Composite index for symbol time-series queries';
COMMENT ON INDEX idx_unified_price_feeds_protocol_chain_symbol IS 'Composite index for protocol, chain, and symbol combination queries';
COMMENT ON INDEX idx_unified_price_feeds_is_stale IS 'Filter stale price feeds';

-- ============================================================================
-- Cross Oracle Comparisons - 跨预言机比较表索引
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_cross_oracle_comparisons_symbol ON cross_oracle_comparisons(symbol);
CREATE INDEX IF NOT EXISTS idx_cross_oracle_comparisons_timestamp ON cross_oracle_comparisons(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cross_oracle_comparisons_symbol_timestamp ON cross_oracle_comparisons(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cross_oracle_comparisons_base_quote ON cross_oracle_comparisons(base_asset, quote_asset);

COMMENT ON INDEX idx_cross_oracle_comparisons_symbol IS 'Filter comparisons by symbol';
COMMENT ON INDEX idx_cross_oracle_comparisons_timestamp IS 'Time-based comparison queries';
COMMENT ON INDEX idx_cross_oracle_comparisons_symbol_timestamp IS 'Composite index for symbol time-series comparison queries';
COMMENT ON INDEX idx_cross_oracle_comparisons_base_quote IS 'Filter comparisons by asset pair';

-- ============================================================================
-- Unified Price Updates - 统一价格更新历史表索引
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_unified_price_updates_feed ON unified_price_updates(feed_id);
CREATE INDEX IF NOT EXISTS idx_unified_price_updates_instance ON unified_price_updates(instance_id);
CREATE INDEX IF NOT EXISTS idx_unified_price_updates_timestamp ON unified_price_updates(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_unified_price_updates_feed_timestamp ON unified_price_updates(feed_id, timestamp DESC);

COMMENT ON INDEX idx_unified_price_updates_feed IS 'Filter price updates by feed';
COMMENT ON INDEX idx_unified_price_updates_instance IS 'Filter price updates by instance';
COMMENT ON INDEX idx_unified_price_updates_timestamp IS 'Time-based price update queries';
COMMENT ON INDEX idx_unified_price_updates_feed_timestamp IS 'Composite index for feed time-series queries';

-- ============================================================================
-- Unified Assertions - 统一断言表索引
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_unified_assertions_instance ON unified_assertions(instance_id);
CREATE INDEX IF NOT EXISTS idx_unified_assertions_protocol ON unified_assertions(protocol);
CREATE INDEX IF NOT EXISTS idx_unified_assertions_chain ON unified_assertions(chain);
CREATE INDEX IF NOT EXISTS idx_unified_assertions_status ON unified_assertions(status);
CREATE INDEX IF NOT EXISTS idx_unified_assertions_proposer ON unified_assertions(proposer);
CREATE INDEX IF NOT EXISTS idx_unified_assertions_proposed_at ON unified_assertions(proposed_at DESC);
CREATE INDEX IF NOT EXISTS idx_unified_assertions_status_proposed ON unified_assertions(status, proposed_at DESC);

COMMENT ON INDEX idx_unified_assertions_instance IS 'Filter assertions by instance';
COMMENT ON INDEX idx_unified_assertions_protocol IS 'Filter assertions by protocol';
COMMENT ON INDEX idx_unified_assertions_chain IS 'Filter assertions by chain';
COMMENT ON INDEX idx_unified_assertions_status IS 'Filter assertions by status';
COMMENT ON INDEX idx_unified_assertions_proposer IS 'Filter assertions by proposer';
COMMENT ON INDEX idx_unified_assertions_proposed_at IS 'Time-based assertion queries';
COMMENT ON INDEX idx_unified_assertions_status_proposed IS 'Composite index for status and time queries';

-- ============================================================================
-- Unified Disputes - 统一争议表索引
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_unified_disputes_instance ON unified_disputes(instance_id);
CREATE INDEX IF NOT EXISTS idx_unified_disputes_assertion ON unified_disputes(assertion_id);
CREATE INDEX IF NOT EXISTS idx_unified_disputes_status ON unified_disputes(status);
CREATE INDEX IF NOT EXISTS idx_unified_disputes_disputer ON unified_disputes(disputer);
CREATE INDEX IF NOT EXISTS idx_unified_disputes_disputed_at ON unified_disputes(disputed_at DESC);

COMMENT ON INDEX idx_unified_disputes_instance IS 'Filter disputes by instance';
COMMENT ON INDEX idx_unified_disputes_assertion IS 'Filter disputes by assertion';
COMMENT ON INDEX idx_unified_disputes_status IS 'Filter disputes by status';
COMMENT ON INDEX idx_unified_disputes_disputer IS 'Filter disputes by disputer';
COMMENT ON INDEX idx_unified_disputes_disputed_at IS 'Time-based dispute queries';

-- ============================================================================
-- Unified Oracle Instances - 统一预言机实例表索引
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_unified_oracle_instances_protocol ON unified_oracle_instances(protocol);
CREATE INDEX IF NOT EXISTS idx_unified_oracle_instances_chain ON unified_oracle_instances(chain);
CREATE INDEX IF NOT EXISTS idx_unified_oracle_instances_enabled ON unified_oracle_instances(enabled);
CREATE INDEX IF NOT EXISTS idx_unified_oracle_instances_protocol_chain ON unified_oracle_instances(protocol, chain);
CREATE INDEX IF NOT EXISTS idx_unified_oracle_instances_created_at ON unified_oracle_instances(created_at DESC);

COMMENT ON INDEX idx_unified_oracle_instances_protocol IS 'Filter instances by protocol';
COMMENT ON INDEX idx_unified_oracle_instances_chain IS 'Filter instances by chain';
COMMENT ON INDEX idx_unified_oracle_instances_enabled IS 'Filter enabled instances';
COMMENT ON INDEX idx_unified_oracle_instances_protocol_chain IS 'Composite index for protocol and chain queries';
COMMENT ON INDEX idx_unified_oracle_instances_created_at IS 'Time-based instance queries';

-- ============================================================================
-- Unified Statistics - 统一统计表索引
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_unified_statistics_instance ON unified_statistics(instance_id);
CREATE INDEX IF NOT EXISTS idx_unified_statistics_protocol ON unified_statistics(protocol);
CREATE INDEX IF NOT EXISTS idx_unified_statistics_hour ON unified_statistics(hour DESC);
CREATE INDEX IF NOT EXISTS idx_unified_statistics_instance_hour ON unified_statistics(instance_id, hour DESC);

COMMENT ON INDEX idx_unified_statistics_instance IS 'Filter statistics by instance';
COMMENT ON INDEX idx_unified_statistics_protocol IS 'Filter statistics by protocol';
COMMENT ON INDEX idx_unified_statistics_hour IS 'Time-based statistics queries';
COMMENT ON INDEX idx_unified_statistics_instance_hour IS 'Composite index for instance time-series queries';

-- ============================================================================
-- Unified Sync State - 统一同步状态表索引
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_unified_sync_state_protocol ON unified_sync_state(protocol);
CREATE INDEX IF NOT EXISTS idx_unified_sync_state_status ON unified_sync_state(status);
CREATE INDEX IF NOT EXISTS idx_unified_sync_state_updated_at ON unified_sync_state(updated_at DESC);

COMMENT ON INDEX idx_unified_sync_state_protocol IS 'Filter sync state by protocol';
COMMENT ON INDEX idx_unified_sync_state_status IS 'Filter sync state by status';
COMMENT ON INDEX idx_unified_sync_state_updated_at IS 'Time-based sync state queries';
