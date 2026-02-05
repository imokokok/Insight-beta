/**
 * Alert Management Types
 *
 * 告警管理类型定义
 */

import type { AnomalySeverity } from '@/server/security/anomalyDetectionService';

export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'suppressed' | 'escalated';
export type AlertChannel = 'email' | 'sms' | 'webhook' | 'slack' | 'telegram' | 'push';

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: AnomalySeverity;
  status: AlertStatus;
  source: string;
  symbol?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  escalationLevel: number;
  escalationHistory: EscalationRecord[];
  notificationHistory: NotificationRecord[];
  suppressionReason?: string;
  duplicateOf?: string;
}

export interface EscalationRecord {
  level: number;
  timestamp: Date;
  reason: string;
  notifiedChannels: AlertChannel[];
}

export interface NotificationRecord {
  channel: AlertChannel;
  timestamp: Date;
  status: 'sent' | 'failed' | 'retrying';
  error?: string;
}

export interface SuppressionRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: SuppressionCondition[];
  durationMs: number;
  reason: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface SuppressionCondition {
  field: string;
  operator: 'equals' | 'contains' | 'in' | 'gt' | 'lt';
  value: string | number | string[];
}

export interface EscalationPolicy {
  id: string;
  name: string;
  levels: EscalationLevel[];
  defaultChannels: AlertChannel[];
}

export interface EscalationLevel {
  level: number;
  name: string;
  timeoutMs: number;
  channels: AlertChannel[];
  requireAcknowledgment: boolean;
  autoEscalate: boolean;
  notifyOnEscalation: boolean;
}

export interface AlertStats {
  totalAlerts: number;
  activeAlerts: number;
  alertsBySeverity: Record<AnomalySeverity, number>;
  alertsByStatus: Record<AlertStatus, number>;
  averageResolutionTimeMs: number;
  suppressionRate: number;
  escalationRate: number;
}
