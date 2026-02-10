-- Migration: Create Unified Schema Tables
-- 创建统一预言机监控平台的核心表

-- ============================================================================
-- 核心表：预言机协议信息
-- ============================================================================
CREATE TABLE IF NOT EXISTS oracle_protocols_info (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    website TEXT,
    supported_chains TEXT[] NOT NULL DEFAULT '{}',
    features TEXT[] NOT NULL DEFAULT '{}',
    tvl NUMERIC,
    market_share NUMERIC,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protocols_active ON oracle_protocols_info(is_active);

-- ============================================================================
-- 核心表：统一预言机实例
-- ============================================================================
CREATE TABLE IF NOT EXISTS unified_oracle_instances (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    protocol TEXT NOT NULL,
    chain TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    config JSONB NOT NULL DEFAULT '{}',
    protocol_config JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    total_updates BIGINT DEFAULT 0,
    last_update_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unified_instances_protocol ON unified_oracle_instances(protocol);
CREATE INDEX IF NOT EXISTS idx_unified_instances_chain ON unified_oracle_instances(chain);
CREATE INDEX IF NOT EXISTS idx_unified_instances_enabled ON unified_oracle_instances(enabled);
CREATE INDEX IF NOT EXISTS idx_unified_instances_protocol_chain ON unified_oracle_instances(protocol, chain);
CREATE INDEX IF NOT EXISTS idx_unified_instances_created_at ON unified_oracle_instances(created_at DESC);

-- ============================================================================
-- 核心表：统一价格喂价
-- ============================================================================
CREATE TABLE IF NOT EXISTS unified_price_feeds (
    id TEXT PRIMARY KEY,
    instance_id TEXT NOT NULL REFERENCES unified_oracle_instances(id) ON DELETE CASCADE,
    protocol TEXT NOT NULL,
    chain TEXT NOT NULL,
    symbol TEXT NOT NULL,
    base_asset TEXT NOT NULL,
    quote_asset TEXT NOT NULL,
    price NUMERIC NOT NULL,
    price_raw TEXT NOT NULL,
    decimals INTEGER NOT NULL DEFAULT 8,
    timestamp TIMESTAMPTZ NOT NULL,
    block_number BIGINT,
    confidence NUMERIC,
    sources INTEGER,
    is_stale BOOLEAN DEFAULT false,
    staleness_seconds INTEGER,
    tx_hash TEXT,
    log_index INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_feeds_instance ON unified_price_feeds(instance_id);
CREATE INDEX IF NOT EXISTS idx_price_feeds_protocol ON unified_price_feeds(protocol);
CREATE INDEX IF NOT EXISTS idx_price_feeds_chain ON unified_price_feeds(chain);
CREATE INDEX IF NOT EXISTS idx_price_feeds_symbol ON unified_price_feeds(symbol);
CREATE INDEX IF NOT EXISTS idx_price_feeds_timestamp ON unified_price_feeds(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_feeds_instance_symbol ON unified_price_feeds(instance_id, symbol);
CREATE INDEX IF NOT EXISTS idx_price_feeds_symbol_timestamp ON unified_price_feeds(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_feeds_protocol_chain_symbol ON unified_price_feeds(protocol, chain, symbol);

-- ============================================================================
-- 核心表：统一价格更新历史
-- ============================================================================
CREATE TABLE IF NOT EXISTS unified_price_updates (
    id TEXT PRIMARY KEY,
    feed_id TEXT NOT NULL REFERENCES unified_price_feeds(id) ON DELETE CASCADE,
    instance_id TEXT NOT NULL REFERENCES unified_oracle_instances(id) ON DELETE CASCADE,
    protocol TEXT NOT NULL,
    previous_price NUMERIC NOT NULL,
    current_price NUMERIC NOT NULL,
    price_change NUMERIC NOT NULL,
    price_change_percent NUMERIC NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    block_number BIGINT,
    tx_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_updates_feed ON unified_price_updates(feed_id);
CREATE INDEX IF NOT EXISTS idx_price_updates_instance ON unified_price_updates(instance_id);
CREATE INDEX IF NOT EXISTS idx_price_updates_timestamp ON unified_price_updates(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_updates_feed_timestamp ON unified_price_updates(feed_id, timestamp DESC);

-- ============================================================================
-- 核心表：统一断言数据（兼容 UMA 等乐观预言机）
-- ============================================================================
CREATE TABLE IF NOT EXISTS unified_assertions (
    id TEXT PRIMARY KEY,
    instance_id TEXT NOT NULL REFERENCES unified_oracle_instances(id) ON DELETE CASCADE,
    protocol TEXT NOT NULL,
    chain TEXT NOT NULL,
    identifier TEXT NOT NULL,
    description TEXT,
    proposer TEXT NOT NULL,
    proposed_value TEXT,
    proposed_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active',
    settlement_value TEXT,
    bond_amount NUMERIC,
    bond_token TEXT,
    reward NUMERIC,
    disputed BOOLEAN DEFAULT false,
    disputer TEXT,
    disputed_at TIMESTAMPTZ,
    tx_hash TEXT NOT NULL,
    block_number BIGINT NOT NULL,
    log_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assertions_instance ON unified_assertions(instance_id);
CREATE INDEX IF NOT EXISTS idx_assertions_protocol ON unified_assertions(protocol);
CREATE INDEX IF NOT EXISTS idx_assertions_chain ON unified_assertions(chain);
CREATE INDEX IF NOT EXISTS idx_assertions_status ON unified_assertions(status);
CREATE INDEX IF NOT EXISTS idx_assertions_proposer ON unified_assertions(proposer);
CREATE INDEX IF NOT EXISTS idx_assertions_proposed_at ON unified_assertions(proposed_at DESC);
CREATE INDEX IF NOT EXISTS idx_assertions_status_proposed ON unified_assertions(status, proposed_at DESC);

-- ============================================================================
-- 核心表：统一争议数据
-- ============================================================================
CREATE TABLE IF NOT EXISTS unified_disputes (
    id TEXT PRIMARY KEY,
    instance_id TEXT NOT NULL REFERENCES unified_oracle_instances(id) ON DELETE CASCADE,
    protocol TEXT NOT NULL,
    chain TEXT NOT NULL,
    assertion_id TEXT NOT NULL REFERENCES unified_assertions(id) ON DELETE CASCADE,
    disputer TEXT NOT NULL,
    reason TEXT,
    disputed_at TIMESTAMPTZ NOT NULL,
    voting_ends_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active',
    outcome TEXT,
    votes_for NUMERIC DEFAULT 0,
    votes_against NUMERIC DEFAULT 0,
    total_votes NUMERIC DEFAULT 0,
    dispute_bond NUMERIC,
    tx_hash TEXT NOT NULL,
    block_number BIGINT NOT NULL,
    log_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disputes_instance ON unified_disputes(instance_id);
CREATE INDEX IF NOT EXISTS idx_disputes_assertion ON unified_disputes(assertion_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON unified_disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_disputer ON unified_disputes(disputer);
CREATE INDEX IF NOT EXISTS idx_disputes_disputed_at ON unified_disputes(disputed_at DESC);

-- ============================================================================
-- 核心表：统一同步状态
-- ============================================================================
CREATE TABLE IF NOT EXISTS unified_sync_state (
    instance_id TEXT PRIMARY KEY REFERENCES unified_oracle_instances(id) ON DELETE CASCADE,
    protocol TEXT NOT NULL,
    chain TEXT NOT NULL,
    last_processed_block BIGINT DEFAULT 0,
    latest_block BIGINT,
    safe_block BIGINT,
    lag_blocks BIGINT,
    last_sync_at TIMESTAMPTZ,
    last_sync_duration_ms INTEGER,
    avg_sync_duration_ms INTEGER,
    status TEXT NOT NULL DEFAULT 'healthy',
    consecutive_failures INTEGER DEFAULT 0,
    last_error TEXT,
    last_error_at TIMESTAMPTZ,
    active_rpc_url TEXT,
    rpc_health TEXT DEFAULT 'healthy',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_state_protocol ON unified_sync_state(protocol);
CREATE INDEX IF NOT EXISTS idx_sync_state_status ON unified_sync_state(status);
CREATE INDEX IF NOT EXISTS idx_sync_state_updated_at ON unified_sync_state(updated_at DESC);

-- ============================================================================
-- 核心表：统一统计数据（按小时聚合）
-- ============================================================================
CREATE TABLE IF NOT EXISTS unified_statistics (
    id BIGSERIAL PRIMARY KEY,
    instance_id TEXT NOT NULL REFERENCES unified_oracle_instances(id) ON DELETE CASCADE,
    protocol TEXT NOT NULL,
    chain TEXT NOT NULL,
    hour TIMESTAMPTZ NOT NULL,
    total_updates BIGINT DEFAULT 0,
    avg_price NUMERIC,
    min_price NUMERIC,
    max_price NUMERIC,
    price_volatility NUMERIC,
    total_assertions BIGINT DEFAULT 0,
    active_assertions BIGINT DEFAULT 0,
    disputed_assertions BIGINT DEFAULT 0,
    settled_assertions BIGINT DEFAULT 0,
    total_disputes BIGINT DEFAULT 0,
    resolved_disputes BIGINT DEFAULT 0,
    avg_response_time_ms INTEGER,
    uptime_percent NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_statistics_instance ON unified_statistics(instance_id);
CREATE INDEX IF NOT EXISTS idx_statistics_protocol ON unified_statistics(protocol);
CREATE INDEX IF NOT EXISTS idx_statistics_hour ON unified_statistics(hour DESC);
CREATE INDEX IF NOT EXISTS idx_statistics_instance_hour ON unified_statistics(instance_id, hour DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_statistics_unique_instance_hour 
ON unified_statistics(instance_id, hour);

-- ============================================================================
-- 核心表：跨预言机对比数据
-- ============================================================================
CREATE TABLE IF NOT EXISTS cross_oracle_comparisons (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    base_asset TEXT NOT NULL,
    quote_asset TEXT NOT NULL,
    avg_price NUMERIC NOT NULL,
    median_price NUMERIC NOT NULL,
    min_price NUMERIC NOT NULL,
    max_price NUMERIC NOT NULL,
    price_range NUMERIC NOT NULL,
    price_range_percent NUMERIC NOT NULL,
    max_deviation NUMERIC NOT NULL,
    max_deviation_percent NUMERIC NOT NULL,
    outlier_protocols TEXT[],
    recommended_price NUMERIC NOT NULL,
    recommendation_source TEXT,
    participating_protocols TEXT[],
    participating_instances TEXT[],
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comparisons_symbol ON cross_oracle_comparisons(symbol);
CREATE INDEX IF NOT EXISTS idx_comparisons_timestamp ON cross_oracle_comparisons(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_comparisons_symbol_timestamp ON cross_oracle_comparisons(symbol, timestamp DESC);

-- ============================================================================
-- 核心表：统一告警规则
-- ============================================================================
CREATE TABLE IF NOT EXISTS unified_alert_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    event TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'warning',
    protocols TEXT[],
    chains TEXT[],
    instances TEXT[],
    symbols TEXT[],
    params JSONB DEFAULT '{}',
    channels TEXT[] NOT NULL DEFAULT '{}',
    recipients TEXT[],
    cooldown_minutes INTEGER DEFAULT 60,
    max_notifications_per_hour INTEGER DEFAULT 10,
    runbook TEXT,
    owner TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON unified_alert_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_alert_rules_event ON unified_alert_rules(event);

-- ============================================================================
-- 核心表：统一告警记录
-- ============================================================================
CREATE TABLE IF NOT EXISTS unified_alerts (
    id TEXT PRIMARY KEY,
    rule_id TEXT REFERENCES unified_alert_rules(id) ON DELETE SET NULL,
    event TEXT NOT NULL,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    protocol TEXT,
    chain TEXT,
    instance_id TEXT,
    symbol TEXT,
    assertion_id TEXT,
    dispute_id TEXT,
    context JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'open',
    acknowledged_by TEXT,
    acknowledged_at TIMESTAMPTZ,
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,
    occurrences INTEGER DEFAULT 1,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON unified_alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON unified_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_protocol ON unified_alerts(protocol);
CREATE INDEX IF NOT EXISTS idx_alerts_instance ON unified_alerts(instance_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON unified_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_status_created ON unified_alerts(status, created_at DESC);

-- ============================================================================
-- 核心表：配置模板
-- ============================================================================
CREATE TABLE IF NOT EXISTS unified_config_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    protocol TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    supported_chains TEXT[] NOT NULL,
    requirements TEXT[],
    is_default BOOLEAN DEFAULT false,
    is_official BOOLEAN DEFAULT false,
    author TEXT,
    usage_count INTEGER DEFAULT 0,
    rating NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_protocol ON unified_config_templates(protocol);
CREATE INDEX IF NOT EXISTS idx_templates_default ON unified_config_templates(is_default);
CREATE INDEX IF NOT EXISTS idx_templates_official ON unified_config_templates(is_official);

-- ============================================================================
-- 核心表：健康检查
-- ============================================================================
CREATE TABLE IF NOT EXISTS oracle_health_checks (
    id SERIAL PRIMARY KEY,
    protocol TEXT NOT NULL,
    chain TEXT NOT NULL,
    feed_id TEXT NOT NULL,
    healthy BOOLEAN NOT NULL DEFAULT false,
    last_update TIMESTAMPTZ,
    staleness_seconds INTEGER DEFAULT 0,
    issues JSONB DEFAULT '[]'::jsonb,
    checked_at TIMESTAMPTZ DEFAULT NOW(),
    latency_ms INTEGER DEFAULT 0,
    active_assertions INTEGER,
    active_disputes INTEGER,
    total_bonded TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(protocol, chain, feed_id)
);

CREATE INDEX IF NOT EXISTS idx_health_checks_protocol ON oracle_health_checks(protocol);
CREATE INDEX IF NOT EXISTS idx_health_checks_chain ON oracle_health_checks(chain);
CREATE INDEX IF NOT EXISTS idx_health_checks_healthy ON oracle_health_checks(healthy);
CREATE INDEX IF NOT EXISTS idx_health_checks_checked_at ON oracle_health_checks(checked_at);
CREATE INDEX IF NOT EXISTS idx_health_checks_protocol_chain ON oracle_health_checks(protocol, chain);

-- ============================================================================
-- 核心表：网络指标
-- ============================================================================
CREATE TABLE IF NOT EXISTS oracle_network_metrics (
    id SERIAL PRIMARY KEY,
    chain TEXT NOT NULL,
    gas_price_gwei NUMERIC(20, 4),
    gas_price_fast_gwei NUMERIC(20, 4),
    gas_price_standard_gwei NUMERIC(20, 4),
    gas_price_slow_gwei NUMERIC(20, 4),
    block_number BIGINT,
    block_timestamp TIMESTAMPTZ,
    network_congestion NUMERIC(5, 2),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_network_metrics_chain ON oracle_network_metrics(chain);
CREATE INDEX IF NOT EXISTS idx_network_metrics_timestamp ON oracle_network_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_network_metrics_chain_timestamp ON oracle_network_metrics(chain, timestamp);

-- ============================================================================
-- 核心表：流动性数据
-- ============================================================================
CREATE TABLE IF NOT EXISTS oracle_liquidity (
    id SERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    chain TEXT NOT NULL,
    liquidity_usd NUMERIC(30, 2),
    liquidity_token NUMERIC(30, 8),
    volume_24h_usd NUMERIC(30, 2),
    dex_name TEXT,
    pool_address TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_liquidity_symbol ON oracle_liquidity(symbol);
CREATE INDEX IF NOT EXISTS idx_liquidity_chain ON oracle_liquidity(chain);
CREATE INDEX IF NOT EXISTS idx_liquidity_timestamp ON oracle_liquidity(timestamp);
CREATE INDEX IF NOT EXISTS idx_liquidity_symbol_chain ON oracle_liquidity(symbol, chain);

-- ============================================================================
-- 触发器：自动更新 updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要自动更新 updated_at 的表添加触发器
DO $$
BEGIN
    -- unified_oracle_instances
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_unified_oracle_instances_updated_at') THEN
        CREATE TRIGGER update_unified_oracle_instances_updated_at
            BEFORE UPDATE ON unified_oracle_instances
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- unified_assertions
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_unified_assertions_updated_at') THEN
        CREATE TRIGGER update_unified_assertions_updated_at
            BEFORE UPDATE ON unified_assertions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- unified_disputes
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_unified_disputes_updated_at') THEN
        CREATE TRIGGER update_unified_disputes_updated_at
            BEFORE UPDATE ON unified_disputes
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- unified_alert_rules
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_unified_alert_rules_updated_at') THEN
        CREATE TRIGGER update_unified_alert_rules_updated_at
            BEFORE UPDATE ON unified_alert_rules
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- unified_alerts
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_unified_alerts_updated_at') THEN
        CREATE TRIGGER update_unified_alerts_updated_at
            BEFORE UPDATE ON unified_alerts
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- unified_config_templates
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_unified_config_templates_updated_at') THEN
        CREATE TRIGGER update_unified_config_templates_updated_at
            BEFORE UPDATE ON unified_config_templates
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- oracle_protocols_info
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_oracle_protocols_info_updated_at') THEN
        CREATE TRIGGER update_oracle_protocols_info_updated_at
            BEFORE UPDATE ON oracle_protocols_info
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- oracle_health_checks
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_oracle_health_checks_updated_at') THEN
        CREATE TRIGGER update_oracle_health_checks_updated_at
            BEFORE UPDATE ON oracle_health_checks
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- RLS 策略
-- ============================================================================
-- 启用 RLS
ALTER TABLE oracle_protocols_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_oracle_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_price_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_price_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_assertions ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_oracle_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_config_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_network_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_liquidity ENABLE ROW LEVEL SECURITY;

-- 创建通用读取策略
CREATE POLICY "Enable read access for all users" ON oracle_protocols_info FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON unified_oracle_instances FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON unified_price_feeds FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON unified_price_updates FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON unified_assertions FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON unified_disputes FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON unified_sync_state FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON unified_statistics FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON cross_oracle_comparisons FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON unified_alert_rules FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON unified_alerts FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON unified_config_templates FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON oracle_health_checks FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON oracle_network_metrics FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON oracle_liquidity FOR SELECT USING (true);

-- 创建认证用户写入策略
CREATE POLICY "Enable insert for authenticated users" ON unified_oracle_instances FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON unified_oracle_instances FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON unified_price_feeds FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON unified_price_updates FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON unified_assertions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON unified_assertions FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON unified_disputes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON unified_disputes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON unified_sync_state FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON unified_sync_state FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON unified_statistics FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON cross_oracle_comparisons FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON unified_alert_rules FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON unified_alert_rules FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON unified_alerts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON unified_alerts FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON unified_config_templates FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON unified_config_templates FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON oracle_health_checks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON oracle_health_checks FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON oracle_network_metrics FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON oracle_liquidity FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- 注释
-- ============================================================================
COMMENT ON TABLE oracle_protocols_info IS '预言机协议信息表';
COMMENT ON TABLE unified_oracle_instances IS '统一预言机实例表';
COMMENT ON TABLE unified_price_feeds IS '统一价格喂价表';
COMMENT ON TABLE unified_price_updates IS '统一价格更新历史表';
COMMENT ON TABLE unified_assertions IS '统一断言表（兼容 UMA 等乐观预言机）';
COMMENT ON TABLE unified_disputes IS '统一争议表';
COMMENT ON TABLE unified_sync_state IS '统一同步状态表';
COMMENT ON TABLE unified_statistics IS '统一统计表（按小时聚合）';
COMMENT ON TABLE cross_oracle_comparisons IS '跨预言机价格对比表';
COMMENT ON TABLE unified_alert_rules IS '统一告警规则表';
COMMENT ON TABLE unified_alerts IS '统一告警记录表';
COMMENT ON TABLE unified_config_templates IS '统一配置模板表';
COMMENT ON TABLE oracle_health_checks IS '预言机健康检查表';
COMMENT ON TABLE oracle_network_metrics IS '网络指标表（Gas价格等）';
COMMENT ON TABLE oracle_liquidity IS '流动性数据表';
