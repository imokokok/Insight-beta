import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useAutoRefresh } from '../useAutoRefresh';

vi.mock('@/config/refreshStrategy', () => ({
  getRefreshStrategy: vi.fn(() => ({ interval: 0, enabled: true })),
  formatLastUpdated: vi.fn((date) => (date ? 'just now' : 'never')),
}));

vi.mock('@/shared/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('useAutoRefresh', () => {
  let mockFetchFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockFetchFn = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state after mount', async () => {
      const { result } = renderHook(() =>
        useAutoRefresh({
          pageId: 'test-page',
          fetchFn: mockFetchFn,
          enabled: false,
        }),
      );

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.lastUpdated).not.toBeNull();
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('refresh functionality', () => {
    it('should call fetchFn on mount', async () => {
      renderHook(() =>
        useAutoRefresh({
          pageId: 'test-page',
          fetchFn: mockFetchFn,
          enabled: false,
        }),
      );

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockFetchFn).toHaveBeenCalled();
    });

    it('should update lastUpdated on successful fetch', async () => {
      const { result } = renderHook(() =>
        useAutoRefresh({
          pageId: 'test-page',
          fetchFn: mockFetchFn,
          enabled: false,
        }),
      );

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.lastUpdated).not.toBeNull();
      expect(result.current.isRefreshing).toBe(false);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Fetch failed');
      mockFetchFn.mockRejectedValueOnce(error);

      const { result } = renderHook(() =>
        useAutoRefresh({
          pageId: 'test-page',
          fetchFn: mockFetchFn,
          enabled: false,
        }),
      );

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(error);
    });
  });

  describe('manual refresh', () => {
    it('should refresh when refresh() is called', async () => {
      const { result } = renderHook(() =>
        useAutoRefresh({
          pageId: 'test-page',
          fetchFn: mockFetchFn,
          enabled: false,
        }),
      );

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      const initialCallCount = mockFetchFn.mock.calls.length;

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockFetchFn).toHaveBeenCalledTimes(initialCallCount + 1);
    });
  });

  describe('cancel functionality', () => {
    it('should have cancel function', () => {
      const { result } = renderHook(() =>
        useAutoRefresh({
          pageId: 'test-page',
          fetchFn: mockFetchFn,
        }),
      );

      expect(result.current.cancel).toBeDefined();
      expect(typeof result.current.cancel).toBe('function');
    });

    it('should reset refreshing state when cancel is called', async () => {
      mockFetchFn.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() =>
        useAutoRefresh({
          pageId: 'test-page',
          fetchFn: mockFetchFn,
        }),
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      act(() => {
        result.current.cancel();
      });

      expect(result.current.isRefreshing).toBe(false);
    });
  });

  describe('request deduplication', () => {
    it('should not make duplicate requests while refreshing', async () => {
      let resolvePromise: () => void;
      mockFetchFn.mockImplementation(
        () => new Promise<void>((resolve) => {
          resolvePromise = resolve;
        }),
      );

      const { result } = renderHook(() =>
        useAutoRefresh({
          pageId: 'test-page',
          fetchFn: mockFetchFn,
          enabled: false,
        }),
      );

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      act(() => {
        result.current.refresh();
        result.current.refresh();
        result.current.refresh();
      });

      expect(mockFetchFn).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolvePromise!();
        await vi.runAllTimersAsync();
      });
    });
  });

  describe('auto refresh interval', () => {
    it('should not auto refresh when disabled', async () => {
      renderHook(() =>
        useAutoRefresh({
          pageId: 'test-page',
          fetchFn: mockFetchFn,
          enabled: false,
          interval: 1000,
        }),
      );

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      const callCountAfterInitial = mockFetchFn.mock.calls.length;

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockFetchFn).toHaveBeenCalledTimes(callCountAfterInitial);
    });
  });
});
