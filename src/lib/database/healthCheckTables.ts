/**
 * Health Check Tables - 健康检查相关数据库表定义
 *
 * 定义健康检查监控所需的数据库表结构
 */

// ============================================================================
// Oracle Health Checks Table
// ============================================================================

export const ORACLE_HEALTH_CHECKS_TABLE = `
CREATE TABLE IF NOT EXISTS oracle_health_checks (
  id SERIAL PRIMARY KEY,
  protocol VARCHAR(50) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  feed_id VARCHAR(255) NOT NULL,
  healthy BOOLEAN NOT NULL DEFAULT false,
  last_update TIMESTAMP WITH TIME ZONE,
  staleness_seconds INTEGER DEFAULT 0,
  issues JSONB DEFAULT '[]'::jsonb,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  latency_ms INTEGER DEFAULT 0,
  
  -- UMA 特定字段
  active_assertions INTEGER,
  active_disputes INTEGER,
  total_bonded VARCHAR(78), -- bigint as string
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(protocol, chain, feed_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_health_checks_protocol ON oracle_health_checks(protocol);
CREATE INDEX IF NOT EXISTS idx_health_checks_chain ON oracle_health_checks(chain);
CREATE INDEX IF NOT EXISTS idx_health_checks_healthy ON oracle_health_checks(healthy);
CREATE INDEX IF NOT EXISTS idx_health_checks_checked_at ON oracle_health_checks(checked_at);
CREATE INDEX IF NOT EXISTS idx_health_checks_protocol_chain ON oracle_health_checks(protocol, chain);
`;

// ============================================================================
// Alert Rules Table
// ============================================================================

export const ALERT_RULES_TABLE = `
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 50, -- 0-100, 越高越紧急
  
  -- 触发条件
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  condition_logic VARCHAR(10) NOT NULL DEFAULT 'AND', -- 'AND' | 'OR'
  
  -- 通知配置
  notification_channels JSONB NOT NULL DEFAULT '[]'::jsonb, -- ['email', 'slack', 'sms']
  throttle_minutes INTEGER NOT NULL DEFAULT 60, -- 告警节流时间
  
  -- 元数据
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255),
  
  -- 规则标签
  tags JSONB DEFAULT '[]'::jsonb
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_alert_rules_priority ON alert_rules(priority DESC);
CREATE INDEX IF NOT EXISTS idx_alert_rules_created_at ON alert_rules(created_at);
`;

// ============================================================================
// Unified Alerts Table
// ============================================================================

export const UNIFIED_ALERTS_TABLE = `
CREATE TABLE IF NOT EXISTS unified_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
  
  -- 告警来源
  protocol VARCHAR(50),
  chain VARCHAR(50),
  feed_id VARCHAR(255),
  
  -- 告警类型和严重级别
  alert_type VARCHAR(50) NOT NULL, -- 'rule_triggered', 'system', 'manual'
  severity VARCHAR(20) NOT NULL DEFAULT 'info', -- 'critical', 'warning', 'info'
  
  -- 告警内容
  title VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  
  -- 状态
  status VARCHAR(20) NOT NULL DEFAULT 'open', -- 'open', 'acknowledged', 'resolved', 'suppressed'
  acknowledged_by VARCHAR(255),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR(255),
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_unified_alerts_protocol ON unified_alerts(protocol);
CREATE INDEX IF NOT EXISTS idx_unified_alerts_chain ON unified_alerts(chain);
CREATE INDEX IF NOT EXISTS idx_unified_alerts_status ON unified_alerts(status);
CREATE INDEX IF NOT EXISTS idx_unified_alerts_severity ON unified_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_unified_alerts_created_at ON unified_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_unified_alerts_rule_id ON unified_alerts(rule_id);
`;

// ============================================================================
// Unified Sync State Table
// ============================================================================

export const UNIFIED_SYNC_STATE_TABLE = `
CREATE TABLE IF NOT EXISTS unified_sync_state (
  id SERIAL PRIMARY KEY,
  instance_id VARCHAR(255) NOT NULL UNIQUE,
  protocol VARCHAR(50) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  
  -- 同步状态
  last_processed_block BIGINT DEFAULT 0,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_duration_ms INTEGER DEFAULT 0,
  avg_sync_duration_ms INTEGER DEFAULT 0,
  
  -- 健康状态
  status VARCHAR(20) NOT NULL DEFAULT 'healthy', -- 'healthy', 'lagging', 'stalled', 'error'
  consecutive_failures INTEGER DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMP WITH TIME ZONE,
  
  -- 元数据
  config JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_sync_state_protocol ON unified_sync_state(protocol);
CREATE INDEX IF NOT EXISTS idx_sync_state_chain ON unified_sync_state(chain);
CREATE INDEX IF NOT EXISTS idx_sync_state_status ON unified_sync_state(status);
CREATE INDEX IF NOT EXISTS idx_sync_state_last_sync ON unified_sync_state(last_sync_at);
`;

// ============================================================================
// Network Metrics Table (for Gas Price, etc.)
// ============================================================================

export const ORACLE_NETWORK_METRICS_TABLE = `
CREATE TABLE IF NOT EXISTS oracle_network_metrics (
  id SERIAL PRIMARY KEY,
  chain VARCHAR(50) NOT NULL,
  
  -- Gas 价格
  gas_price_gwei NUMERIC(20, 4),
  gas_price_fast_gwei NUMERIC(20, 4),
  gas_price_standard_gwei NUMERIC(20, 4),
  gas_price_slow_gwei NUMERIC(20, 4),
  
  -- 网络状态
  block_number BIGINT,
  block_timestamp TIMESTAMP WITH TIME ZONE,
  network_congestion NUMERIC(5, 2), -- 0-100
  
  -- 时间戳
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_network_metrics_chain ON oracle_network_metrics(chain);
CREATE INDEX IF NOT EXISTS idx_network_metrics_timestamp ON oracle_network_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_network_metrics_chain_timestamp ON oracle_network_metrics(chain, timestamp);
`;

// ============================================================================
// Oracle Liquidity Table
// ============================================================================

export const ORACLE_LIQUIDITY_TABLE = `
CREATE TABLE IF NOT EXISTS oracle_liquidity (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(50) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  
  -- 流动性数据
  liquidity_usd NUMERIC(30, 2),
  liquidity_token NUMERIC(30, 8),
  volume_24h_usd NUMERIC(30, 2),
  
  -- DEX 信息
  dex_name VARCHAR(100),
  pool_address VARCHAR(255),
  
  -- 时间戳
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_liquidity_symbol ON oracle_liquidity(symbol);
CREATE INDEX IF NOT EXISTS idx_liquidity_chain ON oracle_liquidity(chain);
CREATE INDEX IF NOT EXISTS idx_liquidity_timestamp ON oracle_liquidity(timestamp);
CREATE INDEX IF NOT EXISTS idx_liquidity_symbol_chain ON oracle_liquidity(symbol, chain);
`;

// ============================================================================
// All Table Creation SQL
// ============================================================================

export const ALL_HEALTH_CHECK_TABLES = [
  ORACLE_HEALTH_CHECKS_TABLE,
  ALERT_RULES_TABLE,
  UNIFIED_ALERTS_TABLE,
  UNIFIED_SYNC_STATE_TABLE,
  ORACLE_NETWORK_METRICS_TABLE,
  ORACLE_LIQUIDITY_TABLE,
].join('\n\n');

// ============================================================================
// Migration Functions
// ============================================================================

export async function createHealthCheckTables(query: (sql: string) => Promise<unknown>): Promise<void> {
  const tables = [
    { name: 'oracle_health_checks', sql: ORACLE_HEALTH_CHECKS_TABLE },
    { name: 'alert_rules', sql: ALERT_RULES_TABLE },
    { name: 'unified_alerts', sql: UNIFIED_ALERTS_TABLE },
    { name: 'unified_sync_state', sql: UNIFIED_SYNC_STATE_TABLE },
    { name: 'oracle_network_metrics', sql: ORACLE_NETWORK_METRICS_TABLE },
    { name: 'oracle_liquidity', sql: ORACLE_LIQUIDITY_TABLE },
  ];

  for (const table of tables) {
    try {
      await query(table.sql);
      console.log(`✓ Table ${table.name} created or already exists`);
    } catch (error) {
      console.error(`✗ Failed to create table ${table.name}:`, error);
      throw error;
    }
  }
}
