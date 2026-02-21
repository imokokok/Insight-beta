import type { SupportedChain } from '@/types/chains';
import type {
  AlertEvent,
  AlertSeverity,
  AlertStatus,
  NotificationChannelType,
} from '@/types/oracle/alert';
import type { OracleProtocol } from '@/types/oracle/protocol';

export const ALERT_EVENTS: readonly AlertEvent[] = [
  'price_deviation',
  'price_stale',
  'price_volatility_spike',
  'price_update_failed',
  'assertion_created',
  'assertion_expiring',
  'assertion_disputed',
  'assertion_settled',
  'dispute_created',
  'dispute_resolved',
  'voting_period_ending',
  'sync_error',
  'sync_stale',
  'rpc_failure',
  'contract_error',
  'high_latency',
  'low_uptime',
  'rate_limit_hit',
  'liveness_expiring',
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
  'low_gas',
] as const;

export const ALERT_SEVERITIES: readonly AlertSeverity[] = [
  'info',
  'warning',
  'low',
  'medium',
  'high',
  'critical',
  'emergency',
] as const;

export const ALERT_STATUSES: readonly AlertStatus[] = [
  'active',
  'resolved',
  'investigating',
  'acknowledged',
  'silenced',
] as const;

export const NOTIFICATION_CHANNEL_TYPES: readonly NotificationChannelType[] = [
  'webhook',
  'email',
  'telegram',
  'slack',
] as const;

export const ORACLE_PROTOCOLS: readonly OracleProtocol[] = [
  'chainlink',
  'pyth',
  'uma',
  'api3',
  'band',
  'redstone',
] as const;

export function isAlertEvent(value: unknown): value is AlertEvent {
  return typeof value === 'string' && ALERT_EVENTS.includes(value as AlertEvent);
}

export function isAlertSeverity(value: unknown): value is AlertSeverity {
  return typeof value === 'string' && ALERT_SEVERITIES.includes(value as AlertSeverity);
}

export function isAlertStatus(value: unknown): value is AlertStatus {
  return typeof value === 'string' && ALERT_STATUSES.includes(value as AlertStatus);
}

export function isNotificationChannelType(value: unknown): value is NotificationChannelType {
  return (
    typeof value === 'string' &&
    NOTIFICATION_CHANNEL_TYPES.includes(value as NotificationChannelType)
  );
}

export function isOracleProtocol(value: unknown): value is OracleProtocol {
  return typeof value === 'string' && ORACLE_PROTOCOLS.includes(value as OracleProtocol);
}

export function isSupportedChain(
  value: unknown,
  supportedChains: readonly string[],
): value is SupportedChain {
  return typeof value === 'string' && supportedChains.includes(value);
}

export function parseAlertEvent(
  value: unknown,
  defaultValue: AlertEvent = 'price_deviation',
): AlertEvent {
  return isAlertEvent(value) ? value : defaultValue;
}

export function parseAlertSeverity(
  value: unknown,
  defaultValue: AlertSeverity = 'warning',
): AlertSeverity {
  return isAlertSeverity(value) ? value : defaultValue;
}

export function parseAlertStatus(
  value: unknown,
  defaultValue: AlertStatus = 'active',
): AlertStatus {
  return isAlertStatus(value) ? value : defaultValue;
}

export function parseOracleProtocolArray(value: unknown): OracleProtocol[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const filtered = value.filter(isOracleProtocol);
  return filtered.length > 0 ? filtered : undefined;
}

export function parseSupportedChainArray(
  value: unknown,
  supportedChains: readonly string[],
): SupportedChain[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const filtered = value.filter((v): v is SupportedChain => isSupportedChain(v, supportedChains));
  return filtered.length > 0 ? filtered : undefined;
}
