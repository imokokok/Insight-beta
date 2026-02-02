/**
 * Observability Constants - 可观测性常量定义
 */

import type { AlertRuleEvent, AlertSeverity } from '@/lib/types/oracleTypes';

export const ALERT_RULES_KEY = 'alert_rules/v1';
export const INCIDENTS_KEY = 'incidents/v1';
export const MEMORY_MAX_ALERTS = 2000;
export const MEMORY_MAX_AUDIT = 5000;

export const VALID_RULE_EVENTS: AlertRuleEvent[] = [
  'dispute_created',
  'liveness_expiring',
  'sync_error',
  'stale_sync',
  'contract_paused',
  'sync_backlog',
  'backlog_assertions',
  'backlog_disputes',
  'market_stale',
  'execution_delayed',
  'low_participation',
  'high_vote_divergence',
  'high_dispute_rate',
  'slow_api_request',
  'high_error_rate',
  'database_slow_query',
  'price_deviation',
  'low_gas',
];

export const VALID_SEVERITIES: AlertSeverity[] = ['info', 'warning', 'critical'];
