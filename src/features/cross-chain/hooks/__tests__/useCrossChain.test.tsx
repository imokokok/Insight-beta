import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import React from 'react';

import {
  useCrossChainComparison,
  useCrossChainAlerts,
  useCrossChainDashboard,
  useCrossChainHistory,
} from '../useCrossChain';

import type {
  CrossChainComparisonResult,
  CrossChainDeviationAlertsResponse,
  CrossChainDashboardResponse,
  CrossChainHistoricalResponse,
} from '../../types';

const mockComparisonData: CrossChainComparisonResult = {
  data: {
    symbol: 'ETH',
    baseAsset: 'ETH',
    quoteAsset: 'USD',
    timestamp: '2024-01-01T00:00:00Z',
    pricesByChain: [
      {
        chain: 'ethereum',
        protocol: 'uniswap',
        price: 2000,
        confidence: 0.95,
        timestamp: '2024-01-01T00:00:00Z',
        isStale: false,
      },
      {
        chain: 'arbitrum',
        protocol: 'uniswap',
        price: 2005,
        confidence: 0.92,
        timestamp: '2024-01-01T00:00:00Z',
        isStale: false,
      },
    ],
    statistics: {
      avgPrice: 2002.5,
      medianPrice: 2002.5,
      minPrice: 2000,
      maxPrice: 2005,
      minChain: 'ethereum',
      maxChain: 'arbitrum',
      priceRange: 5,
      priceRangePercent: 0.25,
    },
    deviations: [],
    recommendations: {
      mostReliableChain: 'ethereum',
      reason: 'Highest confidence',
      alternativeChains: ['arbitrum'],
    },
  },
};

const mockAlertsData: CrossChainDeviationAlertsResponse = {
  success: true,
  data: {
    alerts: [
      {
        id: 'alert-1',
        symbol: 'ETH',
        chainA: 'ethereum',
        chainB: 'arbitrum',
        timestamp: '2024-01-01T00:00:00Z',
        deviationPercent: 2.5,
        threshold: 2,
        severity: 'warning',
        status: 'active',
        priceA: 2000,
        priceB: 2050,
        avgPrice: 2025,
      },
    ],
    summary: {
      total: 1,
      critical: 0,
      warning: 1,
    },
  },
  timestamp: '2024-01-01T00:00:00Z',
};

const mockDashboardData: CrossChainDashboardResponse = {
  success: true,
  data: {
    lastUpdated: '2024-01-01T00:00:00Z',
    monitoredSymbols: ['ETH', 'BTC'],
    monitoredChains: ['ethereum', 'arbitrum'],
    activeAlerts: 1,
    priceComparisons: [
      {
        symbol: 'ETH',
        chainsCount: 2,
        priceRangePercent: 0.25,
        status: 'normal',
      },
    ],
    chainHealth: [
      {
        chain: 'ethereum',
        status: 'healthy',
        lastPriceTimestamp: '2024-01-01T00:00:00Z',
      },
    ],
  },
  timestamp: '2024-01-01T00:00:00Z',
};

const mockHistoryData: CrossChainHistoricalResponse = {
  success: true,
  data: {
    symbol: 'ETH',
    analysisType: 'price_deviation',
    startTime: '2024-01-01T00:00:00Z',
    endTime: '2024-01-02T00:00:00Z',
    timeInterval: '1h',
    dataPoints: [
      {
        timestamp: '2024-01-01T00:00:00Z',
        avgPrice: 2000,
        medianPrice: 2000,
        maxDeviation: 0.5,
        pricesByChain: {
          ethereum: 2000,
          arbitrum: 2010,
        },
      },
    ],
    summary: {
      avgPriceRangePercent: 0.25,
      maxObservedDeviation: 2.5,
      convergenceCount: 10,
      divergenceCount: 2,
      significantDeviationCount: 1,
      mostVolatileChain: 'arbitrum',
      mostStableChain: 'ethereum',
    },
  },
  timestamp: '2024-01-01T00:00:00Z',
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>{children}</SWRConfig>
);

describe('useCrossChain', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('useCrossChainComparison', () => {
    it('should fetch cross-chain comparison data successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComparisonData,
      } as Response);

      const { result } = renderHook(() => useCrossChainComparison('ETH'), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockComparisonData);
        expect(result.current.error).toBeUndefined();
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/cross-chain/comparison?symbol=ETH');
    });

    it('should include chains parameter when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComparisonData,
      } as Response);

      const { result } = renderHook(
        () => useCrossChainComparison('ETH', ['ethereum', 'arbitrum']),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockComparisonData);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/cross-chain/comparison?symbol=ETH&chains=ethereum%2Carbitrum',
      );
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error', code: 'SERVER_ERROR' }),
      } as Response);

      const { result } = renderHook(() => useCrossChainComparison('ETH'), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect(result.current.error?.message).toBe('Internal Server Error');
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useCrossChainComparison('ETH'), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect(result.current.error?.message).toBe('Network error');
      });
    });

    it('should handle HTTP error without error message in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({}),
      } as Response);

      const { result } = renderHook(() => useCrossChainComparison('ETH'), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect(result.current.error?.message).toBe('HTTP 404: Failed to fetch data');
      });
    });
  });

  describe('useCrossChainAlerts', () => {
    it('should fetch cross-chain alerts data successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlertsData,
      } as Response);

      const { result } = renderHook(() => useCrossChainAlerts(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockAlertsData);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/cross-chain/alerts');
    });

    it('should handle alerts fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Service Unavailable', code: 'SERVICE_ERROR' }),
      } as Response);

      const { result } = renderHook(() => useCrossChainAlerts(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect(result.current.error?.message).toBe('Service Unavailable');
      });
    });
  });

  describe('useCrossChainDashboard', () => {
    it('should fetch dashboard data successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDashboardData,
      } as Response);

      const { result } = renderHook(() => useCrossChainDashboard(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockDashboardData);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/cross-chain/dashboard');
    });

    it('should handle dashboard fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized', code: 'AUTH_ERROR' }),
      } as Response);

      const { result } = renderHook(() => useCrossChainDashboard(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
    });
  });

  describe('useCrossChainHistory', () => {
    it('should fetch historical data with required parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistoryData,
      } as Response);

      const { result } = renderHook(() => useCrossChainHistory('ETH'), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockHistoryData);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/cross-chain/history?symbol=ETH');
    });

    it('should include optional parameters in URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistoryData,
      } as Response);

      const { result } = renderHook(
        () => useCrossChainHistory('ETH', '2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z', '1h'),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockHistoryData);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/cross-chain/history?symbol=ETH'),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('startTime=2024-01-01T00%3A00%3A00Z'),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('endTime=2024-01-02T00%3A00%3A00Z'),
      );
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('interval=1h'));
    });

    it('should handle history fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid parameters', code: 'BAD_REQUEST' }),
      } as Response);

      const { result } = renderHook(() => useCrossChainHistory('ETH'), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect(result.current.error?.message).toBe('Invalid parameters');
      });
    });
  });

  describe('data transformation', () => {
    it('should correctly parse comparison data structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComparisonData,
      } as Response);

      const { result } = renderHook(() => useCrossChainComparison('ETH'), { wrapper });

      await waitFor(() => {
        const data = result.current.data;
        expect(data?.data.symbol).toBe('ETH');
        expect(data?.data.pricesByChain).toHaveLength(2);
        expect(data?.data.statistics.avgPrice).toBe(2002.5);
        expect(data?.data.recommendations.mostReliableChain).toBe('ethereum');
      });
    });

    it('should correctly parse alerts data structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlertsData,
      } as Response);

      const { result } = renderHook(() => useCrossChainAlerts(), { wrapper });

      await waitFor(() => {
        const data = result.current.data;
        expect(data?.success).toBe(true);
        expect(data?.data?.alerts).toHaveLength(1);
        expect(data?.data?.summary?.total).toBe(1);
        expect(data?.data?.alerts?.[0]?.severity).toBe('warning');
      });
    });

    it('should correctly parse dashboard data structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDashboardData,
      } as Response);

      const { result } = renderHook(() => useCrossChainDashboard(), { wrapper });

      await waitFor(() => {
        const data = result.current.data;
        expect(data?.success).toBe(true);
        expect(data?.data?.monitoredSymbols).toContain('ETH');
        expect(data?.data?.chainHealth?.[0]?.status).toBe('healthy');
      });
    });

    it('should correctly parse history data structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistoryData,
      } as Response);

      const { result } = renderHook(() => useCrossChainHistory('ETH'), { wrapper });

      await waitFor(() => {
        const data = result.current.data;
        expect(data?.success).toBe(true);
        expect(data?.data.dataPoints).toHaveLength(1);
        expect(data?.data.summary.mostVolatileChain).toBe('arbitrum');
      });
    });
  });

  describe('error handling', () => {
    it('should include error code in error object', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error', code: 'INTERNAL_ERROR' }),
      } as Response);

      const { result } = renderHook(() => useCrossChainComparison('ETH'), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect((result.current.error as { code?: string }).code).toBe('INTERNAL_ERROR');
        expect((result.current.error as { status?: number }).status).toBe(500);
      });
    });

    it('should use default error code when not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      } as Response);

      const { result } = renderHook(() => useCrossChainComparison('ETH'), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect((result.current.error as { code?: string }).code).toBe('FETCH_ERROR');
      });
    });

    it('should handle JSON parse error in error response', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const { result } = renderHook(() => useCrossChainComparison('ETH'), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
    });
  });
});
