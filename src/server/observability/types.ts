/**
 * Observability Types - 可观测性类型定义
 */

import type {
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
} from '@/lib/types/oracleTypes';

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
};

export type DbAlertRow = {
  id: number | string;
  fingerprint: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  status: AlertStatus;
  occurrences: number | string;
  first_seen_at: Date;
  last_seen_at: Date;
  acknowledged_at: Date | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type DbAuditRow = {
  id: number | string;
  actor: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: unknown;
  created_at: Date;
};

export type NotificationChannel = 'webhook' | 'email' | 'telegram';
