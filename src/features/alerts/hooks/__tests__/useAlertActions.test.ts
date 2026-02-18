import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useAlertActions, getActionStatus, getActionLabel } from '../useAlertActions';
import type { AlertAction, AlertActionResponse } from '../useAlertActions';
import type { UnifiedAlert } from '../../types';

const mockAlert: UnifiedAlert = {
  id: 'alert-1',
  source: 'price_anomaly',
  timestamp: '2024-01-01T00:00:00Z',
  severity: 'critical',
  status: 'active',
  title: 'Price Deviation Detected',
  description: 'Large price deviation between chains',
  symbol: 'BTC',
};

const mockUpdatedAlert: UnifiedAlert = {
  ...mockAlert,
  status: 'investigating',
  acknowledgedAt: '2024-01-01T01:00:00Z',
};

const mockFetch = vi.fn();

global.fetch = mockFetch;

describe('useAlertActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAlertActions());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastAction).toBeNull();
    });
  });

  describe('acknowledge action', () => {
    it('should successfully acknowledge an alert', async () => {
      const mockResponse: AlertActionResponse = {
        success: true,
        data: {
          alert: mockUpdatedAlert,
          message: 'Alert acknowledged successfully',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAlertActions());

      let response: AlertActionResponse;
      await act(async () => {
        response = await result.current.executeAction('alert-1', {
          action: 'acknowledge',
        });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/alerts/alert-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'acknowledge' }),
      });

      expect(response!).toEqual(mockResponse);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastAction).toBe('acknowledge');
    });

    it('should call onSuccess callback on successful acknowledge', async () => {
      const onSuccess = vi.fn();
      const mockResponse: AlertActionResponse = {
        success: true,
        data: {
          alert: mockUpdatedAlert,
          message: 'Alert acknowledged successfully',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAlertActions({ onSuccess }));

      await act(async () => {
        await result.current.executeAction('alert-1', {
          action: 'acknowledge',
        });
      });

      expect(onSuccess).toHaveBeenCalledWith('acknowledge', mockUpdatedAlert);
    });

    it('should include note in acknowledge request', async () => {
      const mockResponse: AlertActionResponse = {
        success: true,
        data: {
          alert: mockUpdatedAlert,
          message: 'Alert acknowledged successfully',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAlertActions());

      await act(async () => {
        await result.current.executeAction('alert-1', {
          action: 'acknowledge',
          note: 'Investigating the issue',
        });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/alerts/alert-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'acknowledge',
          note: 'Investigating the issue',
        }),
      });
    });
  });

  describe('resolve action', () => {
    it('should successfully resolve an alert', async () => {
      const resolvedAlert: UnifiedAlert = {
        ...mockAlert,
        status: 'resolved',
        resolvedAt: '2024-01-01T02:00:00Z',
      };

      const mockResponse: AlertActionResponse = {
        success: true,
        data: {
          alert: resolvedAlert,
          message: 'Alert resolved successfully',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAlertActions());

      await act(async () => {
        await result.current.executeAction('alert-1', {
          action: 'resolve',
        });
      });

      expect(result.current.lastAction).toBe('resolve');
    });
  });

  describe('silence action', () => {
    it('should successfully silence an alert with duration', async () => {
      const mockResponse: AlertActionResponse = {
        success: true,
        data: {
          alert: mockAlert,
          message: 'Alert silenced successfully',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAlertActions());

      await act(async () => {
        await result.current.executeAction('alert-1', {
          action: 'silence',
          duration: 60,
        });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/alerts/alert-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'silence',
          duration: 60,
        }),
      });
    });
  });

  describe('error handling', () => {
    it('should handle HTTP error response', async () => {
      const mockResponse: AlertActionResponse = {
        success: false,
        error: 'Alert not found',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAlertActions());

      await act(async () => {
        await result.current.executeAction('non-existent', {
          action: 'acknowledge',
        });
      });

      expect(result.current.error).toBe('Alert not found');
      expect(result.current.isLoading).toBe(false);
    });

    it('should call onError callback on failure', async () => {
      const onError = vi.fn();
      const mockResponse: AlertActionResponse = {
        success: false,
        error: 'Permission denied',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAlertActions({ onError }));

      await act(async () => {
        await result.current.executeAction('alert-1', {
          action: 'acknowledge',
        });
      });

      expect(onError).toHaveBeenCalledWith('acknowledge', 'Permission denied');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAlertActions());

      await act(async () => {
        await result.current.executeAction('alert-1', {
          action: 'acknowledge',
        });
      });

      expect(result.current.error).toBe('Network error');
    });

    it('should handle unknown errors', async () => {
      mockFetch.mockRejectedValueOnce('Unknown error');

      const { result } = renderHook(() => useAlertActions());

      await act(async () => {
        await result.current.executeAction('alert-1', {
          action: 'acknowledge',
        });
      });

      expect(result.current.error).toBe('An unexpected error occurred');
    });

    it('should handle response with success: false but ok: true', async () => {
      const mockResponse: AlertActionResponse = {
        success: false,
        error: 'Action failed',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAlertActions());

      await act(async () => {
        await result.current.executeAction('alert-1', {
          action: 'acknowledge',
        });
      });

      expect(result.current.error).toBe('Action failed');
    });
  });

  describe('loading state', () => {
    it('should set isLoading to true during request', async () => {
      let resolvePromise: (value: unknown) => void;
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      const { result } = renderHook(() => useAlertActions());

      act(() => {
        result.current.executeAction('alert-1', { action: 'acknowledge' });
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => ({ success: true, data: { alert: mockAlert, message: 'OK' } }),
        });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should reset error on new request', async () => {
      mockFetch.mockRejectedValueOnce(new Error('First error'));

      const { result } = renderHook(() => useAlertActions());

      await act(async () => {
        await result.current.executeAction('alert-1', { action: 'acknowledge' });
      });

      expect(result.current.error).toBe('First error');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { alert: mockAlert, message: 'OK' },
        }),
      });

      await act(async () => {
        await result.current.executeAction('alert-1', { action: 'resolve' });
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('lastAction tracking', () => {
    it('should update lastAction on each request', async () => {
      const mockResponse: AlertActionResponse = {
        success: true,
        data: { alert: mockAlert, message: 'OK' },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAlertActions());

      await act(async () => {
        await result.current.executeAction('alert-1', { action: 'acknowledge' });
      });

      expect(result.current.lastAction).toBe('acknowledge');

      await act(async () => {
        await result.current.executeAction('alert-1', { action: 'resolve' });
      });

      expect(result.current.lastAction).toBe('resolve');
    });
  });
});

describe('getActionStatus', () => {
  it('should return investigating for acknowledge action', () => {
    expect(getActionStatus('acknowledge')).toBe('investigating');
  });

  it('should return resolved for resolve action', () => {
    expect(getActionStatus('resolve')).toBe('resolved');
  });

  it('should return active for silence action', () => {
    expect(getActionStatus('silence')).toBe('active');
  });
});

describe('getActionLabel', () => {
  it('should return correct label for acknowledge', () => {
    expect(getActionLabel('acknowledge')).toBe('Acknowledge');
  });

  it('should return correct label for resolve', () => {
    expect(getActionLabel('resolve')).toBe('Resolve');
  });

  it('should return correct label for silence', () => {
    expect(getActionLabel('silence')).toBe('Silence');
  });

  it('should return the action itself for unknown actions', () => {
    expect(getActionLabel('unknown' as AlertAction)).toBe('unknown');
  });
});
