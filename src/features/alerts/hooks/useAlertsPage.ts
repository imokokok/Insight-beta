'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';

import { Activity, TrendingUp, Network, Shield } from 'lucide-react';

import { useToast } from '@/components/common/DashboardToast';
import { useAutoRefreshWithCountdown, useDataCache } from '@/hooks';
import { useI18n } from '@/i18n/LanguageProvider';
import { logger } from '@/shared/logger';
import { fetchApiData } from '@/shared/utils';

import {
  useAlertRules,
  useAlertSelection,
  useNotificationChannels,
  useAlertHistory,
} from '../hooks';
import { sortAlerts, groupAlerts } from '../utils/alertScoring';

import type { TimeRange, GroupBy } from './useAlertHistory';
import type { UnifiedAlert, AlertSeverity, AlertStatus, AlertSource } from './useAlerts';
import type { SortMode, GroupMode } from '../utils/alertScoring';
import type { AlertTriangle } from 'lucide-react';

interface AlertsData {
  alerts: UnifiedAlert[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    active: number;
    resolved: number;
    bySource: {
      price_anomaly: number;
      cross_chain: number;
      security: number;
    };
  };
}

export const sourceIcons: Record<AlertSource | 'all', typeof AlertTriangle> = {
  all: Activity,
  price_anomaly: TrendingUp,
  cross_chain: Network,
  security: Shield,
};

export function useAlertsPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AlertsData | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<UnifiedAlert | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<AlertStatus | 'all'>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('smart');
  const [groupMode, setGroupMode] = useState<GroupMode>('none');
  const [historyTimeRange, setHistoryTimeRange] = useState<TimeRange>('24h');
  const [historyGroupBy, setHistoryGroupBy] = useState<GroupBy>('none');

  const {
    rules,
    loading: rulesLoading,
    fetchRules,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
  } = useAlertRules();

  const {
    channels,
    loading: channelsLoading,
    fetchChannels,
    createChannel,
    updateChannel,
    deleteChannel,
    toggleChannel,
    testChannel,
  } = useNotificationChannels();

  const { data: historyData, isLoading: historyLoading } = useAlertHistory({
    timeRange: historyTimeRange,
    groupBy: historyGroupBy,
  });

  const { success, error: showError } = useToast();
  const { getCachedData, setCachedData } = useDataCache<{ data: AlertsData }>({
    key: 'alerts_center',
    ttl: 2 * 60 * 1000,
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
    interval: 30000,
    enabled: true,
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

  const filteredAlerts = useMemo(() => {
    if (!data?.alerts) return [];

    let alerts = data.alerts;

    if (activeTab !== 'all') {
      alerts = alerts.filter((a) => a.source === activeTab);
    }

    if (filterSeverity !== 'all') {
      alerts = alerts.filter((a) => a.severity === filterSeverity);
    }

    if (filterStatus !== 'all') {
      alerts = alerts.filter((a) => a.status === filterStatus);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      alerts = alerts.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query) ||
          a.symbol?.toLowerCase().includes(query) ||
          a.chainA?.toLowerCase().includes(query) ||
          a.chainB?.toLowerCase().includes(query),
      );
    }

    return sortAlerts(alerts, sortMode);
  }, [data, activeTab, filterSeverity, filterStatus, searchQuery, sortMode]);

  const alertGroups = useMemo(() => {
    return groupAlerts(filteredAlerts, groupMode);
  }, [filteredAlerts, groupMode]);

  const {
    selectedAlerts,
    isAllSelected,
    isIndeterminate,
    toggleSelection,
    deselectAll,
    toggleSelectAll,
    isSelected,
  } = useAlertSelection({ alerts: filteredAlerts });

  const handleBatchActionComplete = useCallback(
    (_processed: number, _failed: number) => {
      fetchData(false);
    },
    [fetchData],
  );

  const handleExport = useCallback(() => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts-export-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  return {
    loading,
    data,
    selectedAlert,
    setSelectedAlert,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    filterSeverity,
    setFilterSeverity,
    filterStatus,
    setFilterStatus,
    lastUpdated,
    error,
    sortMode,
    setSortMode,
    groupMode,
    setGroupMode,
    historyTimeRange,
    setHistoryTimeRange,
    historyGroupBy,
    setHistoryGroupBy,
    rules,
    rulesLoading,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    channels,
    channelsLoading,
    fetchChannels,
    createChannel,
    updateChannel,
    deleteChannel,
    toggleChannel,
    testChannel,
    historyData,
    historyLoading,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    refreshInterval,
    setRefreshInterval,
    timeUntilRefresh,
    refresh,
    fetchData,
    filteredAlerts,
    alertGroups,
    selectedAlerts,
    isAllSelected,
    isIndeterminate,
    toggleSelection,
    deselectAll,
    toggleSelectAll,
    isSelected,
    handleBatchActionComplete,
    handleExport,
  };
}
