/**
 * Observability Module - 可观测性模块统一导出
 *
 * 包含：告警规则、事件管理、告警管理、审计日志、指标、SLO 等功能
 *
 * @deprecated 此模块正在重构中，请从子模块导入具体功能
 */

// ============================================================================
// Types
// ============================================================================

export type {
  AlertSeverity,
  AlertStatus,
  Alert,
  AlertRuleEvent,
  AlertRule,
  AuditLogEntry,
  IncidentStatus,
  Incident,
  OpsMetrics,
  OpsMetricsSeriesPoint,
  OpsSloStatus,
  DbAlertRow,
  DbAuditRow,
  NotificationChannel,
} from './types';

// ============================================================================
// Constants
// ============================================================================

export {
  ALERT_RULES_KEY,
  INCIDENTS_KEY,
  MEMORY_MAX_ALERTS,
  MEMORY_MAX_AUDIT,
  VALID_RULE_EVENTS,
  VALID_SEVERITIES,
} from './constants';

// ============================================================================
// Rules Module
// ============================================================================

export { readAlertRules, writeAlertRules } from './rules';

// ============================================================================
// Alerts Module
// ============================================================================

export { createOrTouchAlert, listAlerts, pruneStaleAlerts } from './alerts';

// ============================================================================
// Incidents Module
// ============================================================================

export { listIncidents, getIncident, createIncident, patchIncident } from './incidents';

// ============================================================================
// Audit Module
// ============================================================================

export { appendAuditLog, listAuditLog } from './audit';

// ============================================================================
// Legacy exports from original observability.ts
// Note: Other functions remain in the original file and will be migrated gradually
// ============================================================================

// Re-export all types from oracleTypes for convenience
export type {
  AlertSeverity as AlertSeverityType,
  AlertStatus as AlertStatusType,
  Alert as AlertType,
  AlertRuleEvent as AlertRuleEventType,
  AlertRule as AlertRuleType,
  AuditLogEntry as AuditLogEntryType,
  IncidentStatus as IncidentStatusType,
  Incident as IncidentType,
  OpsMetrics as OpsMetricsType,
  OpsMetricsSeriesPoint as OpsMetricsSeriesPointType,
  OpsSloStatus as OpsSloStatusType,
} from '@/lib/types/oracleTypes';
