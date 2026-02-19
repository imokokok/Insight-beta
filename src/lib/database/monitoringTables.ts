import type { TableDefinition, IndexDefinition, QueryFn } from './types';

export const monitoringTables: TableDefinition[] = [
  {
    name: 'alerts',
    sql: `
      CREATE TABLE IF NOT EXISTS alerts (
        id BIGSERIAL PRIMARY KEY,
        fingerprint TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        status TEXT NOT NULL DEFAULT 'Open',
        occurrences INTEGER NOT NULL DEFAULT 1,
        first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        acknowledged_at TIMESTAMP WITH TIME ZONE,
        resolved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `,
  },
  {
    name: 'audit_log',
    sql: `
      CREATE TABLE IF NOT EXISTS audit_log (
        id BIGSERIAL PRIMARY KEY,
        actor TEXT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `,
  },
  {
    name: 'rate_limits',
    sql: `
      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        reset_at TIMESTAMP WITH TIME ZONE NOT NULL,
        count INTEGER NOT NULL
      )
    `,
  },
  {
    name: 'web_vitals_metrics',
    sql: `
      CREATE TABLE IF NOT EXISTS web_vitals_metrics (
        id BIGSERIAL PRIMARY KEY,
        lcp NUMERIC,
        fid NUMERIC,
        cls NUMERIC,
        fcp NUMERIC,
        ttfb NUMERIC,
        inp NUMERIC,
        page_path TEXT NOT NULL DEFAULT '/',
        user_agent TEXT,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `,
  },
  {
    name: 'oracle_config_history',
    sql: `
      CREATE TABLE IF NOT EXISTS oracle_config_history (
        id BIGSERIAL PRIMARY KEY,
        instance_id TEXT NOT NULL,
        changed_by TEXT,
        change_type TEXT NOT NULL,
        previous_values JSONB,
        new_values JSONB,
        change_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `,
  },
  {
    name: 'alert_rules',
    sql: `
      CREATE TABLE IF NOT EXISTS alert_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT true,
        event TEXT NOT NULL,
        severity TEXT NOT NULL,
        protocols TEXT[],
        chains TEXT[],
        instances TEXT[],
        symbols TEXT[],
        params JSONB,
        channels TEXT[],
        recipients TEXT[],
        cooldown_minutes INTEGER DEFAULT 5,
        max_notifications_per_hour INTEGER DEFAULT 10,
        runbook TEXT,
        owner TEXT,
        silenced_until TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `,
  },
  {
    name: 'notification_channels',
    sql: `
      CREATE TABLE IF NOT EXISTS notification_channels (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT true,
        config JSONB NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMP WITH TIME ZONE,
        test_status TEXT,
        test_message TEXT
      )
    `,
  },
];

export const monitoringIndexes: IndexDefinition[] = [
  {
    name: 'idx_alerts_status',
    table: 'alerts',
    sql: 'CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status)',
  },
  {
    name: 'idx_alerts_last_seen',
    table: 'alerts',
    sql: 'CREATE INDEX IF NOT EXISTS idx_alerts_last_seen ON alerts(last_seen_at)',
  },
  {
    name: 'idx_alerts_type',
    table: 'alerts',
    sql: 'CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type)',
  },
  {
    name: 'idx_alerts_severity',
    table: 'alerts',
    sql: 'CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity)',
  },
  {
    name: 'idx_alerts_status_last_seen',
    table: 'alerts',
    sql: 'CREATE INDEX IF NOT EXISTS idx_alerts_status_last_seen ON alerts(status, last_seen_at DESC)',
  },
  {
    name: 'idx_audit_created',
    table: 'audit_log',
    sql: 'CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at)',
  },
  {
    name: 'idx_rate_limits_reset',
    table: 'rate_limits',
    sql: 'CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at)',
  },
  {
    name: 'idx_web_vitals_page_path',
    table: 'web_vitals_metrics',
    sql: 'CREATE INDEX IF NOT EXISTS idx_web_vitals_page_path ON web_vitals_metrics(page_path)',
  },
  {
    name: 'idx_web_vitals_created_at',
    table: 'web_vitals_metrics',
    sql: 'CREATE INDEX IF NOT EXISTS idx_web_vitals_created_at ON web_vitals_metrics(created_at)',
  },
  {
    name: 'idx_web_vitals_page_created',
    table: 'web_vitals_metrics',
    sql: 'CREATE INDEX IF NOT EXISTS idx_web_vitals_page_created ON web_vitals_metrics(page_path, created_at)',
  },
  {
    name: 'idx_config_history_instance',
    table: 'oracle_config_history',
    sql: 'CREATE INDEX IF NOT EXISTS idx_config_history_instance ON oracle_config_history(instance_id)',
  },
  {
    name: 'idx_config_history_created_at',
    table: 'oracle_config_history',
    sql: 'CREATE INDEX IF NOT EXISTS idx_config_history_created_at ON oracle_config_history(created_at DESC)',
  },
  {
    name: 'idx_config_history_instance_created',
    table: 'oracle_config_history',
    sql: 'CREATE INDEX IF NOT EXISTS idx_config_history_instance_created ON oracle_config_history(instance_id, created_at DESC)',
  },
  {
    name: 'idx_alert_rules_enabled',
    table: 'alert_rules',
    sql: 'CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(enabled)',
  },
  {
    name: 'idx_alert_rules_event',
    table: 'alert_rules',
    sql: 'CREATE INDEX IF NOT EXISTS idx_alert_rules_event ON alert_rules(event)',
  },
  {
    name: 'idx_alert_rules_severity',
    table: 'alert_rules',
    sql: 'CREATE INDEX IF NOT EXISTS idx_alert_rules_severity ON alert_rules(severity)',
  },
  {
    name: 'idx_alert_rules_owner',
    table: 'alert_rules',
    sql: 'CREATE INDEX IF NOT EXISTS idx_alert_rules_owner ON alert_rules(owner)',
  },
  {
    name: 'idx_notification_channels_type',
    table: 'notification_channels',
    sql: 'CREATE INDEX IF NOT EXISTS idx_notification_channels_type ON notification_channels(type)',
  },
  {
    name: 'idx_notification_channels_enabled',
    table: 'notification_channels',
    sql: 'CREATE INDEX IF NOT EXISTS idx_notification_channels_enabled ON notification_channels(enabled)',
  },
];

export async function createMonitoringTables(queryFn: QueryFn): Promise<void> {
  for (const table of monitoringTables) {
    await queryFn(table.sql);
  }
}

export async function createMonitoringIndexes(queryFn: QueryFn): Promise<void> {
  for (const index of monitoringIndexes) {
    await queryFn(index.sql);
  }
}
