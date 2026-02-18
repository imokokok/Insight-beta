import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import React from 'react';

import { useArbitrage, useBridgeStatus, useCorrelation, useLiquidity } from '../useArbitrage';

import type {
  ArbitrageResponse,
  BridgesResponse,
  CorrelationResponse,
  LiquidityResponse,
} from '../../types';

const mockArbitrageData: ArbitrageResponse = {
  success: true,
  opportunities: [
    {
      id: 'arb-1',
      symbol: 'ETH',
      buyChain: 'ethereum',
      sellChain: 'arbitrum',
      buyPrice: 2000,
      sellPrice: 2050,
      priceDiffPercent: 2.5,
      estimatedProfit: 45,
      gasCostEstimate: 5,
      netProfit: 40,
      riskLevel: 'low',
      confidence: 0.92,
      timestamp: '2024-01-01T00:00:00Z',
      isActionable: true,
      warnings: [],
    },
    {
      id: 'arb-2',
      symbol: 'BTC',
      buyChain: 'ethereum',
      sellChain: 'polygon',
      buyPrice: 40000,
      sellPrice: 40800,
      priceDiffPercent: 2.0,
      estimatedProfit: 750,
      gasCostEstimate: 50,
      netProfit: 700,
      riskLevel: 'medium',
      confidence: 0.85,
      timestamp: '2024-01-01T00:00:00Z',
      isActionable: true,
      warnings: ['High gas costs on destination chain'],
    },
    {
      id: 'arb-3',
      symbol: 'ETH',
      buyChain: 'optimism',
      sellChain: 'base',
      buyPrice: 1995,
      sellPrice: 1998,
      priceDiffPercent: 0.15,
      estimatedProfit: 2,
      gasCostEstimate: 3,
      netProfit: -1,
      riskLevel: 'high',
      confidence: 0.6,
      timestamp: '2024-01-01T00:00:00Z',
      isActionable: false,
      warnings: ['Negative net profit', 'Low confidence'],
    },
  ],
  summary: {
    total: 3,
    actionable: 2,
    avgProfitPercent: 1.55,
    totalEstimatedProfit: 740,
  },
  meta: {
    timestamp: '2024-01-01T00:00:00Z',
    filters: {},
  },
};

const mockBridgesData: BridgesResponse = {
  success: true,
  bridges: [
    {
      name: 'stargate',
      displayName: 'Stargate',
      status: 'healthy',
      latencyMs: 150,
      feePercent: 0.05,
      supportedChains: ['ethereum', 'arbitrum', 'optimism', 'polygon'],
      volume24h: 5000000,
      lastUpdated: '2024-01-01T00:00:00Z',
      alerts: [],
    },
    {
      name: 'across',
      displayName: 'Across Protocol',
      status: 'degraded',
      latencyMs: 500,
      feePercent: 0.03,
      supportedChains: ['ethereum', 'arbitrum', 'optimism'],
      volume24h: 2000000,
      lastUpdated: '2024-01-01T00:00:00Z',
      alerts: ['High latency detected'],
    },
  ],
  summary: {
    total: 2,
    healthy: 1,
    degraded: 1,
    offline: 0,
    avgLatencyMs: 325,
    totalVolume24h: 7000000,
  },
  meta: {
    timestamp: '2024-01-01T00:00:00Z',
  },
};

const mockCorrelationData: CorrelationResponse = {
  success: true,
  chains: ['ethereum', 'arbitrum', 'polygon'],
  matrix: [
    [1.0, 0.98, 0.95],
    [0.98, 1.0, 0.97],
    [0.95, 0.97, 1.0],
  ],
  correlations: [
    { chain1: 'ethereum', chain2: 'arbitrum', correlation: 0.98, sampleSize: 1000 },
    { chain1: 'ethereum', chain2: 'polygon', correlation: 0.95, sampleSize: 950 },
    { chain1: 'arbitrum', chain2: 'polygon', correlation: 0.97, sampleSize: 900 },
  ],
  meta: {
    symbol: 'ETH',
    timeRange: '24h',
    timestamp: '2024-01-01T00:00:00Z',
  },
};

const mockLiquidityData: LiquidityResponse = {
  success: true,
  chains: [
    {
      chain: 'ethereum',
      displayName: 'Ethereum',
      totalLiquidity: 5000000000,
      liquidityChange24h: 2.5,
      topPools: [
        { symbol: 'ETH/USDC', liquidity: 1000000000, share: 20 },
        { symbol: 'ETH/USDT', liquidity: 800000000, share: 16 },
      ],
      avgSlippage: 0.01,
      avgFee: 0.3,
    },
    {
      chain: 'arbitrum',
      displayName: 'Arbitrum',
      totalLiquidity: 1000000000,
      liquidityChange24h: 5.0,
      topPools: [{ symbol: 'ETH/USDC', liquidity: 300000000, share: 30 }],
      avgSlippage: 0.02,
      avgFee: 0.05,
    },
  ],
  summary: {
    totalLiquidity: 6000000000,
    avgLiquidity: 3000000000,
    topChain: 'ethereum',
    liquidityChange24h: 3.0,
  },
  meta: {
    timestamp: '2024-01-01T00:00:00Z',
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>{children}</SWRConfig>
);

describe('useArbitrage', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('useArbitrage', () => {
    it('should fetch arbitrage opportunities successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockArbitrageData,
      } as Response);

      const { result } = renderHook(() => useArbitrage(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockArbitrageData);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/cross-chain/arbitrage');
    });

    it('should include symbol parameter when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockArbitrageData,
      } as Response);

      const { result } = renderHook(() => useArbitrage('ETH'), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockArbitrageData);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/cross-chain/arbitrage?symbol=ETH');
    });

    it('should include minProfitPercent parameter when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockArbitrageData,
      } as Response);

      const { result } = renderHook(() => useArbitrage(undefined, 1.5), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockArbitrageData);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/cross-chain/arbitrage?minProfitPercent=1.5');
    });

    it('should include both parameters when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockArbitrageData,
      } as Response);

      const { result } = renderHook(() => useArbitrage('ETH', 2.0), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockArbitrageData);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/cross-chain/arbitrage?symbol=ETH&minProfitPercent=2',
      );
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error', code: 'SERVER_ERROR' }),
      } as Response);

      const { result } = renderHook(() => useArbitrage(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect(result.current.error?.message).toBe('Internal Server Error');
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useArbitrage(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect(result.current.error?.message).toBe('Network error');
      });
    });
  });

  describe('useBridgeStatus', () => {
    it('should fetch bridge status successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBridgesData,
      } as Response);

      const { result } = renderHook(() => useBridgeStatus(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockBridgesData);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/cross-chain/bridges');
    });

    it('should handle bridge status fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Service Unavailable', code: 'SERVICE_ERROR' }),
      } as Response);

      const { result } = renderHook(() => useBridgeStatus(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect(result.current.error?.message).toBe('Service Unavailable');
      });
    });
  });

  describe('useCorrelation', () => {
    it('should fetch correlation data successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCorrelationData,
      } as Response);

      const { result } = renderHook(() => useCorrelation(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockCorrelationData);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/cross-chain/correlation');
    });

    it('should include symbol parameter when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCorrelationData,
      } as Response);

      const { result } = renderHook(() => useCorrelation('ETH'), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockCorrelationData);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/cross-chain/correlation?symbol=ETH');
    });

    it('should include timeRange parameter when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCorrelationData,
      } as Response);

      const { result } = renderHook(() => useCorrelation(undefined, '7d'), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockCorrelationData);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/cross-chain/correlation?timeRange=7d');
    });

    it('should include both parameters when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCorrelationData,
      } as Response);

      const { result } = renderHook(() => useCorrelation('ETH', '24h'), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockCorrelationData);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/cross-chain/correlation?symbol=ETH&timeRange=24h',
      );
    });

    it('should handle correlation fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid parameters', code: 'BAD_REQUEST' }),
      } as Response);

      const { result } = renderHook(() => useCorrelation(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect(result.current.error?.message).toBe('Invalid parameters');
      });
    });
  });

  describe('useLiquidity', () => {
    it('should fetch liquidity data successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLiquidityData,
      } as Response);

      const { result } = renderHook(() => useLiquidity(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockLiquidityData);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/cross-chain/liquidity');
    });

    it('should handle liquidity fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized', code: 'AUTH_ERROR' }),
      } as Response);

      const { result } = renderHook(() => useLiquidity(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect(result.current.error?.message).toBe('Unauthorized');
      });
    });
  });

  describe('data filtering', () => {
    it('should correctly filter actionable opportunities', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockArbitrageData,
      } as Response);

      const { result } = renderHook(() => useArbitrage(), { wrapper });

      await waitFor(() => {
        const data = result.current.data;
        const actionable = data?.opportunities.filter((o) => o.isActionable);
        expect(actionable).toHaveLength(2);
        expect(actionable?.map((o) => o.id)).toEqual(['arb-1', 'arb-2']);
      });
    });

    it('should correctly filter by risk level', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockArbitrageData,
      } as Response);

      const { result } = renderHook(() => useArbitrage(), { wrapper });

      await waitFor(() => {
        const data = result.current.data;
        const lowRisk = data?.opportunities.filter((o) => o.riskLevel === 'low');
        const mediumRisk = data?.opportunities.filter((o) => o.riskLevel === 'medium');
        const highRisk = data?.opportunities.filter((o) => o.riskLevel === 'high');

        expect(lowRisk).toHaveLength(1);
        expect(mediumRisk).toHaveLength(1);
        expect(highRisk).toHaveLength(1);
      });
    });

    it('should correctly filter by profit threshold', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockArbitrageData,
      } as Response);

      const { result } = renderHook(() => useArbitrage(), { wrapper });

      await waitFor(() => {
        const data = result.current.data;
        const profitable = data?.opportunities.filter((o) => o.netProfit > 0);
        expect(profitable).toHaveLength(2);
      });
    });

    it('should correctly filter bridges by status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBridgesData,
      } as Response);

      const { result } = renderHook(() => useBridgeStatus(), { wrapper });

      await waitFor(() => {
        const data = result.current.data;
        const healthy = data?.bridges.filter((b) => b.status === 'healthy');
        const degraded = data?.bridges.filter((b) => b.status === 'degraded');

        expect(healthy).toHaveLength(1);
        expect(degraded).toHaveLength(1);
      });
    });

    it('should correctly filter opportunities with warnings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockArbitrageData,
      } as Response);

      const { result } = renderHook(() => useArbitrage(), { wrapper });

      await waitFor(() => {
        const data = result.current.data;
        const withWarnings = data?.opportunities.filter((o) => o.warnings.length > 0);
        expect(withWarnings).toHaveLength(2);
      });
    });
  });

  describe('data transformation', () => {
    it('should correctly parse arbitrage data structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockArbitrageData,
      } as Response);

      const { result } = renderHook(() => useArbitrage(), { wrapper });

      await waitFor(() => {
        const data = result.current.data;
        expect(data?.success).toBe(true);
        expect(data?.opportunities).toHaveLength(3);
        expect(data?.summary.total).toBe(3);
        expect(data?.summary.actionable).toBe(2);
      });
    });

    it('should correctly parse bridge data structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBridgesData,
      } as Response);

      const { result } = renderHook(() => useBridgeStatus(), { wrapper });

      await waitFor(() => {
        const data = result.current.data;
        expect(data?.success).toBe(true);
        expect(data?.bridges).toHaveLength(2);
        expect(data?.summary.totalVolume24h).toBe(7000000);
      });
    });

    it('should correctly parse correlation matrix', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCorrelationData,
      } as Response);

      const { result } = renderHook(() => useCorrelation(), { wrapper });

      await waitFor(() => {
        const data = result.current.data;
        expect(data?.success).toBe(true);
        expect(data?.chains).toHaveLength(3);
        expect(data?.matrix).toHaveLength(3);
        expect(data?.correlations).toHaveLength(3);
      });
    });

    it('should correctly parse liquidity data structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLiquidityData,
      } as Response);

      const { result } = renderHook(() => useLiquidity(), { wrapper });

      await waitFor(() => {
        const data = result.current.data;
        expect(data?.success).toBe(true);
        expect(data?.chains).toHaveLength(2);
        expect(data?.summary.topChain).toBe('ethereum');
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

      const { result } = renderHook(() => useArbitrage(), { wrapper });

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

      const { result } = renderHook(() => useArbitrage(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect((result.current.error as { code?: string }).code).toBe('FETCH_ERROR');
      });
    });

    it('should handle HTTP error without error message in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({}),
      } as Response);

      const { result } = renderHook(() => useArbitrage(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect(result.current.error?.message).toBe('HTTP 404: Failed to fetch data');
      });
    });

    it('should handle JSON parse error in error response', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const { result } = renderHook(() => useArbitrage(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
    });
  });
});
