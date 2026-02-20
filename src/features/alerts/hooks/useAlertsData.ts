'use client';

import { useState, useCallback, useEffect } from 'react';

import { useToast } from '@/components/common/DashboardToast';
import { useAutoRefreshWithCountdown, useDataCache } from '@/hooks';
import { useI18n } from '@/i18n/LanguageProvider';
import { logger } from '@/shared/logger';
import { fetchApiData } from '@/shared/utils';

import type { UnifiedAlert, AlertsSummary } from '../types';

export interface AlertsData {
  alerts: UnifiedAlert[];
  summary: AlertsSummary;
}

export interface UseAlertsDataOptions {
  autoRefreshInterval?: number;
  autoRefreshEnabled?: boolean;
  cacheTTL?: number;
}

export interface UseAlertsDataReturn {
  loading: boolean;
  data: AlertsData | null;
  error: string | null;
  lastUpdated: Date | null;
  fetchData: (showToast?: boolean) => Promise<void>;
  autoRefreshEnabled: boolean;
  setAutoRefreshEnabled: (enabled: boolean) => void;
  refreshInterval: number;
  setRefreshInterval: (interval: number) => void;
  timeUntilRefresh: number;
  refresh: () => void;
}

export function useAlertsData(options: UseAlertsDataOptions = {}): UseAlertsDataReturn {
  const {
    autoRefreshInterval = 30000,
    autoRefreshEnabled: initialAutoRefreshEnabled = true,
    cacheTTL = 2 * 60 * 1000,
  } = options;

  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AlertsData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { success, error: showError } = useToast();
  const { getCachedData, setCachedData } = useDataCache<{ data: AlertsData }>({
    key: 'alerts_center',
    ttl: cacheTTL,
  });

  const {
    isEnabled: autoRefreshEnabled,
    setIsEnabled: setAutoRefreshEnabled,
    refreshInterval,
    setRefreshInterval,
    timeUntilRefresh,
    refresh,
  } = useAutoRefreshWithCountdown({
    onRefresh: () => fetchData(false),
    interval: autoRefreshInterval,
    enabled: initialAutoRefreshEnabled,
    pauseWhenHidden: true,
  });

  const fetchData = useCallback(
    async (showToast = true) => {
      try {
        setLoading(true);
        setError(null);
        const cached = getCachedData();
        if (cached && !lastUpdated) {
          setData(cached.data);
          setLoading(false);
        }
        const response = await fetchApiData<{ data: AlertsData }>('/api/alerts');
        setData(response.data);
        setLastUpdated(new Date());
        setCachedData({ data: response.data });
        if (showToast) {
          success(t('alerts.dataRefreshed'), t('alerts.dataRefreshedDesc'));
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch alerts';
        setError(errorMessage);
        showError(t('alerts.failedToRefresh'), errorMessage);
        logger.error('Failed to fetch alerts', { error: err });
      } finally {
        setLoading(false);
      }
    },
    [getCachedData, setCachedData, lastUpdated, success, showError, t],
  );

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  return {
    loading,
    data,
    error,
    lastUpdated,
    fetchData,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    refreshInterval,
    setRefreshInterval,
    timeUntilRefresh,
    refresh,
  };
}
