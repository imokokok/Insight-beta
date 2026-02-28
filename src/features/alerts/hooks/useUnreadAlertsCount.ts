'use client';

import useSWR from 'swr';

import { defaultSwrConfig } from '@/shared/config/swr';
import { buildApiUrl, fetchApiData } from '@/shared/utils';

import type { AlertsSummary, AlertsResponse } from '../types';

export interface UnreadAlertsCount {
  total: number;
  critical: number;
  high: number;
}

export function useUnreadAlertsCount(): UnreadAlertsCount {
  const url = buildApiUrl('/api/alerts/summary');

  const { data } = useSWR<AlertsResponse>(url, (url: string) => fetchApiData<AlertsResponse>(url), {
    ...defaultSwrConfig,
    refreshInterval: 60000,
    revalidateOnFocus: true,
  });

  const summary: AlertsSummary | undefined = data?.data?.summary;

  return {
    total: summary?.active ?? 0,
    critical: summary?.critical ?? 0,
    high: summary?.high ?? 0,
  };
}
