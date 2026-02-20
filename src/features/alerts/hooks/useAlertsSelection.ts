'use client';

import { useAlertSelection } from './useAlertSelection';

import type { UnifiedAlert } from '../types';

export interface UseAlertsSelectionOptions {
  alerts: UnifiedAlert[];
  maxSelections?: number;
}

export interface UseAlertsSelectionReturn {
  selectedIds: Set<string>;
  selectedAlerts: UnifiedAlert[];
  selectedCount: number;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  handleSelect: (alertId: string) => void;
  handleSelectAll: () => void;
  deselectAll: () => void;
  isSelected: (alertId: string) => boolean;
}

export function useAlertsSelection(options: UseAlertsSelectionOptions): UseAlertsSelectionReturn {
  const { alerts, maxSelections } = options;

  const {
    selectedIds,
    selectedAlerts,
    selectedCount,
    isAllSelected,
    isIndeterminate,
    toggleSelection,
    deselectAll,
    toggleSelectAll,
    isSelected,
  } = useAlertSelection({ alerts, maxSelections });

  return {
    selectedIds,
    selectedAlerts,
    selectedCount,
    isAllSelected,
    isIndeterminate,
    handleSelect: toggleSelection,
    handleSelectAll: toggleSelectAll,
    deselectAll,
    isSelected,
  };
}
