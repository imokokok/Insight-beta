'use client';

import { useState, useCallback, useEffect } from 'react';

import { Activity, TrendingUp, Network, Shield } from 'lucide-react';

import { useAlertRules, useNotificationChannels, useAlertHistory } from '../hooks';
import { useAlertsData } from './useAlertsData';
import { useAlertsExport } from './useAlertsExport';
import { useAlertsFilter } from './useAlertsFilter';
import { useAlertsSelection } from './useAlertsSelection';

import type { TimeRange, GroupBy } from './useAlertHistory';
import type { UnifiedAlert, AlertSeverity, AlertStatus, AlertSource } from '../types';
import type { AlertTriangle } from 'lucide-react';

export type { UnifiedAlert, AlertSeverity, AlertStatus, AlertSource };
export type { AlertsData } from './useAlertsData';

export const sourceIcons: Record<AlertSource | 'all', typeof AlertTriangle> = {
  all: Activity,
  price_anomaly: TrendingUp,
  cross_chain: Network,
  security: Shield,
};

export function useAlertsPage() {
  const [selectedAlert, setSelectedAlert] = useState<UnifiedAlert | null>(null);
  const [historyTimeRange, setHistoryTimeRange] = useState<TimeRange>('24h');
  const [historyGroupBy, setHistoryGroupBy] = useState<GroupBy>('none');

  const alertsData = useAlertsData();

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

  const alertsFilter = useAlertsFilter({
    alerts: alertsData.data?.alerts || [],
  });

  const alertsSelection = useAlertsSelection({
    alerts: alertsFilter.filteredAlerts,
  });

  const alertsExport = useAlertsExport({
    data: alertsData.data,
    filteredAlerts: alertsFilter.filteredAlerts,
  });

  const handleBatchActionComplete = useCallback(
    (_processed: number, _failed: number) => {
      alertsData.fetchData(false);
    },
    [alertsData],
  );

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  return {
    loading: alertsData.loading,
    data: alertsData.data,
    selectedAlert,
    setSelectedAlert,
    activeTab: alertsFilter.activeTab,
    setActiveTab: alertsFilter.setActiveTab,
    searchQuery: alertsFilter.searchQuery,
    setSearchQuery: alertsFilter.setSearchQuery,
    filterSeverity: alertsFilter.filterSeverity,
    setFilterSeverity: alertsFilter.setFilterSeverity,
    filterStatus: alertsFilter.filterStatus,
    setFilterStatus: alertsFilter.setFilterStatus,
    lastUpdated: alertsData.lastUpdated,
    error: alertsData.error,
    sortMode: alertsFilter.sortMode,
    setSortMode: alertsFilter.setSortMode,
    groupMode: alertsFilter.groupMode,
    setGroupMode: alertsFilter.setGroupMode,
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
    autoRefreshEnabled: alertsData.autoRefreshEnabled,
    setAutoRefreshEnabled: alertsData.setAutoRefreshEnabled,
    refreshInterval: alertsData.refreshInterval,
    setRefreshInterval: alertsData.setRefreshInterval,
    timeUntilRefresh: alertsData.timeUntilRefresh,
    refresh: alertsData.refresh,
    fetchData: alertsData.fetchData,
    filteredAlerts: alertsFilter.filteredAlerts,
    alertGroups: alertsFilter.alertGroups,
    selectedAlerts: alertsSelection.selectedAlerts,
    isAllSelected: alertsSelection.isAllSelected,
    isIndeterminate: alertsSelection.isIndeterminate,
    toggleSelection: alertsSelection.handleSelect,
    deselectAll: alertsSelection.deselectAll,
    toggleSelectAll: alertsSelection.handleSelectAll,
    isSelected: alertsSelection.isSelected,
    handleBatchActionComplete,
    handleExport: alertsExport.exportToJSON,
    exportToCSV: alertsExport.exportToCSV,
    exportToJSON: alertsExport.exportToJSON,
  };
}
