-- Create detection_config table
CREATE TABLE IF NOT EXISTS detection_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default config
INSERT INTO detection_config (id, config)
VALUES ('default', '{
    "zScoreThreshold": 3,
    "minConfidenceScore": 0.7,
    "timeWindowMs": 300000,
    "minDataPoints": 10,
    "flashLoanMinAmountUsd": 100000,
    "sandwichProfitThresholdUsd": 1000,
    "liquidityChangeThreshold": 0.3,
    "maxPriceDeviationPercent": 5,
    "correlationThreshold": 0.8,
    "enabledRules": [
        "statistical_anomaly",
        "flash_loan_attack",
        "sandwich_attack",
        "liquidity_manipulation"
    ],
    "alertChannels": {
        "email": true,
        "webhook": true,
        "slack": false,
        "telegram": false
    },
    "autoBlockSuspiciousFeeds": false,
    "notificationCooldownMs": 300000
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_detection_config_updated_at ON detection_config;
CREATE TRIGGER update_detection_config_updated_at
    BEFORE UPDATE ON detection_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE detection_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON detection_config
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON detection_config
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON detection_config
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Add comment
COMMENT ON TABLE detection_config IS 'Stores price manipulation detection configuration';
