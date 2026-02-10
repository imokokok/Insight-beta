-- Migration: Migrate Prisma Schema to Supabase SQL
-- 将 Prisma Schema 中的所有表迁移到 SQL

-- ============================================================================
-- 价格历史数据表
-- ============================================================================

-- 原始价格历史
CREATE TABLE IF NOT EXISTS price_history_raw (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL,
    protocol VARCHAR(50) NOT NULL,
    chain VARCHAR(50) NOT NULL,
    price DECIMAL(36, 18) NOT NULL,
    price_raw VARCHAR(78) NOT NULL,
    decimals INTEGER DEFAULT 8,
    timestamp TIMESTAMPTZ NOT NULL,
    block_number BIGINT,
    confidence DECIMAL(5, 4),
    volume_24h DECIMAL(36, 18),
    change_24h DECIMAL(10, 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_raw_symbol_timestamp ON price_history_raw(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_raw_protocol_timestamp ON price_history_raw(protocol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_raw_chain_timestamp ON price_history_raw(chain, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_raw_timestamp ON price_history_raw(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_raw_symbol_protocol_chain_timestamp ON price_history_raw(symbol, protocol, chain, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_raw_protocol_chain_timestamp ON price_history_raw(protocol, chain, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_raw_symbol_protocol_timestamp ON price_history_raw(symbol, protocol, timestamp DESC);

-- 1分钟聚合价格历史
CREATE TABLE IF NOT EXISTS price_history_min1 (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL,
    protocol VARCHAR(50) NOT NULL,
    chain VARCHAR(50) NOT NULL,
    price_open DECIMAL(36, 18) NOT NULL,
    price_high DECIMAL(36, 18) NOT NULL,
    price_low DECIMAL(36, 18) NOT NULL,
    price_close DECIMAL(36, 18) NOT NULL,
    volume BIGINT DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL,
    sample_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(symbol, protocol, chain, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_price_history_min1_symbol_timestamp ON price_history_min1(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_min1_timestamp ON price_history_min1(timestamp DESC);

-- 5分钟聚合价格历史
CREATE TABLE IF NOT EXISTS price_history_min5 (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL,
    protocol VARCHAR(50) NOT NULL,
    chain VARCHAR(50) NOT NULL,
    price_open DECIMAL(36, 18) NOT NULL,
    price_high DECIMAL(36, 18) NOT NULL,
    price_low DECIMAL(36, 18) NOT NULL,
    price_close DECIMAL(36, 18) NOT NULL,
    volume BIGINT DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL,
    sample_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(symbol, protocol, chain, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_price_history_min5_symbol_timestamp ON price_history_min5(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_min5_timestamp ON price_history_min5(timestamp DESC);

-- 1小时聚合价格历史
CREATE TABLE IF NOT EXISTS price_history_hour1 (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL,
    protocol VARCHAR(50) NOT NULL,
    chain VARCHAR(50) NOT NULL,
    price_open DECIMAL(36, 18) NOT NULL,
    price_high DECIMAL(36, 18) NOT NULL,
    price_low DECIMAL(36, 18) NOT NULL,
    price_close DECIMAL(36, 18) NOT NULL,
    volume BIGINT DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL,
    sample_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(symbol, protocol, chain, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_price_history_hour1_symbol_timestamp ON price_history_hour1(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_hour1_timestamp ON price_history_hour1(timestamp DESC);

-- 1天聚合价格历史
CREATE TABLE IF NOT EXISTS price_history_day1 (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL,
    protocol VARCHAR(50) NOT NULL,
    chain VARCHAR(50) NOT NULL,
    price_open DECIMAL(36, 18) NOT NULL,
    price_high DECIMAL(36, 18) NOT NULL,
    price_low DECIMAL(36, 18) NOT NULL,
    price_close DECIMAL(36, 18) NOT NULL,
    volume BIGINT DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL,
    sample_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(symbol, protocol, chain, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_price_history_day1_symbol_timestamp ON price_history_day1(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_day1_timestamp ON price_history_day1(timestamp DESC);

-- ============================================================================
-- Solana 数据表
-- ============================================================================

-- Solana 价格喂价
CREATE TABLE IF NOT EXISTS solana_price_feeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(36, 18) NOT NULL,
    confidence DECIMAL(5, 4) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    slot BIGINT NOT NULL,
    signature VARCHAR(100) NOT NULL,
    source VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solana_price_feeds_symbol ON solana_price_feeds(symbol);
CREATE INDEX IF NOT EXISTS idx_solana_price_feeds_timestamp ON solana_price_feeds(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_solana_price_feeds_status ON solana_price_feeds(status);

-- Solana 价格历史
CREATE TABLE IF NOT EXISTS solana_price_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feed_id UUID NOT NULL REFERENCES solana_price_feeds(id) ON DELETE CASCADE,
    price DECIMAL(36, 18) NOT NULL,
    confidence DECIMAL(5, 4) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    slot BIGINT NOT NULL,
    signature VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solana_price_histories_feed_timestamp ON solana_price_histories(feed_id, timestamp DESC);

-- Solana 预言机实例
CREATE TABLE IF NOT EXISTS solana_oracle_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    program_id VARCHAR(50) NOT NULL,
    cluster VARCHAR(20) NOT NULL,
    rpc_url VARCHAR(200) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Solana 同步状态
CREATE TABLE IF NOT EXISTS solana_sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id TEXT NOT NULL,
    feed_symbol VARCHAR(50) NOT NULL,
    last_slot BIGINT NOT NULL,
    last_signature VARCHAR(100) NOT NULL,
    last_timestamp TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(instance_id, feed_symbol)
);

-- Solana 告警
CREATE TABLE IF NOT EXISTS solana_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    status VARCHAR(20) DEFAULT 'active',
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solana_alerts_symbol_status ON solana_alerts(symbol, status);
CREATE INDEX IF NOT EXISTS idx_solana_alerts_severity_status ON solana_alerts(severity, status);
CREATE INDEX IF NOT EXISTS idx_solana_alerts_created_at ON solana_alerts(created_at DESC);

-- ============================================================================
-- SLO (Service Level Objective) 数据表
-- ============================================================================

-- SLO 定义
CREATE TABLE IF NOT EXISTS slo_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    protocol VARCHAR(50) NOT NULL,
    chain VARCHAR(50) NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- latency, availability, accuracy, custom
    target_value DECIMAL(10, 4) NOT NULL,
    threshold_value DECIMAL(10, 4) NOT NULL,
    evaluation_window VARCHAR(20) NOT NULL, -- 30d, 7d, 24h
    error_budget_policy VARCHAR(20) DEFAULT 'monthly', -- monthly, weekly, daily
    condition_config JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slo_definitions_protocol_chain ON slo_definitions(protocol, chain);
CREATE INDEX IF NOT EXISTS idx_slo_definitions_metric_type ON slo_definitions(metric_type);
CREATE INDEX IF NOT EXISTS idx_slo_definitions_is_active ON slo_definitions(is_active);

-- SLO 指标
CREATE TABLE IF NOT EXISTS slo_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slo_id UUID NOT NULL REFERENCES slo_definitions(id) ON DELETE CASCADE,
    actual_value DECIMAL(10, 4) NOT NULL,
    target_value DECIMAL(10, 4) NOT NULL,
    is_compliant BOOLEAN DEFAULT true,
    compliance_rate DECIMAL(5, 2),
    total_events INTEGER DEFAULT 0,
    good_events INTEGER DEFAULT 0,
    bad_events INTEGER DEFAULT 0,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slo_metrics_slo_window ON slo_metrics(slo_id, window_start);
CREATE INDEX IF NOT EXISTS idx_slo_metrics_window_end ON slo_metrics(window_end);

-- Error Budget
CREATE TABLE IF NOT EXISTS error_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slo_id UUID NOT NULL REFERENCES slo_definitions(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    total_budget DECIMAL(20, 8) NOT NULL,
    used_budget DECIMAL(20, 8) NOT NULL,
    remaining_budget DECIMAL(20, 8) NOT NULL,
    burn_rate DECIMAL(10, 4),
    projected_depletion TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'healthy', -- healthy, at_risk, exhausted
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_budgets_slo_period ON error_budgets(slo_id, period_start);
CREATE INDEX IF NOT EXISTS idx_error_budgets_status ON error_budgets(status);

-- ============================================================================
-- 事件时间线数据表
-- ============================================================================

-- 事件时间线
CREATE TABLE IF NOT EXISTS event_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL, -- alert_triggered, dispute_created, fix_completed, config_changed, deployment, price_spike
    severity VARCHAR(20) DEFAULT 'info', -- info, warning, error, critical
    title VARCHAR(200) NOT NULL,
    description TEXT,
    protocol VARCHAR(50),
    chain VARCHAR(50),
    symbol VARCHAR(50),
    entity_type VARCHAR(50), -- alert, dispute, assertion, config
    entity_id VARCHAR(100),
    metadata JSONB,
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    parent_event_id UUID,
    related_event_ids UUID[],
    source VARCHAR(50) DEFAULT 'system', -- system, user, api, webhook
    source_user VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_event_timeline_event_type ON event_timeline(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_timeline_protocol_chain ON event_timeline(protocol, chain, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_timeline_symbol ON event_timeline(symbol, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_timeline_entity ON event_timeline(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_event_timeline_severity ON event_timeline(severity, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_timeline_occurred_at ON event_timeline(occurred_at DESC);

-- 部署记录
CREATE TABLE IF NOT EXISTS deployment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(50) NOT NULL,
    environment VARCHAR(50) NOT NULL, -- production, staging, development
    commit_hash VARCHAR(100),
    branch VARCHAR(100),
    changes JSONB,
    affected_services TEXT[],
    status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed, failed, rolled_back
    deployed_by VARCHAR(100),
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deployment_records_environment ON deployment_records(environment, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_deployment_records_status ON deployment_records(status);

-- ============================================================================
-- 触发器：自动更新 updated_at
-- ============================================================================

-- 为所有需要自动更新 updated_at 的表添加触发器
DO $$
BEGIN
    -- solana_price_feeds
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_solana_price_feeds_updated_at') THEN
        CREATE TRIGGER update_solana_price_feeds_updated_at
            BEFORE UPDATE ON solana_price_feeds
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- solana_oracle_instances
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_solana_oracle_instances_updated_at') THEN
        CREATE TRIGGER update_solana_oracle_instances_updated_at
            BEFORE UPDATE ON solana_oracle_instances
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- solana_sync_status
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_solana_sync_status_updated_at') THEN
        CREATE TRIGGER update_solana_sync_status_updated_at
            BEFORE UPDATE ON solana_sync_status
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- slo_definitions
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_slo_definitions_updated_at') THEN
        CREATE TRIGGER update_slo_definitions_updated_at
            BEFORE UPDATE ON slo_definitions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- error_budgets
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_error_budgets_updated_at') THEN
        CREATE TRIGGER update_error_budgets_updated_at
            BEFORE UPDATE ON error_budgets
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- RLS 策略
-- ============================================================================

-- 启用 RLS
ALTER TABLE price_history_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history_min1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history_min5 ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history_hour1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history_day1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE solana_price_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE solana_price_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE solana_oracle_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE solana_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE solana_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE slo_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE slo_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_records ENABLE ROW LEVEL SECURITY;

-- 创建通用读取策略
CREATE POLICY "Enable read access for all users" ON price_history_raw FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON price_history_min1 FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON price_history_min5 FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON price_history_hour1 FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON price_history_day1 FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON solana_price_feeds FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON solana_price_histories FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON solana_oracle_instances FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON solana_sync_status FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON solana_alerts FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON slo_definitions FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON slo_metrics FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON error_budgets FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON event_timeline FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON deployment_records FOR SELECT USING (true);

-- 创建认证用户写入策略
CREATE POLICY "Enable insert for authenticated users" ON price_history_raw FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON price_history_min1 FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON price_history_min5 FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON price_history_hour1 FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON price_history_day1 FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON solana_price_feeds FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON solana_price_feeds FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON solana_price_histories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON solana_oracle_instances FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON solana_oracle_instances FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON solana_sync_status FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON solana_sync_status FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON solana_alerts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON solana_alerts FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON slo_definitions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON slo_definitions FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON slo_metrics FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON error_budgets FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON error_budgets FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON event_timeline FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON deployment_records FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON deployment_records FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================================
-- 注释
-- ============================================================================
COMMENT ON TABLE price_history_raw IS '原始价格历史数据';
COMMENT ON TABLE price_history_min1 IS '1分钟聚合价格历史';
COMMENT ON TABLE price_history_min5 IS '5分钟聚合价格历史';
COMMENT ON TABLE price_history_hour1 IS '1小时聚合价格历史';
COMMENT ON TABLE price_history_day1 IS '1天聚合价格历史';
COMMENT ON TABLE solana_price_feeds IS 'Solana 价格喂价';
COMMENT ON TABLE solana_price_histories IS 'Solana 价格历史';
COMMENT ON TABLE solana_oracle_instances IS 'Solana 预言机实例';
COMMENT ON TABLE solana_sync_status IS 'Solana 同步状态';
COMMENT ON TABLE solana_alerts IS 'Solana 告警';
COMMENT ON TABLE slo_definitions IS 'SLO 定义';
COMMENT ON TABLE slo_metrics IS 'SLO 指标';
COMMENT ON TABLE error_budgets IS 'Error Budget';
COMMENT ON TABLE event_timeline IS '事件时间线';
COMMENT ON TABLE deployment_records IS '部署记录';
