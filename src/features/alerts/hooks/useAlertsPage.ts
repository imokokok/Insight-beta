'use client';

import { useEffect } from 'react';

import { Activity, TrendingUp, Network, Shield } from 'lucide-react';

import { useAlertHistory } from '../hooks';
import { useAlertsActions } from './useAlertsActions';
import { useAlertsData } from './useAlertsData';
import { useAlertSelection } from './useAlertSelection';
import { useAlertsExport } from './useAlertsExport';
import { useAlertsFilter } from './useAlertsFilter';
import { useAlertsState } from './useAlertsState';

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
  const alertsState = useAlertsState();
  const alertsData = useAlertsData();

  const alertsActions = useAlertsActions({
    onDataRefresh: () => alertsData.fetchData(false),
  });

  const { data: historyData, isLoading: historyLoading } = useAlertHistory({
    timeRange: alertsState.historyTimeRange,
    groupBy: alertsState.historyGroupBy,
  });

  const alertsFilter = useAlertsFilter({
    alerts: alertsData.data?.alerts || [],
  });

  const alertsSelection = useAlertSelection({
    alerts: alertsFilter.filteredAlerts,
  });

  const alertsExport = useAlertsExport({
    data: alertsData.data,
    filteredAlerts: alertsFilter.filteredAlerts,
  });

  useEffect(() => {
    alertsActions.fetchChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    loading: alertsData.loading,
    data: alertsData.data,
    selectedAlert: alertsState.selectedAlert,
    setSelectedAlert: alertsState.setSelectedAlert,
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
    historyTimeRange: alertsState.historyTimeRange,
    setHistoryTimeRange: alertsState.setHistoryTimeRange,
    historyGroupBy: alertsState.historyGroupBy,
    setHistoryGroupBy: alertsState.setHistoryGroupBy,
    rules: alertsActions.rules,
    rulesLoading: alertsActions.rulesLoading,
    createRule: alertsActions.createRule,
    updateRule: alertsActions.updateRule,
    deleteRule: alertsActions.deleteRule,
    toggleRule: alertsActions.toggleRule,
    channels: alertsActions.channels,
    channelsLoading: alertsActions.channelsLoading,
    fetchChannels: alertsActions.fetchChannels,
    createChannel: alertsActions.createChannel,
    updateChannel: alertsActions.updateChannel,
    deleteChannel: alertsActions.deleteChannel,
    toggleChannel: alertsActions.toggleChannel,
    testChannel: alertsActions.testChannel,
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
    toggleSelection: alertsSelection.toggleSelection,
    deselectAll: alertsSelection.deselectAll,
    toggleSelectAll: alertsSelection.toggleSelectAll,
    isSelected: alertsSelection.isSelected,
    handleBatchActionComplete: alertsActions.handleBatchActionComplete,
    exportToCSV: alertsExport.exportToCSV,
    exportToJSON: alertsExport.exportToJSON,
  };
}
