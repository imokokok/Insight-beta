'use client';

import { useCallback, useMemo, useState } from 'react';

import type { UnifiedAlert } from '../types';

export interface UseAlertSelectionOptions {
  alerts: UnifiedAlert[];
  maxSelections?: number;
}

export interface UseAlertSelectionReturn {
  selectedIds: Set<string>;
  selectedAlerts: UnifiedAlert[];
  selectedCount: number;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  toggleSelection: (alertId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  toggleSelectAll: () => void;
  isSelected: (alertId: string) => boolean;
  setSelectedIds: (ids: Set<string>) => void;
}

export function useAlertSelection(options: UseAlertSelectionOptions): UseAlertSelectionReturn {
  const { alerts, maxSelections } = options;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedAlerts = useMemo(() => {
    return alerts.filter((alert) => selectedIds.has(alert.id));
  }, [alerts, selectedIds]);

  const selectedCount = selectedIds.size;

  const isAllSelected = useMemo(() => {
    if (alerts.length === 0) return false;
    return alerts.every((alert) => selectedIds.has(alert.id));
  }, [alerts, selectedIds]);

  const isIndeterminate = useMemo(() => {
    return selectedCount > 0 && selectedCount < alerts.length;
  }, [selectedCount, alerts.length]);

  const toggleSelection = useCallback(
    (alertId: string) => {
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(alertId)) {
          newSet.delete(alertId);
        } else {
          if (maxSelections && newSet.size >= maxSelections) {
            return prev;
          }
          newSet.add(alertId);
        }
        return newSet;
      });
    },
    [maxSelections],
  );

  const selectAll = useCallback(() => {
    const idsToSelect = maxSelections
      ? alerts.slice(0, maxSelections).map((alert) => alert.id)
      : alerts.map((alert) => alert.id);
    setSelectedIds(new Set(idsToSelect));
  }, [alerts, maxSelections]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [isAllSelected, selectAll, deselectAll]);

  const isSelected = useCallback(
    (alertId: string) => {
      return selectedIds.has(alertId);
    },
    [selectedIds],
  );

  return {
    selectedIds,
    selectedAlerts,
    selectedCount,
    isAllSelected,
    isIndeterminate,
    toggleSelection,
    selectAll,
    deselectAll,
    toggleSelectAll,
    isSelected,
    setSelectedIds,
  };
}
