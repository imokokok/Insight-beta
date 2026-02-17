/**
 * Alert Types - 告警和监控相关类型定义
 */

import type { SupportedChain } from '@/types/chains';
import type { OracleProtocol } from './protocol';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type AlertStatus =
  | 'Open'
  | 'Acknowledged'
  | 'Resolved'
  | 'open'
  | 'acknowledged'
  | 'resolved';

export type AlertEvent =
  | 'price_deviation'
  | 'price_stale'
  | 'price_volatility_spike'
  | 'price_update_failed'
  | 'assertion_created'
  | 'assertion_expiring'
  | 'assertion_disputed'
  | 'assertion_settled'
  | 'dispute_created'
  | 'dispute_resolved'
  | 'voting_period_ending'
  | 'sync_error'
  | 'sync_stale'
  | 'rpc_failure'
  | 'contract_error'
  | 'high_latency'
  | 'low_uptime'
  | 'rate_limit_hit'
  | 'liveness_expiring'
  | 'contract_paused'
  | 'sync_backlog'
  | 'backlog_assertions'
  | 'backlog_disputes'
  | 'market_stale'
  | 'execution_delayed'
  | 'low_participation'
  | 'high_vote_divergence'
  | 'high_dispute_rate'
  | 'slow_api_request'
  | 'high_error_rate'
  | 'database_slow_query'
  | 'low_gas';

export type AlertRule = {
  id: string;
  name: string;
  enabled: boolean;
  event: AlertEvent;
  severity: AlertSeverity;
  protocols?: OracleProtocol[];
  chains?: SupportedChain[];
  instances?: string[];
  symbols?: string[];
  params?: Record<string, unknown> & {
    priceDeviationPercent?: number;
    stalenessSeconds?: number;
    minConfidence?: number;
    maxLatencyMs?: number;
    uptimeThreshold?: number;
  };
  channels?: Array<'webhook' | 'email' | 'telegram' | 'slack' | 'pagerduty'>;
  recipients?: string[];
  cooldownMinutes?: number;
  maxNotificationsPerHour?: number;
  runbook?: string;
  owner?: string;
  silencedUntil?: string | null;
};

export type Alert = {
  id: number | string;
  ruleId?: string;
  fingerprint?: string;
  event?: AlertEvent;
  type?: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  protocol?: OracleProtocol;
  chain?: SupportedChain;
  instanceId?: string;
  symbol?: string;
  entityType?: string | null;
  entityId?: string | null;
  assertionId?: string;
  disputeId?: string;
  context?: Record<string, unknown>;
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string | null;
  resolvedBy?: string;
  resolvedAt?: string | null;
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
};

export type IncidentStatus = 'Open' | 'Mitigating' | 'Resolved';

export type Incident = {
  id: number;
  title: string;
  status: IncidentStatus;
  severity: AlertSeverity;
  owner: string | null;
  rootCause: string | null;
  summary: string | null;
  runbook: string | null;
  alertIds: number[];
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};
