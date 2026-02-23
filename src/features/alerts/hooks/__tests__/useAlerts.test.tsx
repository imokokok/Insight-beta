import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';

import { useAlerts, useAlertsSummary } from '../useAlerts';
import type { AlertsResponse, UnifiedAlert } from '../../types';

const mockAlerts: UnifiedAlert[] = [
  {
    id: 'alert-1',
    source: 'price_anomaly',
    timestamp: '2024-01-01T00:00:00Z',
    severity: 'critical',
    status: 'active',
    title: 'Price Deviation Detected',
    description: 'Large price deviation between chains',
    symbol: 'BTC',
    chainA: 'ethereum',
    chainB: 'arbitrum',
    deviation: 0.05,
  },
  {
    id: 'alert-2',
    source: 'cross_chain',
    timestamp: '2024-01-01T01:00:00Z',
    severity: 'high',
    status: 'investigating',
    title: 'Cross-Chain Price Deviation',
    description: 'Significant price deviation detected',
    symbol: 'ETH',
  },
  {
    id: 'alert-3',
    source: 'security',
    timestamp: '2024-01-01T02:00:00Z',
    severity: 'medium',
    status: 'resolved',
    title: 'Suspicious Activity',
    description: 'Suspicious activity detected',
  },
];

const mockAlertsResponse: AlertsResponse = {
  success: true,
  data: {
    alerts: mockAlerts,
    summary: {
      total: 3,
      critical: 1,
      high: 1,
      medium: 1,
      low: 0,
      active: 1,
      resolved: 1,
      bySource: {
        price_anomaly: 1,
        cross_chain: 1,
        security: 1,
      },
    },
  },
  timestamp: '2024-01-01T00:00:00Z',
};

const createWrapper = () => {
  return ({ children }: { children: ReactNode }) => (
    <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>{children}</SWRConfig>
  );
};

const mockFetch = vi.fn();

global.fetch = mockFetch;

vi.mock('@/components/common/DashboardToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('useAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fetching alerts', () => {
    it('should fetch alerts successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlertsResponse,
      });

      const { result } = renderHook(() => useAlerts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.alerts).toHaveLength(3);
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('should return correct data structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlertsResponse,
      });

      const { result } = renderHook(() => useAlerts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const data = result.current.data!;
      expect(data.alerts).toBeDefined();
      expect(data.summary).toBeDefined();
    });

    it('should set loading to true during fetch', async () => {
      let resolvePromise: (value: unknown) => void;
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      const { result } = renderHook(() => useAlerts(), {
        wrapper: createWrapper(),
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => mockAlertsResponse,
        });
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('filtering', () => {
    it('should fetch with source filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlertsResponse,
      });

      renderHook(() => useAlerts({ source: 'price_anomaly' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const fetchUrl = mockFetch.mock.calls[0]?.[0];
      expect(fetchUrl).toContain('source=price_anomaly');
    });

    it('should fetch with severity filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlertsResponse,
      });

      renderHook(() => useAlerts({ severity: 'critical' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const fetchUrl = mockFetch.mock.calls[0]?.[0];
      expect(fetchUrl).toContain('severity=critical');
    });

    it('should fetch with status filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlertsResponse,
      });

      renderHook(() => useAlerts({ status: 'active' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const fetchUrl = mockFetch.mock.calls[0]?.[0];
      expect(fetchUrl).toContain('status=active');
    });

    it('should fetch with multiple filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlertsResponse,
      });

      renderHook(
        () =>
          useAlerts({
            source: 'security',
            severity: 'high',
            status: 'active',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const fetchUrl = mockFetch.mock.calls[0]?.[0];
      expect(fetchUrl).toContain('source=security');
      expect(fetchUrl).toContain('severity=high');
      expect(fetchUrl).toContain('status=active');
    });

    it('should not include filter params when set to all', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlertsResponse,
      });

      renderHook(() => useAlerts({ source: 'all', severity: 'all', status: 'all' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const fetchUrl2 = mockFetch.mock.calls[0]?.[0];
      expect(fetchUrl2).not.toContain('source=');
      expect(fetchUrl2).not.toContain('severity=');
      expect(fetchUrl2).not.toContain('status=');
    });
  });

  describe('error handling', () => {
    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' }),
      });

      const { result } = renderHook(() => useAlerts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error).toContain('Internal Server Error');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAlerts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error).toContain('Network error');
    });

    it('should handle error response with code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden', code: 'ACCESS_DENIED' }),
      });

      const { result } = renderHook(() => useAlerts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error).toContain('Forbidden');
    });

    it('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const { result } = renderHook(() => useAlerts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error).toContain('HTTP 500');
    });
  });

  describe('data validation', () => {
    it('should handle empty alerts array', async () => {
      const emptyResponse: AlertsResponse = {
        success: true,
        data: {
          alerts: [],
          summary: {
            total: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            active: 0,
            resolved: 0,
            bySource: {
              price_anomaly: 0,
              cross_chain: 0,
              security: 0,
            },
          },
        },
        timestamp: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => emptyResponse,
      });

      const { result } = renderHook(() => useAlerts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.alerts).toHaveLength(0);
      expect(result.current.data?.summary.total).toBe(0);
    });
  });

  describe('auto refresh', () => {
    it('should return auto refresh controls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlertsResponse,
      });

      const { result } = renderHook(() => useAlerts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.autoRefreshEnabled).toBe(true);
      expect(result.current.refreshInterval).toBe(30000);
      expect(result.current.timeUntilRefresh).toBeDefined();
      expect(typeof result.current.setAutoRefreshEnabled).toBe('function');
      expect(typeof result.current.setRefreshInterval).toBe('function');
      expect(typeof result.current.refresh).toBe('function');
    });

    it('should respect initial autoRefreshEnabled option', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlertsResponse,
      });

      const { result } = renderHook(() => useAlerts({ autoRefreshEnabled: false }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.autoRefreshEnabled).toBe(false);
    });

    it('should respect custom refresh interval', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlertsResponse,
      });

      const { result } = renderHook(() => useAlerts({ autoRefreshInterval: 60000 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.refreshInterval).toBe(60000);
    });
  });
});

describe('useAlertsSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('should fetch alerts summary', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAlertsResponse,
    });

    const { result } = renderHook(() => useAlertsSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data?.data.summary).toBeDefined();
  });

  it('should call correct endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAlertsResponse,
    });

    renderHook(() => useAlertsSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const fetchUrl = mockFetch.mock.calls[0]?.[0];
    expect(fetchUrl).toContain('/api/alerts/summary');
  });
});
