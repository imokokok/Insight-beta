-- Migration: Create alert_status_overrides table
-- 用于存储不在 unified_alerts 表中的 alert 状态覆盖

CREATE TABLE IF NOT EXISTS alert_status_overrides (
    id BIGSERIAL PRIMARY KEY,
    alert_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'open',
    note TEXT,
    silenced_until TIMESTAMPTZ,
    updated_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_status_overrides_alert_id ON alert_status_overrides(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_status_overrides_status ON alert_status_overrides(status);
CREATE INDEX IF NOT EXISTS idx_alert_status_overrides_silenced_until ON alert_status_overrides(silenced_until);

ALTER TABLE alert_status_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON alert_status_overrides FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON alert_status_overrides FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON alert_status_overrides FOR UPDATE USING (auth.role() = 'authenticated');

COMMENT ON TABLE alert_status_overrides IS 'Alert 状态覆盖表，用于存储不在 unified_alerts 表中的 alert 状态变更';
