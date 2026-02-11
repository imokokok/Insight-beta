import type { TranslationKey } from '@/i18n/translations';
import type { OpsSloStatus } from '@/lib/types/oracleTypes';
import { formatDurationMinutes } from '@/lib/utils';

export type SloEntry = {
  key: string;
  label: string | undefined;
  current: number | null;
  target: number;
};

// RootCauseOption type definition
export type RootCauseOption = {
  value: string;
  label: string;
};

// Format SLO target value
export function formatSloTarget(key: string, value: number): string {
  if (key.includes('Minutes')) {
    return formatDurationMinutes(value);
  }
  return value.toString();
}

// Format SLO current value
export function formatSloValue(key: string, value: number | null): string {
  if (value === null) return '-';
  if (key.includes('Minutes')) {
    return formatDurationMinutes(value);
  }
  return value.toString();
}

// Get entity href
export function getEntityHref(entityType: string, entityId: string): string {
  return `/${entityType}/${entityId}`;
}

// Get safe external URL
export function getSafeExternalUrl(url: string): string {
  if (!url.startsWith('http')) {
    return `https://${url}`;
  }
  return url;
}

// Get safe internal path
export function getSafeInternalPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

// Severity badge component
export function severityBadge(severity: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    critical: { label: 'Critical', color: 'red' },
    high: { label: 'High', color: 'orange' },
    medium: { label: 'Medium', color: 'yellow' },
    low: { label: 'Low', color: 'blue' },
  };
  return map[severity] || { label: severity, color: 'gray' };
}

// SLO status badge
export function sloStatusBadge(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    healthy: { label: 'Healthy', color: 'green' },
    warning: { label: 'Warning', color: 'yellow' },
    critical: { label: 'Critical', color: 'red' },
  };
  return map[status] || { label: status, color: 'gray' };
}

// SLO status label
export function sloStatusLabel(status: string): string {
  const map: Record<string, string> = {
    healthy: 'Healthy',
    warning: 'Warning',
    critical: 'Critical',
  };
  return map[status] || status;
}

// Status badge
export function statusBadge(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    open: { label: 'Open', color: 'red' },
    acknowledged: { label: 'Acknowledged', color: 'yellow' },
    resolved: { label: 'Resolved', color: 'green' },
  };
  return map[status] || { label: status, color: 'gray' };
}

export const sloLabels: Record<string, string> = {
  lagBlocks: 'Sync lag blocks',
  syncStalenessMinutes: 'Sync staleness',
  alertMttaMinutes: 'Alert MTTA',
  alertMttrMinutes: 'Alert MTTR',
  incidentMttrMinutes: 'Incident MTTR',
  openAlerts: 'Open alerts',
  openCriticalAlerts: 'Open critical',
};

export const rootCauseOptions: RootCauseOption[] = [
  { value: '', label: 'Unspecified' },
  { value: 'sync', label: 'Sync' },
  { value: 'rpc', label: 'RPC provider' },
  { value: 'chain', label: 'Chain issue' },
  { value: 'contract', label: 'Contract' },
  { value: 'infra', label: 'Infrastructure' },
  { value: 'config', label: 'Configuration' },
  { value: 'data', label: 'Data quality' },
  { value: 'external', label: 'External dependency' },
  { value: 'unknown', label: 'Unknown' },
];

export const sloAlertTypes = new Set([
  'sync_backlog',
  'sync_error',
  'backlog_assertions',
  'backlog_disputes',
  'stale_sync',
  'contract_paused',
  'market_stale',
  'slow_api_request',
  'high_error_rate',
  'database_slow_query',
]);

export const alertInsightMap: Record<
  string,
  { explanation: TranslationKey; actions: TranslationKey[] }
> = {
  dispute_created: {
    explanation: 'alerts.explanations.dispute_created',
    actions: ['alerts.actions.dispute_created.1', 'alerts.actions.dispute_created.2'],
  },
  liveness_expiring: {
    explanation: 'alerts.explanations.liveness_expiring',
    actions: ['alerts.actions.liveness_expiring.1', 'alerts.actions.liveness_expiring.2'],
  },
  sync_error: {
    explanation: 'alerts.explanations.sync_error',
    actions: ['alerts.actions.sync_error.1', 'alerts.actions.sync_error.2'],
  },
  stale_sync: {
    explanation: 'alerts.explanations.stale_sync',
    actions: ['alerts.actions.stale_sync.1', 'alerts.actions.stale_sync.2'],
  },
  contract_paused: {
    explanation: 'alerts.explanations.contract_paused',
    actions: ['alerts.actions.contract_paused.1', 'alerts.actions.contract_paused.2'],
  },
  sync_backlog: {
    explanation: 'alerts.explanations.sync_backlog',
    actions: ['alerts.actions.sync_backlog.1', 'alerts.actions.sync_backlog.2'],
  },
  backlog_assertions: {
    explanation: 'alerts.explanations.backlog_assertions',
    actions: ['alerts.actions.backlog_assertions.1', 'alerts.actions.backlog_assertions.2'],
  },
  backlog_disputes: {
    explanation: 'alerts.explanations.backlog_disputes',
    actions: ['alerts.actions.backlog_disputes.1', 'alerts.actions.backlog_disputes.2'],
  },
  market_stale: {
    explanation: 'alerts.explanations.market_stale',
    actions: ['alerts.actions.market_stale.1', 'alerts.actions.market_stale.2'],
  },
  execution_delayed: {
    explanation: 'alerts.explanations.execution_delayed',
    actions: ['alerts.actions.execution_delayed.1', 'alerts.actions.execution_delayed.2'],
  },
  low_participation: {
    explanation: 'alerts.explanations.low_participation',
    actions: ['alerts.actions.low_participation.1', 'alerts.actions.low_participation.2'],
  },
  high_vote_divergence: {
    explanation: 'alerts.explanations.high_vote_divergence',
    actions: ['alerts.actions.high_vote_divergence.1', 'alerts.actions.high_vote_divergence.2'],
  },
  high_dispute_rate: {
    explanation: 'alerts.explanations.high_dispute_rate',
    actions: ['alerts.actions.high_dispute_rate.1', 'alerts.actions.high_dispute_rate.2'],
  },
  slow_api_request: {
    explanation: 'alerts.explanations.slow_api_request',
    actions: ['alerts.actions.slow_api_request.1', 'alerts.actions.slow_api_request.2'],
  },
  high_error_rate: {
    explanation: 'alerts.explanations.high_error_rate',
    actions: ['alerts.actions.high_error_rate.1', 'alerts.actions.high_error_rate.2'],
  },
  database_slow_query: {
    explanation: 'alerts.explanations.database_slow_query',
    actions: ['alerts.actions.database_slow_query.1', 'alerts.actions.database_slow_query.2'],
  },
  price_deviation: {
    explanation: 'alerts.explanations.price_deviation',
    actions: ['alerts.actions.price_deviation.1', 'alerts.actions.price_deviation.2'],
  },
  low_gas: {
    explanation: 'alerts.explanations.low_gas',
    actions: ['alerts.actions.low_gas.1', 'alerts.actions.low_gas.2'],
  },
};

export function getSloEntries(slo: OpsSloStatus): SloEntry[] {
  return [
    {
      key: 'lagBlocks',
      label: sloLabels.lagBlocks,
      current: slo.current.lagBlocks,
      target: slo.targets.maxLagBlocks,
    },
    {
      key: 'syncStalenessMinutes',
      label: sloLabels.syncStalenessMinutes,
      current: slo.current.syncStalenessMinutes,
      target: slo.targets.maxSyncStalenessMinutes,
    },
    {
      key: 'alertMttaMinutes',
      label: sloLabels.alertMttaMinutes,
      current: slo.current.alertMttaMinutes,
      target: slo.targets.maxAlertMttaMinutes,
    },
    {
      key: 'alertMttrMinutes',
      label: sloLabels.alertMttrMinutes,
      current: slo.current.alertMttrMinutes,
      target: slo.targets.maxAlertMttrMinutes,
    },
    {
      key: 'incidentMttrMinutes',
      label: sloLabels.incidentMttrMinutes,
      current: slo.current.incidentMttrMinutes,
      target: slo.targets.maxIncidentMttrMinutes,
    },
    {
      key: 'openAlerts',
      label: sloLabels.openAlerts,
      current: slo.current.openAlerts,
      target: slo.targets.maxOpenAlerts,
    },
    {
      key: 'openCriticalAlerts',
      label: sloLabels.openCriticalAlerts,
      current: slo.current.openCriticalAlerts,
      target: slo.targets.maxOpenCriticalAlerts,
    },
  ];
}

export function getInitialInstanceId(): string {
  return 'all';
}
