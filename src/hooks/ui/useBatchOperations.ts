'use client';

import { useState, useCallback, useMemo } from 'react';

export interface BatchItem<T> {
  id: string;
  data: T;
  selected: boolean;
}

export interface UseBatchOperationsOptions {
  maxSelectable?: number;
}

export interface UseBatchOperationsReturn<T> {
  items: BatchItem<T>[];
  selectedItems: BatchItem<T>[];
  selectedCount: number;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  isProcessing: boolean;
  setItems: (items: BatchItem<T>[]) => void;
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  selectItems: (ids: string[]) => void;
  deselectAll: () => void;
  getSelectedIds: () => string[];
}

export function useBatchOperations<T>(
  options?: UseBatchOperationsOptions,
): UseBatchOperationsReturn<T> {
  const [items, setItemsState] = useState<BatchItem<T>[]>([]);
  const [isProcessing] = useState(false);
  const maxSelectable = options?.maxSelectable;

  const selectedItems = useMemo(() => items.filter((item) => item.selected), [items]);

  const selectedCount = useMemo(() => selectedItems.length, [selectedItems]);

  const isAllSelected = useMemo(
    () => items.length > 0 && selectedCount === items.length,
    [items.length, selectedCount],
  );

  const isIndeterminate = useMemo(
    () => selectedCount > 0 && selectedCount < items.length,
    [items.length, selectedCount],
  );

  const setItems = useCallback((newItems: BatchItem<T>[]) => {
    setItemsState(newItems);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setItemsState((prevItems) =>
      prevItems.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item)),
    );
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setItemsState((prevItems) => prevItems.map((item) => ({ ...item, selected: false })));
    } else {
      setItemsState((prevItems) => prevItems.map((item) => ({ ...item, selected: true })));
    }
  }, [isAllSelected]);

  const selectItems = useCallback(
    (ids: string[]) => {
      setItemsState((prevItems) => {
        const currentlySelected = prevItems.filter((item) => item.selected).length;
        const toSelect = ids.filter((id) => !prevItems.find((item) => item.id === id)?.selected);

        const availableSlots = maxSelectable ? maxSelectable - currentlySelected : toSelect.length;
        const idsToSelect = maxSelectable
          ? toSelect.slice(0, Math.max(0, availableSlots))
          : toSelect;

        return prevItems.map((item) =>
          idsToSelect.includes(item.id) ? { ...item, selected: true } : item,
        );
      });
    },
    [maxSelectable],
  );

  const deselectAll = useCallback(() => {
    setItemsState((prevItems) => prevItems.map((item) => ({ ...item, selected: false })));
  }, []);

  const getSelectedIds = useCallback(() => {
    return selectedItems.map((item) => item.id);
  }, [selectedItems]);

  return {
    items,
    selectedItems,
    selectedCount,
    isAllSelected,
    isIndeterminate,
    isProcessing,
    setItems,
    toggleSelect,
    toggleSelectAll,
    selectItems,
    deselectAll,
    getSelectedIds,
  };
}
