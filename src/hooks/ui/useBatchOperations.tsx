'use client';

import React from 'react';
import { Check, Square, Trash2, Download, AlertCircle, Loader2 } from 'lucide-react';

interface BatchOperationItem {
  id: string;
  selected: boolean;
  data: Record<string, unknown>;
}

interface BatchOperationConfig {
  maxSelectable?: number;
  requireConfirmation?: boolean;
  confirmationThreshold?: number;
}

interface BatchOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface UseBatchOperationsReturn<T> {
  items: BatchOperationItem[];
  selectedItems: T[];
  selectedCount: number;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  isProcessing: boolean;
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  selectItems: (ids: string[]) => void;
  deselectAll: () => void;
  setItems: (items: Array<{ id: string; data: Record<string, unknown> }>) => void;
  processBatch: (
    processor: (items: T[]) => Promise<BatchOperationResult<T>>,
    options?: { onProgress?: (completed: number, total: number) => void },
  ) => Promise<BatchOperationResult<T[]>>;
  getSelectedIds: () => string[];
}

export function useBatchOperations<T extends { id: string }>(
  config: BatchOperationConfig = {},
): UseBatchOperationsReturn<T> {
  const { maxSelectable = 100, requireConfirmation = true, confirmationThreshold = 10 } = config;

  const itemsRef: BatchOperationItem[] = [];
  const selectedItemsRef: T[] = [];
  let isProcessingRef = false;

  const computeSelected = () => {
    const nextSelected = itemsRef.filter((i) => i.selected).map((i) => i.data) as T[];
    selectedItemsRef.length = 0;
    selectedItemsRef.push(...nextSelected);
  };

  const setItemsState = (updater: (prev: BatchOperationItem[]) => BatchOperationItem[]) => {
    const next = updater(itemsRef.map((i) => ({ ...i })));
    itemsRef.length = 0;
    itemsRef.push(...next);
    computeSelected();
  };

  const getSelectedCount = () => itemsRef.filter((i) => i.selected).length;
  const getIsAllSelected = () => itemsRef.length > 0 && getSelectedCount() === itemsRef.length;
  const getIsIndeterminate = () => {
    const c = getSelectedCount();
    return c > 0 && c < itemsRef.length;
  };

  const toggleSelect = (id: string) => {
    setItemsState((prevItems) => {
      const currentSelected = prevItems.filter((item) => item.selected).length;
      const idx = prevItems.findIndex((item) => item.id === id);
      if (idx === -1) return prevItems;
      const next = prevItems.map((item) => ({ ...item }));
      const item = next[idx];
      if (!item) return prevItems;
      if (item.selected) {
        item.selected = false;
        return next;
      }
      if (currentSelected >= maxSelectable) {
        console.warn(`Maximum of ${maxSelectable} items can be selected`);
        return prevItems;
      }
      item.selected = true;
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (getIsAllSelected()) {
      setItemsState((prevItems) => prevItems.map((item) => ({ ...item, selected: false })));
    } else {
      setItemsState((prevItems) =>
        prevItems.slice(0, maxSelectable).map((item) => ({ ...item, selected: true })),
      );
    }
  };

  const selectItems = (ids: string[]) => {
    setItemsState((prevItems) =>
      prevItems.map((item) => (ids.includes(item.id) ? { ...item, selected: true } : item)),
    );
  };

  const deselectAll = () => {
    setItemsState((prevItems) => prevItems.map((item) => ({ ...item, selected: false })));
  };

  const processBatch = async (
    processor: (items: T[]) => Promise<BatchOperationResult<T>>,
    options?: { onProgress?: (completed: number, total: number) => void },
  ): Promise<BatchOperationResult<T[]>> => {
    isProcessingRef = true;
    const selectedItems = selectedItemsRef;
    const selectedCount = getSelectedCount();
    const toProcess =
      selectedItems.length > 0 ? selectedItems : (itemsRef.map((i) => i.data) as T[]);
    if (toProcess.length === 0) {
      queueMicrotask(() => {
        isProcessingRef = false;
      });
      return { success: false, error: 'No items available' };
    }
    if (requireConfirmation && selectedCount >= confirmationThreshold) {
      let confirmed = true;
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        confirmed = window.confirm(
          `Are you sure you want to process ${selectedCount} items? This action cannot be undone.`,
        );
      }
      if (!confirmed) {
        queueMicrotask(() => {
          isProcessingRef = false;
        });
        return { success: false, error: 'Operation cancelled by user' };
      }
    }
    try {
      const results: T[] = [];
      const result = await processor(toProcess);
      if (!result.success) {
        console.error('Batch processing failed:', result.error);
      } else if (result.data) {
        results.push(result.data);
      }
      computeSelected();
      options?.onProgress?.(selectedItemsRef.length, selectedItemsRef.length);
      setItemsState((prevItems) =>
        prevItems.map((item) =>
          results.find((r) => r.id === item.data.id) ? { ...item, selected: false } : item,
        ),
      );
      return { success: true, data: results };
    } catch (error) {
      console.error('Batch processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    } finally {
      queueMicrotask(() => {
        isProcessingRef = false;
      });
    }
  };

  const getSelectedIds = () => itemsRef.filter((item) => item.selected).map((item) => item.id);

  const api: Partial<UseBatchOperationsReturn<T>> = {};
  Object.defineProperties(api, {
    items: { get: () => itemsRef },
    selectedItems: { get: () => selectedItemsRef },
    selectedCount: { get: () => getSelectedCount() },
    isAllSelected: { get: () => getIsAllSelected() },
    isIndeterminate: { get: () => getIsIndeterminate() },
    isProcessing: { get: () => isProcessingRef },
  });
  api.toggleSelect = toggleSelect;
  api.toggleSelectAll = toggleSelectAll;
  api.selectItems = selectItems;
  api.deselectAll = deselectAll;
  api.setItems = (newItems: Array<{ id: string; data: Record<string, unknown> }>) => {
    itemsRef.length = 0;
    itemsRef.push(
      ...newItems.map((item) => ({
        id: item.id,
        selected: false,
        data: item.data,
      })),
    );
    computeSelected();
  };
  api.processBatch = processBatch;
  api.getSelectedIds = getSelectedIds;
  return api as UseBatchOperationsReturn<T>;
}

interface BatchOperationsToolbarProps {
  selectedCount: number;
  totalCount: number;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  isProcessing: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onProcess: () => void;
  onExport: () => void;
  onDelete?: () => void;
  processingLabel?: string;
  selectedActions?: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: 'primary' | 'danger';
  }>;
}

export function BatchOperationsToolbar({
  selectedCount,
  totalCount,
  isAllSelected,
  isIndeterminate: _isIndeterminate,
  isProcessing,
  onSelectAll,
  onDeselectAll,
  onProcess,
  onExport,
  onDelete,
  processingLabel = 'Processing...',
  selectedActions = [],
}: BatchOperationsToolbarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white shadow-lg">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={isAllSelected ? onDeselectAll : onSelectAll}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              aria-label={isAllSelected ? 'Deselect all' : 'Select all'}
            >
              {isAllSelected ? (
                <Check className="h-4 w-4 text-purple-600" />
              ) : (
                <Square className="h-4 w-4 text-gray-400" />
              )}
              <span>
                {selectedCount} of {totalCount} selected
              </span>
            </button>

            {isProcessing && (
              <div className="flex items-center gap-2 text-sm text-purple-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{processingLabel}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedActions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={`flex min-h-[44px] touch-manipulation items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  action.variant === 'danger'
                    ? 'text-red-600 hover:bg-red-50 active:bg-red-100'
                    : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                }`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}

            {onDelete && (
              <button
                onClick={onDelete}
                className="flex min-h-[44px] touch-manipulation items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 active:bg-red-100"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}

            {onExport && (
              <button
                onClick={onExport}
                className="flex min-h-[44px] touch-manipulation items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 active:bg-gray-200"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            )}

            <button
              onClick={onProcess}
              disabled={isProcessing}
              className="flex min-h-[44px] touch-manipulation items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50"
            >
              <AlertCircle className="h-4 w-4" />
              Process
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BatchActionConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger';
  isProcessing?: boolean;
  itemCount: number;
}

export function BatchActionConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isProcessing = false,
  itemCount,
}: BatchActionConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in w-full max-w-md rounded-2xl bg-white p-6 shadow-xl duration-200">
        <div className="mb-4 flex items-center gap-3">
          {variant === 'danger' ? (
            <div className="rounded-full bg-red-100 p-2">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          ) : (
            <div className="rounded-full bg-purple-100 p-2">
              <AlertCircle className="h-6 w-6 text-purple-600" />
            </div>
          )}
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>

        <p className="mb-6 text-gray-600">{description}</p>

        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <p className="mb-1 text-sm text-gray-500">Items to be processed:</p>
          <p className="text-2xl font-bold text-gray-900">{itemCount}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 rounded-lg bg-gray-100 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className={`flex-1 rounded-lg px-4 py-2.5 font-medium transition-colors disabled:opacity-50 ${
              variant === 'danger'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface BatchProgressTrackerProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
}

export function BatchProgressTracker({
  current,
  total,
  label = 'Processing items',
  showPercentage = true,
}: BatchProgressTrackerProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {showPercentage && <span className="text-sm text-gray-500">{percentage}%</span>}
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-purple-600 transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={total}
        />
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {current} of {total} items processed
      </p>
    </div>
  );
}
