'use client';

import useSWR from 'swr';

import { buildApiUrl } from '@/shared/utils';

import type {
  AlertSource,
  AlertSeverity,
  AlertStatus,
  UnifiedAlert,
  AlertsResponse,
  UseAlertsOptions,
} from '../types';

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData: Record<string, unknown> = await res.json().catch(() => ({}));
    const error = new Error(
      (errorData.error as string) || `HTTP ${res.status}: Failed to fetch data`,
    );
    (error as { code?: string; status?: number }).code =
      (errorData.code as string) || 'FETCH_ERROR';
    (error as { code?: string; status?: number }).status = res.status;
    throw error;
  }
  return res.json() as Promise<T>;
};

export type { AlertSource, AlertSeverity, AlertStatus, UnifiedAlert };

export function useAlerts(options: UseAlertsOptions = {}) {
  const { source = 'all', severity = 'all', status = 'all' } = options;

  const params: Record<string, string> = {};
  if (source !== 'all') params.source = source;
  if (severity !== 'all') params.severity = severity;
  if (status !== 'all') params.status = status;

  const url = buildApiUrl('/api/alerts', Object.keys(params).length > 0 ? params : undefined);

  return useSWR<AlertsResponse>(url, (url: string) => fetcher<AlertsResponse>(url), {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });
}

export function useAlertsSummary() {
  const url = buildApiUrl('/api/alerts/summary');
  return useSWR<AlertsResponse>(url, (url: string) => fetcher<AlertsResponse>(url), {
    refreshInterval: 60000,
  });
}
