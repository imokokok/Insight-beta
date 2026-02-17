'use client';

import useSWR from 'swr';

import { buildApiUrl } from '@/shared/utils';

import type { AlertSource, AlertSeverity } from '../types';

export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';
export type GroupBy = 'severity' | 'source' | 'none';

export interface AlertHistoryPoint {
  timestamp: string;
  count: number;
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
  price_anomaly?: number;
  cross_chain?: number;
  security?: number;
}

export interface AlertHeatmapCell {
  source: AlertSource;
  hour: number;
  day: number;
  count: number;
  severity: AlertSeverity;
}

export interface AlertHistoryStats {
  totalAlerts: number;
  avgPerHour: number;
  peakHour: number;
  peakCount: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercent: number;
}

export interface AlertHistoryResponse {
  success: boolean;
  data: {
    trend: AlertHistoryPoint[];
    heatmap: AlertHeatmapCell[];
    stats: AlertHistoryStats;
  };
  timestamp: string;
}

export interface UseAlertHistoryOptions {
  timeRange?: TimeRange;
  groupBy?: GroupBy;
  source?: AlertSource | 'all';
  severity?: AlertSeverity | 'all';
}

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

export function useAlertHistory(options: UseAlertHistoryOptions = {}) {
  const { timeRange = '24h', groupBy = 'none', source = 'all', severity = 'all' } = options;

  const params: Record<string, string> = {
    timeRange,
    groupBy,
  };
  if (source !== 'all') params.source = source;
  if (severity !== 'all') params.severity = severity;

  const url = buildApiUrl('/api/alerts/history', params);

  return useSWR<AlertHistoryResponse>(
    url,
    (url: string) => fetcher<AlertHistoryResponse>(url),
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
    },
  );
}

export function useAlertHistoryStats(options: UseAlertHistoryOptions = {}) {
  const { timeRange = '24h' } = options;
  const params: Record<string, string> = { timeRange };
  const url = buildApiUrl('/api/alerts/history/stats', params);

  return useSWR<AlertHistoryResponse>(
    url,
    (url: string) => fetcher<AlertHistoryResponse>(url),
    {
      refreshInterval: 60000,
    },
  );
}
