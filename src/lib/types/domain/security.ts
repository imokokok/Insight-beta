/**
 * Security Domain Types - 安全领域类型
 */

import type { EntityId, Timestamp, SeverityLevel } from './base';
import type { OracleProtocol, SupportedChain } from './oracle';

// ============================================================================
// 安全检测
// ============================================================================

export type DetectionType =
  | 'price_manipulation'
  | 'unusual_volume'
  | 'flash_loan'
  | 'sandwich_attack'
  | 'front_running'
  | 'contract_exploit'
  | 'access_control';

export type DetectionStatus = 'open' | 'investigating' | 'resolved' | 'false_positive';

export interface SecurityDetection {
  id: EntityId;
  type: DetectionType;
  severity: SeverityLevel;
  status: DetectionStatus;
  protocol?: OracleProtocol;
  chain?: SupportedChain;
  instanceId?: EntityId;
  symbol?: string;
  description: string;
  evidence: DetectionEvidence[];
  detectedAt: Timestamp;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  resolution?: string;
  resolvedAt?: Timestamp;
}

export interface DetectionEvidence {
  type: 'transaction' | 'price_data' | 'log' | 'metric';
  data: Record<string, unknown>;
  timestamp: Timestamp;
}

// ============================================================================
// 价格操纵检测
// ============================================================================

export interface ManipulationAlert {
  id: EntityId;
  symbol: string;
  protocol: OracleProtocol;
  instanceId: EntityId;
  detectedPrice: number;
  expectedPrice: number;
  deviation: number;
  confidence: number;
  indicators: ManipulationIndicator[];
  transactions: string[];
  status: 'active' | 'confirmed' | 'dismissed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ManipulationIndicator {
  type: 'volume_spike' | 'liquidity_drop' | 'price_deviation' | 'correlation_break';
  severity: number;
  description: string;
  data: Record<string, unknown>;
}

// ============================================================================
// 警报规则
// ============================================================================

export type AlertEvent =
  | 'price_deviation'
  | 'contract_event'
  | 'sync_failure'
  | 'security_detection'
  | 'system_health';

export type AlertChannel = 'email' | 'webhook' | 'telegram' | 'slack' | 'pagerduty' | 'discord';

export interface AlertRule {
  id: EntityId;
  name: string;
  enabled: boolean;
  event: AlertEvent;
  severity: SeverityLevel;
  protocols?: OracleProtocol[];
  chains?: SupportedChain[];
  instances?: EntityId[];
  symbols?: string[];
  params?: Record<string, unknown>;
  channels: AlertChannel[];
  cooldownMinutes: number;
  maxNotificationsPerHour: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Alert {
  id: EntityId;
  ruleId?: EntityId;
  event: AlertEvent;
  severity: SeverityLevel;
  title: string;
  message: string;
  protocol?: OracleProtocol;
  chain?: SupportedChain;
  instanceId?: EntityId;
  symbol?: string;
  context?: Record<string, unknown>;
  status: 'open' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: Timestamp;
  resolvedBy?: string;
  resolvedAt?: Timestamp;
  occurrences: number;
  firstSeenAt: Timestamp;
  lastSeenAt: Timestamp;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ============================================================================
// 审计日志
// ============================================================================

export type AuditAction =
  | 'config_read'
  | 'config_updated'
  | 'alert_acknowledged'
  | 'detection_reviewed'
  | 'user_login'
  | 'permission_changed';

export interface AuditLog {
  id: EntityId;
  actor: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Timestamp;
}

// ============================================================================
// 访问控制
// ============================================================================

export type Permission =
  | 'oracle:read'
  | 'oracle:write'
  | 'config:read'
  | 'config:write'
  | 'alert:read'
  | 'alert:write'
  | 'security:read'
  | 'security:write'
  | 'admin:full';

export interface Role {
  id: EntityId;
  name: string;
  permissions: Permission[];
  description?: string;
}

export interface UserPermission {
  userId: string;
  roles: EntityId[];
  permissions: Permission[];
  grantedAt: Timestamp;
  grantedBy: string;
  expiresAt?: Timestamp;
}
