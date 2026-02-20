'use client';

import { useState, useMemo, useCallback } from 'react';

import { sortAlerts, groupAlerts } from '../utils/alertScoring';

import type { UnifiedAlert, AlertSeverity, AlertStatus } from '../types';
import type { SortMode, GroupMode, AlertGroup } from '../utils/alertScoring';

export interface UseAlertsFilterOptions {
  alerts: UnifiedAlert[];
}

export interface UseAlertsFilterReturn {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterSeverity: AlertSeverity | 'all';
  setFilterSeverity: (severity: AlertSeverity | 'all') => void;
  filterStatus: AlertStatus | 'all';
  setFilterStatus: (status: AlertStatus | 'all') => void;
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  groupMode: GroupMode;
  setGroupMode: (mode: GroupMode) => void;
  filteredAlerts: UnifiedAlert[];
  alertGroups: AlertGroup[];
  resetFilters: () => void;
}

const DEFAULT_FILTER_STATE = {
  activeTab: 'all',
  searchQuery: '',
  filterSeverity: 'all' as AlertSeverity | 'all',
  filterStatus: 'all' as AlertStatus | 'all',
  sortMode: 'smart' as SortMode,
  groupMode: 'none' as GroupMode,
};

export function useAlertsFilter(options: UseAlertsFilterOptions): UseAlertsFilterReturn {
  const { alerts } = options;

  const [activeTab, setActiveTab] = useState(DEFAULT_FILTER_STATE.activeTab);
  const [searchQuery, setSearchQuery] = useState(DEFAULT_FILTER_STATE.searchQuery);
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'all'>(
    DEFAULT_FILTER_STATE.filterSeverity,
  );
  const [filterStatus, setFilterStatus] = useState<AlertStatus | 'all'>(
    DEFAULT_FILTER_STATE.filterStatus,
  );
  const [sortMode, setSortMode] = useState<SortMode>(DEFAULT_FILTER_STATE.sortMode);
  const [groupMode, setGroupMode] = useState<GroupMode>(DEFAULT_FILTER_STATE.groupMode);

  const filteredAlerts = useMemo(() => {
    if (!alerts || alerts.length === 0) return [];

    let result = alerts;

    if (activeTab !== 'all') {
      result = result.filter((a) => a.source === activeTab);
    }

    if (filterSeverity !== 'all') {
      result = result.filter((a) => a.severity === filterSeverity);
    }

    if (filterStatus !== 'all') {
      result = result.filter((a) => a.status === filterStatus);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query) ||
          a.symbol?.toLowerCase().includes(query) ||
          a.chainA?.toLowerCase().includes(query) ||
          a.chainB?.toLowerCase().includes(query),
      );
    }

    return sortAlerts(result, sortMode);
  }, [alerts, activeTab, filterSeverity, filterStatus, searchQuery, sortMode]);

  const alertGroups = useMemo(() => {
    return groupAlerts(filteredAlerts, groupMode);
  }, [filteredAlerts, groupMode]);

  const resetFilters = useCallback(() => {
    setActiveTab(DEFAULT_FILTER_STATE.activeTab);
    setSearchQuery(DEFAULT_FILTER_STATE.searchQuery);
    setFilterSeverity(DEFAULT_FILTER_STATE.filterSeverity);
    setFilterStatus(DEFAULT_FILTER_STATE.filterStatus);
    setSortMode(DEFAULT_FILTER_STATE.sortMode);
    setGroupMode(DEFAULT_FILTER_STATE.groupMode);
  }, []);

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    filterSeverity,
    setFilterSeverity,
    filterStatus,
    setFilterStatus,
    sortMode,
    setSortMode,
    groupMode,
    setGroupMode,
    filteredAlerts,
    alertGroups,
    resetFilters,
  };
}
