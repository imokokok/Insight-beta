import type { AlertSeverity } from '@/features/alerts/types';

export type NormalizedAlertStatus = 'active' | 'resolved' | 'investigating';

export function normalizeSeverity(severity: string): AlertSeverity {
  const mapping: Record<string, AlertSeverity> = {
    info: 'info',
    warning: 'warning',
    low: 'low',
    medium: 'medium',
    high: 'high',
    critical: 'critical',
    emergency: 'critical',
  };
  return mapping[severity.toLowerCase()] || 'medium';
}

export function normalizeStatus(status: string): NormalizedAlertStatus {
  const mapping: Record<string, NormalizedAlertStatus> = {
    active: 'active',
    resolved: 'resolved',
    investigating: 'investigating',
    new: 'active',
    acknowledged: 'investigating',
    closed: 'resolved',
    open: 'active',
    firing: 'active',
    pending: 'investigating',
    silenced: 'resolved',
  };
  return mapping[status.toLowerCase()] || 'active';
}
