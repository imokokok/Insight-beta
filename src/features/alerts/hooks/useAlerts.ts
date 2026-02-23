'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import useSWR from 'swr';

import { useToast } from '@/components/common/DashboardToast';
import { defaultSwrConfig } from '@/shared/config/swr';
import { logger } from '@/shared/logger';
import { buildApiUrl, fetchApiData } from '@/shared/utils';

import type {
  AlertSource,
  AlertSeverity,
  AlertStatus,
  AlertsSummary,
  UnifiedAlert,
  AlertsResponse,
} from '../types';

export type { AlertSource, AlertSeverity, AlertStatus, UnifiedAlert };

export interface AlertsData {
  alerts: UnifiedAlert[];
  summary: AlertsSummary;
}

export interface UseAlertsOptions {
  source?: AlertSource | 'all';
  severity?: AlertSeverity | 'all';
  status?: AlertStatus | 'all';
  autoRefreshInterval?: number;
  autoRefreshEnabled?: boolean;
  showToast?: boolean;
}

export interface UseAlertsReturn {
  loading: boolean;
  data: AlertsData | null;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
  autoRefreshEnabled: boolean;
  setAutoRefreshEnabled: (enabled: boolean) => void;
  refreshInterval: number;
  setRefreshInterval: (interval: number) => void;
  timeUntilRefresh: number;
}

export function useAlerts(options: UseAlertsOptions = {}): UseAlertsReturn {
  const {
    source = 'all',
    severity = 'all',
    status = 'all',
    autoRefreshInterval = 30000,
    autoRefreshEnabled: initialAutoRefreshEnabled = true,
    showToast = false,
  } = options;

  const { error: showError } = useToast();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoEnabled, setAutoEnabled] = useState(initialAutoRefreshEnabled);
  const [refreshInterval, setRefreshInterval] = useState(autoRefreshInterval);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(autoRefreshInterval);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const params: Record<string, string> = {};
  if (source !== 'all') params.source = source;
  if (severity !== 'all') params.severity = severity;
  if (status !== 'all') params.status = status;

  const url = buildApiUrl('/api/alerts', Object.keys(params).length > 0 ? params : undefined);

  const {
    data: response,
    error: swrError,
    isLoading,
    mutate,
  } = useSWR<AlertsResponse>(url, (url: string) => fetchApiData<AlertsResponse>(url), {
    ...defaultSwrConfig,
    refreshInterval: 0,
    onSuccess: () => {
      setLastUpdated(new Date());
    },
  });

  const data: AlertsData | null = response?.data || null;
  const error = swrError?.message || null;

  const refresh = useCallback(() => {
    mutate().catch((err) => {
      logger.error('Failed to refresh alerts', { error: err });
      if (showToast) {
        showError('Failed to refresh', err instanceof Error ? err.message : 'Unknown error');
      }
    });
    setTimeUntilRefresh(refreshInterval);
  }, [mutate, showToast, showError, refreshInterval]);

  useEffect(() => {
    if (!autoEnabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      refresh();
    }, refreshInterval);

    countdownRef.current = setInterval(() => {
      setTimeUntilRefresh((prev) => {
        if (prev <= 1000) {
          return refreshInterval;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [autoEnabled, refreshInterval, refresh]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
      } else if (autoEnabled) {
        refresh();
        intervalRef.current = setInterval(refresh, refreshInterval);
        countdownRef.current = setInterval(() => {
          setTimeUntilRefresh((prev) => {
            if (prev <= 1000) {
              return refreshInterval;
            }
            return prev - 1000;
          });
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [autoEnabled, refreshInterval, refresh]);

  return {
    loading: isLoading,
    data,
    error,
    lastUpdated,
    refresh,
    autoRefreshEnabled: autoEnabled,
    setAutoRefreshEnabled: setAutoEnabled,
    refreshInterval,
    setRefreshInterval,
    timeUntilRefresh,
  };
}

export function useAlertsSummary() {
  const url = buildApiUrl('/api/alerts/summary');
  return useSWR<AlertsResponse>(url, (url: string) => fetchApiData<AlertsResponse>(url), {
    ...defaultSwrConfig,
    refreshInterval: 60000,
  });
}
