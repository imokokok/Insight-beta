'use client';

import useSWR from 'swr';

import { defaultSwrConfig } from '@/shared/config/swr';
import { buildApiUrl } from '@/shared/utils';
import { fetchApiData } from '@/shared/utils/api';

import type {
  AlertSource,
  AlertSeverity,
  AlertStatus,
  UnifiedAlert,
  AlertsResponse,
  UseAlertsOptions,
} from '../types';

export type { AlertSource, AlertSeverity, AlertStatus, UnifiedAlert };

export function useAlerts(options: UseAlertsOptions = {}) {
  const { source = 'all', severity = 'all', status = 'all' } = options;

  const params: Record<string, string> = {};
  if (source !== 'all') params.source = source;
  if (severity !== 'all') params.severity = severity;
  if (status !== 'all') params.status = status;

  const url = buildApiUrl('/api/alerts', Object.keys(params).length > 0 ? params : undefined);

  return useSWR<AlertsResponse>(url, (url: string) => fetchApiData<AlertsResponse>(url), {
    ...defaultSwrConfig,
    refreshInterval: 30000,
  });
}

export function useAlertsSummary() {
  const url = buildApiUrl('/api/alerts/summary');
  return useSWR<AlertsResponse>(url, (url: string) => fetchApiData<AlertsResponse>(url), {
    ...defaultSwrConfig,
    refreshInterval: 60000,
  });
}
