import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBatchOperations } from './useBatchOperations';

describe('useBatchOperations', () => {
  interface TestItem {
    id: string;
    name: string;
    value: number;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderTestHook = <T>(hook: () => T) => {
    return renderHook(hook);
  };

  describe('Initial State', () => {
    it('should start with empty items', () => {
      const { result } = renderTestHook(() => useBatchOperations<TestItem>());

      expect(result.current.items).toEqual([]);
      expect(result.current.selectedItems).toEqual([]);
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.isAllSelected).toBe(false);
      expect(result.current.isIndeterminate).toBe(false);
    });
  });

  describe('setItems', () => {
    it('should set items with correct structure', () => {
      const { result } = renderTestHook(() => useBatchOperations<TestItem>());

      act(() => {
        result.current.setItems([
          { id: '1', data: { id: '1', name: 'Test 1', value: 100 }, selected: false },
          { id: '2', data: { id: '2', name: 'Test 2', value: 200 }, selected: false },
        ]);
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.items[0]).toHaveProperty('id', '1');
      expect(result.current.items[0]).toHaveProperty('selected', false);
      expect(result.current.items[0]).toHaveProperty('data');
    });
  });

  describe('toggleSelect', () => {
    it('should toggle item selection', () => {
      const { result } = renderTestHook(() => useBatchOperations<TestItem>());

      act(() => {
        result.current.setItems([
          { id: '1', data: { id: '1', name: 'Test 1', value: 100 }, selected: false },
          { id: '2', data: { id: '2', name: 'Test 2', value: 200 }, selected: false },
        ]);
      });

      act(() => {
        result.current.toggleSelect('1');
      });
      expect(result.current.items[0]?.selected).toBe(true);

      act(() => {
        result.current.toggleSelect('1');
      });
      expect(result.current.items[0]?.selected).toBe(false);
    });

    it('should not throw for non-existent items', () => {
      const { result } = renderTestHook(() => useBatchOperations<TestItem>());

      expect(() => act(() => result.current.toggleSelect('non-existent'))).not.toThrow();
      expect(result.current.items).toEqual([]);
    });
  });

  describe('toggleSelectAll', () => {
    it('should select all items when none are selected', () => {
      const { result } = renderTestHook(() => useBatchOperations<TestItem>());

      act(() => {
        result.current.setItems([
          { id: '1', data: { id: '1', name: 'Test 1', value: 100 }, selected: false },
          { id: '2', data: { id: '2', name: 'Test 2', value: 200 }, selected: false },
        ]);
      });

      act(() => {
        result.current.toggleSelectAll();
      });

      expect(result.current.isAllSelected).toBe(true);
      expect(result.current.items.every((item) => item.selected)).toBe(true);
    });

    it('should deselect all items when all are selected', () => {
      const { result } = renderTestHook(() => useBatchOperations<TestItem>());

      act(() => {
        result.current.setItems([
          { id: '1', data: { id: '1', name: 'Test 1', value: 100 }, selected: false },
          { id: '2', data: { id: '2', name: 'Test 2', value: 200 }, selected: false },
        ]);
      });

      act(() => {
        result.current.toggleSelectAll();
      });
      act(() => {
        result.current.toggleSelectAll();
      });

      expect(result.current.isAllSelected).toBe(false);
      expect(result.current.items.every((item) => !item.selected)).toBe(true);
    });
  });

  describe('selectItems', () => {
    it('should select specific items by IDs', () => {
      const { result } = renderTestHook(() => useBatchOperations<TestItem>());

      act(() => {
        result.current.setItems([
          { id: '1', data: { id: '1', name: 'Test 1', value: 100 }, selected: false },
          { id: '2', data: { id: '2', name: 'Test 2', value: 200 }, selected: false },
          { id: '3', data: { id: '3', name: 'Test 3', value: 300 }, selected: false },
        ]);
      });

      act(() => {
        result.current.selectItems(['1', '3']);
      });

      expect(result.current.items[0]?.selected).toBe(true);
      expect(result.current.items[1]?.selected).toBe(false);
      expect(result.current.items[2]?.selected).toBe(true);
    });
  });

  describe('deselectAll', () => {
    it('should deselect all items', () => {
      const { result } = renderTestHook(() => useBatchOperations<TestItem>());

      act(() => {
        result.current.setItems([
          { id: '1', data: { id: '1', name: 'Test 1', value: 100 }, selected: false },
          { id: '2', data: { id: '2', name: 'Test 2', value: 200 }, selected: false },
        ]);
      });

      act(() => {
        result.current.toggleSelectAll();
      });
      expect(result.current.selectedCount).toBe(2);

      act(() => {
        result.current.deselectAll();
      });
      expect(result.current.selectedCount).toBe(0);
    });
  });

  describe('Max Selection Limit', () => {
    it('should respect maxSelectable limit', () => {
      const { result } = renderTestHook(() => useBatchOperations<TestItem>({ maxSelectable: 2 }));

      act(() => {
        result.current.setItems([
          { id: '1', data: { id: '1', name: 'Test 1', value: 100 }, selected: false },
          { id: '2', data: { id: '2', name: 'Test 2', value: 200 }, selected: false },
          { id: '3', data: { id: '3', name: 'Test 3', value: 300 }, selected: false },
        ]);
      });

      act(() => {
        result.current.selectItems(['1', '2', '3']);
      });

      const selectedCount = result.current.items.filter((item) => item.selected).length;
      expect(selectedCount).toBeLessThanOrEqual(2);
    });
  });

  describe('selectedItems', () => {
    it('should return only selected items as data', () => {
      const { result } = renderTestHook(() => useBatchOperations<TestItem>());

      act(() => {
        result.current.setItems([
          { id: '1', data: { id: '1', name: 'Test 1', value: 100 }, selected: false },
          { id: '2', data: { id: '2', name: 'Test 2', value: 200 }, selected: false },
          { id: '3', data: { id: '3', name: 'Test 3', value: 300 }, selected: false },
        ]);
      });

      act(() => {
        result.current.selectItems(['1', '3']);
      });

      expect(result.current.selectedItems).toHaveLength(2);
      expect(result.current.selectedItems[0]?.data.name).toBe('Test 1');
      expect(result.current.selectedItems[1]?.data.name).toBe('Test 3');
    });
  });

  describe('getSelectedIds', () => {
    it('should return IDs of selected items', () => {
      const { result } = renderTestHook(() => useBatchOperations<TestItem>());

      act(() => {
        result.current.setItems([
          { id: '1', data: { id: '1', name: 'Test 1', value: 100 }, selected: false },
          { id: '2', data: { id: '2', name: 'Test 2', value: 200 }, selected: false },
        ]);
      });

      act(() => {
        result.current.toggleSelect('1');
      });

      expect(result.current.getSelectedIds()).toEqual(['1']);
    });
  });

  describe('Indeterminate State', () => {
    it('should be indeterminate when some items are selected', () => {
      const { result } = renderTestHook(() => useBatchOperations<TestItem>());

      act(() => {
        result.current.setItems([
          { id: '1', data: { id: '1', name: 'Test 1', value: 100 }, selected: false },
          { id: '2', data: { id: '2', name: 'Test 2', value: 200 }, selected: false },
        ]);
      });

      act(() => {
        result.current.toggleSelect('1');
      });

      expect(result.current.isAllSelected).toBe(false);
      expect(result.current.isIndeterminate).toBe(true);
    });
  });

  describe('isProcessing', () => {
    it('should track processing state', () => {
      const { result } = renderTestHook(() => useBatchOperations<TestItem>());

      expect(result.current.isProcessing).toBe(false);
    });
  });
});
