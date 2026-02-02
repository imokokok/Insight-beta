-- Create manipulation_detections table
CREATE TABLE IF NOT EXISTS manipulation_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol TEXT NOT NULL,
    symbol TEXT NOT NULL,
    chain TEXT NOT NULL,
    feed_key TEXT NOT NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    evidence JSONB NOT NULL DEFAULT '[]',
    suspicious_transactions JSONB NOT NULL DEFAULT '[]',
    related_blocks INTEGER[] DEFAULT '{}',
    price_impact DECIMAL(10,4),
    financial_impact_usd DECIMAL(18,2),
    affected_addresses TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'false_positive', 'under_investigation')),
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for manipulation_detections
CREATE INDEX IF NOT EXISTS idx_manipulation_detections_feed_key ON manipulation_detections(feed_key);
CREATE INDEX IF NOT EXISTS idx_manipulation_detections_type ON manipulation_detections(type);
CREATE INDEX IF NOT EXISTS idx_manipulation_detections_severity ON manipulation_detections(severity);
CREATE INDEX IF NOT EXISTS idx_manipulation_detections_detected_at ON manipulation_detections(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_manipulation_detections_status ON manipulation_detections(status);
CREATE INDEX IF NOT EXISTS idx_manipulation_detections_protocol_chain ON manipulation_detections(protocol, chain);

-- Create detection_metrics table
CREATE TABLE IF NOT EXISTS detection_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_detections INTEGER NOT NULL DEFAULT 0,
    detections_by_type JSONB NOT NULL DEFAULT '{}',
    detections_by_severity JSONB NOT NULL DEFAULT '{}',
    false_positives INTEGER NOT NULL DEFAULT 0,
    average_confidence DECIMAL(3,2) NOT NULL DEFAULT 0,
    last_detection_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create blocked_feeds table
CREATE TABLE IF NOT EXISTS blocked_feeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feed_key TEXT NOT NULL UNIQUE,
    protocol TEXT NOT NULL,
    symbol TEXT NOT NULL,
    chain TEXT NOT NULL,
    reason TEXT NOT NULL,
    detection_id UUID REFERENCES manipulation_detections(id) ON DELETE SET NULL,
    blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unblocked_at TIMESTAMPTZ,
    unblocked_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create monitoring_logs table
CREATE TABLE IF NOT EXISTS monitoring_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event TEXT NOT NULL,
    protocol TEXT,
    symbol TEXT,
    chain TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    details JSONB DEFAULT '{}'
);

-- Create index for monitoring_logs
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_timestamp ON monitoring_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_event ON monitoring_logs(event);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to manipulation_detections
DROP TRIGGER IF EXISTS update_manipulation_detections_updated_at ON manipulation_detections;
CREATE TRIGGER update_manipulation_detections_updated_at
    BEFORE UPDATE ON manipulation_detections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE manipulation_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE detection_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for manipulation_detections
CREATE POLICY "Enable read access for all users" ON manipulation_detections
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON manipulation_detections
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON manipulation_detections
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create policies for detection_metrics
CREATE POLICY "Enable read access for all users" ON detection_metrics
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON detection_metrics
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policies for blocked_feeds
CREATE POLICY "Enable read access for all users" ON blocked_feeds
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON blocked_feeds
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON blocked_feeds
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create policies for monitoring_logs
CREATE POLICY "Enable read access for all users" ON monitoring_logs
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON monitoring_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Add comments
COMMENT ON TABLE manipulation_detections IS 'Stores price manipulation detection results';
COMMENT ON TABLE detection_metrics IS 'Stores aggregated detection metrics';
COMMENT ON TABLE blocked_feeds IS 'Stores blocked price feeds due to manipulation';
COMMENT ON TABLE monitoring_logs IS 'Stores monitoring service event logs';
