-- Migration: Cross-Chain Analysis Tables
-- 创建跨链价格分析所需的表

-- ============================================================================
-- 核心表：跨链价格对比历史
-- ============================================================================
CREATE TABLE IF NOT EXISTS cross_chain_comparisons (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    base_asset TEXT NOT NULL,
    quote_asset TEXT NOT NULL DEFAULT 'USD',
    avg_price NUMERIC NOT NULL,
    median_price NUMERIC NOT NULL,
    min_price NUMERIC NOT NULL,
    max_price NUMERIC NOT NULL,
    min_chain TEXT NOT NULL,
    max_chain TEXT NOT NULL,
    price_range NUMERIC NOT NULL,
    price_range_percent NUMERIC NOT NULL,
    participating_chains TEXT[] NOT NULL DEFAULT '{}',
    participating_protocols TEXT[] NOT NULL DEFAULT '{}',
    outlier_chains TEXT[] NOT NULL DEFAULT '{}',
    most_reliable_chain TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cross_chain_symbol ON cross_chain_comparisons(symbol);
CREATE INDEX IF NOT EXISTS idx_cross_chain_timestamp ON cross_chain_comparisons(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cross_chain_symbol_timestamp ON cross_chain_comparisons(symbol, timestamp DESC);

COMMENT ON TABLE cross_chain_comparisons IS '跨链价格对比历史表';

-- ============================================================================
-- 核心表：跨链价格偏差记录（用于数据质量监控，非交易建议）
-- ============================================================================
CREATE TABLE IF NOT EXISTS cross_chain_arbitrage (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    opportunity_type TEXT NOT NULL DEFAULT 'cross_chain',
    buy_chain TEXT NOT NULL,
    buy_protocol TEXT NOT NULL,
    buy_price NUMERIC NOT NULL,
    buy_confidence NUMERIC,
    sell_chain TEXT NOT NULL,
    sell_protocol TEXT NOT NULL,
    sell_price NUMERIC NOT NULL,
    sell_confidence NUMERIC,
    price_diff NUMERIC NOT NULL,
    price_diff_percent NUMERIC NOT NULL,
    potential_profit_percent NUMERIC NOT NULL,
    gas_cost_estimate NUMERIC NOT NULL DEFAULT 0,
    net_profit_estimate NUMERIC NOT NULL,
    risk_level TEXT NOT NULL,
    is_actionable BOOLEAN NOT NULL DEFAULT FALSE,
    warnings TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'detected',
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arbitrage_symbol ON cross_chain_arbitrage(symbol);
CREATE INDEX IF NOT EXISTS idx_arbitrage_timestamp ON cross_chain_arbitrage(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_arbitrage_status ON cross_chain_arbitrage(status);
CREATE INDEX IF NOT EXISTS idx_arbitrage_actionable ON cross_chain_arbitrage(is_actionable);
CREATE INDEX IF NOT EXISTS idx_arbitrage_symbol_status ON cross_chain_arbitrage(symbol, status);
CREATE INDEX IF NOT EXISTS idx_arbitrage_profit ON cross_chain_arbitrage(net_profit_estimate DESC);

COMMENT ON TABLE cross_chain_arbitrage IS '跨链价格偏差记录表（用于数据质量监控，不构成交易建议）';

-- ============================================================================
-- 核心表：跨链偏差告警
-- ============================================================================
CREATE TABLE IF NOT EXISTS cross_chain_deviation_alerts (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    chain_a TEXT NOT NULL,
    chain_b TEXT NOT NULL,
    deviation_percent NUMERIC NOT NULL,
    threshold_percent NUMERIC NOT NULL,
    severity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    price_a NUMERIC NOT NULL,
    price_b NUMERIC NOT NULL,
    avg_price NUMERIC NOT NULL,
    reason TEXT,
    suggested_action TEXT,
    acknowledged_by TEXT,
    acknowledged_at TIMESTAMPTZ,
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deviation_symbol ON cross_chain_deviation_alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_deviation_timestamp ON cross_chain_deviation_alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_deviation_status ON cross_chain_deviation_alerts(status);
CREATE INDEX IF NOT EXISTS idx_deviation_severity ON cross_chain_deviation_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_deviation_symbol_status ON cross_chain_deviation_alerts(symbol, status);

COMMENT ON TABLE cross_chain_deviation_alerts IS '跨链价格偏差告警表';

-- ============================================================================
-- 核心表：跨链分析配置
-- ============================================================================
CREATE TABLE IF NOT EXISTS cross_chain_analysis_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    symbols TEXT[] NOT NULL DEFAULT '{"BTC","ETH","SOL"}',
    chains TEXT[] NOT NULL DEFAULT '{"ethereum","bsc","polygon","avalanche","arbitrum"}',
    protocols TEXT[] NOT NULL DEFAULT '{"chainlink","pyth"}',
    deviation_threshold NUMERIC NOT NULL DEFAULT 0.5,
    critical_deviation_threshold NUMERIC NOT NULL DEFAULT 2.0,
    arbitrage_threshold NUMERIC NOT NULL DEFAULT 0.3,
    analysis_interval_ms INTEGER NOT NULL DEFAULT 60000,
    alert_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    alert_channels TEXT[] NOT NULL DEFAULT '{"webhook"}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO cross_chain_analysis_config (id, enabled, symbols, chains, protocols) 
VALUES ('default', TRUE, 
    ARRAY['BTC', 'ETH', 'SOL', 'LINK', 'AVAX'],
    ARRAY['ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism', 'base'],
    ARRAY['chainlink', 'pyth', 'band'])
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE cross_chain_analysis_config IS '跨链分析配置表';

-- ============================================================================
-- 核心表：跨链仪表板快照
-- ============================================================================
CREATE TABLE IF NOT EXISTS cross_chain_dashboard_snapshots (
    id SERIAL PRIMARY KEY,
    snapshot_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    monitored_symbols TEXT[] NOT NULL,
    monitored_chains TEXT[] NOT NULL,
    active_alerts_count INTEGER NOT NULL DEFAULT 0,
    total_opportunities INTEGER NOT NULL DEFAULT 0,
    actionable_opportunities INTEGER NOT NULL DEFAULT 0,
    avg_profit_percent NUMERIC,
    chain_health_data JSONB NOT NULL DEFAULT '{}',
    price_comparison_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_time ON cross_chain_dashboard_snapshots(snapshot_time DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_symbol ON cross_chain_dashboard_snapshots(snapshot_time DESC) 
  WHERE monitored_symbols IS NOT NULL;

COMMENT ON TABLE cross_chain_dashboard_snapshots IS '跨链分析仪表板快照表';

-- ============================================================================
-- 视图：活跃的价格偏差记录
-- ============================================================================
CREATE OR REPLACE VIEW cross_chain_active_arbitrage AS
SELECT * 
FROM cross_chain_arbitrage
WHERE status = 'detected'
  AND is_actionable = TRUE
  AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY net_profit_estimate DESC;

COMMENT ON VIEW cross_chain_active_arbitrage IS '活跃的跨链价格偏差记录（用于数据质量监控）';

-- ============================================================================
-- 视图：活跃的偏差告警
-- ============================================================================
CREATE OR REPLACE VIEW cross_chain_active_alerts AS
SELECT * 
FROM cross_chain_deviation_alerts
WHERE status = 'active'
ORDER BY severity DESC, deviation_percent DESC;

COMMENT ON VIEW cross_chain_active_alerts IS '活跃的跨链偏差告警';

-- ============================================================================
-- 触发器：自动更新 updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_cross_chain_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_cross_chain_config_updated_at') THEN
        CREATE TRIGGER update_cross_chain_config_updated_at
            BEFORE UPDATE ON cross_chain_analysis_config
            FOR EACH ROW EXECUTE FUNCTION update_cross_chain_config_updated_at();
    END IF;
END $$;

-- ============================================================================
-- RLS 策略
-- ============================================================================
ALTER TABLE cross_chain_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_chain_arbitrage ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_chain_deviation_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_chain_analysis_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_chain_dashboard_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON cross_chain_comparisons FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON cross_chain_arbitrage FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON cross_chain_deviation_alerts FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON cross_chain_analysis_config FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON cross_chain_dashboard_snapshots FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON cross_chain_comparisons FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON cross_chain_arbitrage FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON cross_chain_deviation_alerts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON cross_chain_analysis_config FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON cross_chain_dashboard_snapshots FOR INSERT WITH CHECK (auth.role() = 'authenticated');
