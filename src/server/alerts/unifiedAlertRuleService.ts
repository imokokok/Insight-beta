/**
 * Unified Alert Rule Service
 *
 * 统一告警规则服务
 * 整合 alertRuleEngine 和 alert-rules API 的数据模型
 */

import { query } from '@/server/db';
import { logger } from '@/lib/logger';
import type { NotificationChannel } from './notificationService';

// ============================================================================
// Unified Types
// ============================================================================

export type AlertRuleEvent =
  | 'price_deviation'
  | 'price_threshold'
  | 'stale_data'
  | 'sync_failure'
  | 'protocol_down'
  | 'dispute_created'
  | 'liveness_expiring'
  | 'execution_delayed'
  | 'low_participation'
  | 'high_vote_divergence'
  | 'high_dispute_rate'
  | 'slow_api_request'
  | 'high_error_rate'
  | 'database_slow_query'
  | 'custom';

export type AlertRuleSeverity = 'info' | 'warning' | 'critical';

export type AlertRuleStatus = 'active' | 'disabled' | 'silenced';

export interface AlertCondition {
  id: string;
  type: string;
  params: Record<string, unknown>;
}

export interface UnifiedAlertRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  status: AlertRuleStatus;
  priority: number;
  
  // Event configuration
  event: AlertRuleEvent;
  severity: AlertRuleSeverity;
  
  // Conditions
  conditions: AlertCondition[];
  conditionLogic: 'AND' | 'OR';
  
  // Notification configuration
  notificationChannels: NotificationChannel[];
  recipient?: string;
  
  // Throttling
  throttleMinutes: number;
  silencedUntil?: Date;
  
  // Metadata
  owner?: string;
  runbook?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface CreateAlertRuleInput {
  name: string;
  description?: string;
  enabled?: boolean;
  priority?: number;
  event: AlertRuleEvent;
  severity: AlertRuleSeverity;
  conditions?: AlertCondition[];
  conditionLogic?: 'AND' | 'OR';
  notificationChannels: NotificationChannel[];
  recipient?: string;
  throttleMinutes?: number;
  owner?: string;
  runbook?: string;
}

export interface UpdateAlertRuleInput {
  name?: string;
  description?: string;
  enabled?: boolean;
  status?: AlertRuleStatus;
  priority?: number;
  event?: AlertRuleEvent;
  severity?: AlertRuleSeverity;
  conditions?: AlertCondition[];
  conditionLogic?: 'AND' | 'OR';
  notificationChannels?: NotificationChannel[];
  recipient?: string;
  throttleMinutes?: number;
  silencedUntil?: Date;
  owner?: string;
  runbook?: string;
}

// ============================================================================
// Database Schema
// ============================================================================

export const UNIFIED_ALERT_RULES_TABLE = `
CREATE TABLE IF NOT EXISTS unified_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  status VARCHAR(50) DEFAULT 'active',
  priority INTEGER DEFAULT 0,
  event VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  conditions JSONB NOT NULL DEFAULT '[]',
  condition_logic VARCHAR(10) DEFAULT 'AND',
  notification_channels JSONB NOT NULL DEFAULT '[]',
  recipient VARCHAR(255),
  throttle_minutes INTEGER DEFAULT 60,
  silenced_until TIMESTAMP WITH TIME ZONE,
  owner VARCHAR(100),
  runbook VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_unified_alert_rules_enabled ON unified_alert_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_unified_alert_rules_event ON unified_alert_rules(event);
CREATE INDEX IF NOT EXISTS idx_unified_alert_rules_severity ON unified_alert_rules(severity);
CREATE INDEX IF NOT EXISTS idx_unified_alert_rules_status ON unified_alert_rules(status);
`;

// ============================================================================
// Migration from old tables
// ============================================================================

export const MIGRATE_ALERT_RULES = `
-- Migrate from alert_rules table (if exists)
INSERT INTO unified_alert_rules (
  id, name, description, enabled, status, priority,
  event, severity, conditions, condition_logic,
  notification_channels, throttle_minutes,
  created_at, updated_at, created_by
)
SELECT 
  id, name, description, enabled, 
  CASE WHEN enabled THEN 'active' ELSE 'disabled' END,
  priority, 'custom', 'warning',
  conditions, condition_logic,
  notification_channels, throttle_minutes,
  created_at, updated_at, created_by
FROM alert_rules
WHERE NOT EXISTS (SELECT 1 FROM unified_alert_rules WHERE id = alert_rules.id)
ON CONFLICT (id) DO NOTHING;
`;

// ============================================================================
// Unified Alert Rule Service
// ============================================================================

export class UnifiedAlertRuleService {
  private ruleCache: Map<string, UnifiedAlertRule> = new Map();
  private cacheInitialized = false;

  /**
   * 确保数据库表存在
   */
  async ensureSchema(): Promise<void> {
    try {
      await query(UNIFIED_ALERT_RULES_TABLE);
      logger.info('Unified alert rules schema ensured');
    } catch (error) {
      logger.error('Failed to ensure unified alert rules schema', { error });
      throw error;
    }
  }

  /**
   * 从旧表迁移数据
   */
  async migrateFromLegacy(): Promise<{ migrated: number }> {
    try {
      // Check if old table exists
      const tableCheck = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'alert_rules'
        )
      `);

      if (!tableCheck.rows[0]?.exists) {
        logger.info('No legacy alert_rules table found, skipping migration');
        return { migrated: 0 };
      }

      const result = await query(MIGRATE_ALERT_RULES);
      const migrated = result.rowCount || 0;
      
      logger.info('Migrated alert rules from legacy table', { migrated });
      return { migrated };
    } catch (error) {
      logger.error('Failed to migrate alert rules', { error });
      throw error;
    }
  }

  /**
   * 初始化缓存
   */
  async initializeCache(): Promise<void> {
    if (this.cacheInitialized) return;

    try {
      await this.ensureSchema();
      await this.reloadCache();
      this.cacheInitialized = true;
      logger.info('Unified alert rule cache initialized', {
        count: this.ruleCache.size,
      });
    } catch (error) {
      logger.error('Failed to initialize unified alert rule cache', { error });
      throw error;
    }
  }

  /**
   * 重新加载缓存
   */
  async reloadCache(): Promise<void> {
    try {
      const result = await query(
        `SELECT * FROM unified_alert_rules WHERE enabled = true ORDER BY priority DESC, created_at DESC`
      );

      this.ruleCache.clear();
      for (const row of result.rows) {
        const rule = this.rowToRule(row);
        this.ruleCache.set(rule.id, rule);
      }

      logger.debug('Unified alert rule cache reloaded', {
        count: this.ruleCache.size,
      });
    } catch (error) {
      logger.error('Failed to reload unified alert rule cache', { error });
      throw error;
    }
  }

  /**
   * 获取所有规则
   */
  async getAllRules(options?: {
    enabled?: boolean;
    event?: AlertRuleEvent;
    severity?: AlertRuleSeverity;
    status?: AlertRuleStatus;
  }): Promise<UnifiedAlertRule[]> {
    await this.initializeCache();
    
    let rules = Array.from(this.ruleCache.values());
    
    if (options?.enabled !== undefined) {
      rules = rules.filter((r) => r.enabled === options.enabled);
    }
    if (options?.event) {
      rules = rules.filter((r) => r.event === options.event);
    }
    if (options?.severity) {
      rules = rules.filter((r) => r.severity === options.severity);
    }
    if (options?.status) {
      rules = rules.filter((r) => r.status === options.status);
    }
    
    return rules;
  }

  /**
   * 获取单个规则
   */
  async getRule(id: string): Promise<UnifiedAlertRule | null> {
    await this.initializeCache();
    
    // Try cache first
    const cached = this.ruleCache.get(id);
    if (cached) return cached;

    // Fallback to database
    const result = await query(
      'SELECT * FROM unified_alert_rules WHERE id = $1',
      [id]
    );
    
    const row = result.rows[0];
    if (!row) return null;
    
    return this.rowToRule(row as Record<string, unknown>);
  }

  /**
   * 创建规则
   */
  async createRule(
    input: CreateAlertRuleInput,
    createdBy?: string
  ): Promise<UnifiedAlertRule> {
    try {
      const result = await query(
        `INSERT INTO unified_alert_rules (
          name, description, enabled, status, priority,
          event, severity, conditions, condition_logic,
          notification_channels, recipient, throttle_minutes,
          owner, runbook, created_at, updated_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW(), $15)
        RETURNING *`,
        [
          input.name,
          input.description ?? null,
          input.enabled ?? true,
          input.enabled ?? true ? 'active' : 'disabled',
          input.priority ?? 0,
          input.event,
          input.severity,
          JSON.stringify(input.conditions ?? []),
          input.conditionLogic ?? 'AND',
          JSON.stringify(input.notificationChannels),
          input.recipient ?? null,
          input.throttleMinutes ?? 60,
          input.owner ?? null,
          input.runbook ?? null,
          createdBy ?? null,
        ]
      );

      const row = result.rows[0];
      if (!row) {
        throw new Error('Failed to create alert rule: no row returned');
      }

      const rule = this.rowToRule(row);
      
      // Update cache
      if (rule.enabled) {
        this.ruleCache.set(rule.id, rule);
      }

      logger.info('Unified alert rule created', { id: rule.id, name: rule.name });
      return rule;
    } catch (error) {
      logger.error('Failed to create unified alert rule', { error, input });
      throw error;
    }
  }

  /**
   * 更新规则
   */
  async updateRule(
    id: string,
    input: UpdateAlertRuleInput
  ): Promise<UnifiedAlertRule | null> {
    try {
      const existing = await this.getRule(id);
      if (!existing) return null;

      const updates: string[] = [];
      const values: (string | number | boolean | Date | null)[] = [];
      let paramIndex = 1;

      if (input.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(input.name);
      }
      if (input.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(input.description);
      }
      if (input.enabled !== undefined) {
        updates.push(`enabled = $${paramIndex++}`);
        updates.push(`status = $${paramIndex++}`);
        values.push(input.enabled);
        values.push(input.enabled ? 'active' : 'disabled');
      }
      if (input.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(input.status);
      }
      if (input.priority !== undefined) {
        updates.push(`priority = $${paramIndex++}`);
        values.push(input.priority);
      }
      if (input.event !== undefined) {
        updates.push(`event = $${paramIndex++}`);
        values.push(input.event);
      }
      if (input.severity !== undefined) {
        updates.push(`severity = $${paramIndex++}`);
        values.push(input.severity);
      }
      if (input.conditions !== undefined) {
        updates.push(`conditions = $${paramIndex++}`);
        values.push(JSON.stringify(input.conditions));
      }
      if (input.conditionLogic !== undefined) {
        updates.push(`condition_logic = $${paramIndex++}`);
        values.push(input.conditionLogic);
      }
      if (input.notificationChannels !== undefined) {
        updates.push(`notification_channels = $${paramIndex++}`);
        values.push(JSON.stringify(input.notificationChannels));
      }
      if (input.recipient !== undefined) {
        updates.push(`recipient = $${paramIndex++}`);
        values.push(input.recipient);
      }
      if (input.throttleMinutes !== undefined) {
        updates.push(`throttle_minutes = $${paramIndex++}`);
        values.push(input.throttleMinutes);
      }
      if (input.silencedUntil !== undefined) {
        updates.push(`silenced_until = $${paramIndex++}`);
        values.push(input.silencedUntil);
      }
      if (input.owner !== undefined) {
        updates.push(`owner = $${paramIndex++}`);
        values.push(input.owner);
      }
      if (input.runbook !== undefined) {
        updates.push(`runbook = $${paramIndex++}`);
        values.push(input.runbook);
      }

      if (updates.length === 0) return existing;

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const result = await query(
        `UPDATE unified_alert_rules SET ${updates.join(', ')}
         WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      const row = result.rows[0];
      if (!row) return null;

      const rule = this.rowToRule(row);

      // Update cache
      if (rule.enabled && rule.status === 'active') {
        this.ruleCache.set(rule.id, rule);
      } else {
        this.ruleCache.delete(rule.id);
      }

      logger.info('Unified alert rule updated', { id, name: rule.name });
      return rule;
    } catch (error) {
      logger.error('Failed to update unified alert rule', { error, id, input });
      throw error;
    }
  }

  /**
   * 删除规则
   */
  async deleteRule(id: string): Promise<boolean> {
    try {
      const result = await query(
        'DELETE FROM unified_alert_rules WHERE id = $1 RETURNING id',
        [id]
      );

      const deleted = result.rowCount !== null && result.rowCount > 0;
      if (deleted) {
        this.ruleCache.delete(id);
        logger.info('Unified alert rule deleted', { id });
      }

      return deleted;
    } catch (error) {
      logger.error('Failed to delete unified alert rule', { error, id });
      throw error;
    }
  }

  /**
   * 批量更新规则（兼容旧版 API）
   */
  async batchUpdateRules(
    rules: Partial<UnifiedAlertRule>[],
    updatedBy?: string
  ): Promise<UnifiedAlertRule[]> {
    const results: UnifiedAlertRule[] = [];

    for (const rule of rules) {
      if (!rule.id) {
        // Create new rule
        const newRule = await this.createRule(
          {
            name: rule.name || 'Unnamed Rule',
            event: rule.event || 'custom',
            severity: rule.severity || 'warning',
            notificationChannels: rule.notificationChannels || ['webhook'],
            ...rule,
          } as CreateAlertRuleInput,
          updatedBy
        );
        results.push(newRule);
      } else {
        // Update existing
        const updated = await this.updateRule(rule.id, rule as UpdateAlertRuleInput);
        if (updated) {
          results.push(updated);
        }
      }
    }

    return results;
  }

  /**
   * 静默规则
   */
  async silenceRule(
    id: string,
    until: Date,
    _silencedBy?: string
  ): Promise<UnifiedAlertRule | null> {
    return this.updateRule(id, {
      status: 'silenced',
      silencedUntil: until,
    });
  }

  /**
   * 启用规则
   */
  async enableRule(id: string): Promise<UnifiedAlertRule | null> {
    return this.updateRule(id, {
      enabled: true,
      status: 'active',
      silencedUntil: undefined,
    });
  }

  /**
   * 禁用规则
   */
  async disableRule(id: string): Promise<UnifiedAlertRule | null> {
    return this.updateRule(id, {
      enabled: false,
      status: 'disabled',
    });
  }

  /**
   * 获取规则统计
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    disabled: number;
    silenced: number;
    byEvent: Record<string, number>;
    bySeverity: Record<string, number>;
  }> {
    const result = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'disabled' THEN 1 END) as disabled,
        COUNT(CASE WHEN status = 'silenced' THEN 1 END) as silenced,
        event,
        severity
      FROM unified_alert_rules
      GROUP BY event, severity
    `);

    const byEvent: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let total = 0;
    let active = 0;
    let disabled = 0;
    let silenced = 0;

    for (const row of result.rows) {
      total = Math.max(total, parseInt(row.total as string));
      active = Math.max(active, parseInt(row.active as string));
      disabled = Math.max(disabled, parseInt(row.disabled as string));
      silenced = Math.max(silenced, parseInt(row.silenced as string));
      
      const event = row.event as string;
      const severity = row.severity as string;
      
      byEvent[event] = (byEvent[event] || 0) + 1;
      bySeverity[severity] = (bySeverity[severity] || 0) + 1;
    }

    return { total, active, disabled, silenced, byEvent, bySeverity };
  }

  /**
   * 将数据库行转换为规则对象
   */
  private rowToRule(row: Record<string, unknown>): UnifiedAlertRule {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      enabled: row.enabled as boolean,
      status: row.status as AlertRuleStatus,
      priority: row.priority as number,
      event: row.event as AlertRuleEvent,
      severity: row.severity as AlertRuleSeverity,
      conditions: (row.conditions as AlertCondition[]) || [],
      conditionLogic: (row.condition_logic as 'AND' | 'OR') || 'AND',
      notificationChannels: (row.notification_channels as NotificationChannel[]) || [],
      recipient: row.recipient as string | undefined,
      throttleMinutes: row.throttle_minutes as number,
      silencedUntil: row.silenced_until as Date | undefined,
      owner: row.owner as string | undefined,
      runbook: row.runbook as string | undefined,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
      createdBy: row.created_by as string | undefined,
    };
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; initialized: boolean } {
    return {
      size: this.ruleCache.size,
      initialized: this.cacheInitialized,
    };
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.ruleCache.clear();
    this.cacheInitialized = false;
    logger.info('Unified alert rule cache cleared');
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const unifiedAlertRuleService = new UnifiedAlertRuleService();
