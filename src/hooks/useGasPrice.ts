'use client';

import useSWR from 'swr';
import type { SWRConfiguration } from 'swr';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData: Record<string, unknown> = await res.json().catch(() => ({}));
    const error = new Error((errorData.error as string) || `HTTP ${res.status}: Failed to fetch data`);
    (error as { code?: string; status?: number }).code = (errorData.code as string) || 'FETCH_ERROR';
    (error as { code?: string; status?: number }).status = res.status;
    throw error;
  }
  return res.json();
};

export interface GasPriceData {
  chain: string;
  provider: string;
  slow: number;
  average: number;
  fast: number;
  fastest: number;
  timestamp: string;
  baseFee?: number;
  priorityFee?: number;
  currency: string;
}

export interface GasPriceHistoryEntry {
  chain: string;
  provider: string;
  priceLevel: 'slow' | 'average' | 'fast' | 'fastest';
  price: number;
  timestamp: string;
}

export interface GasPriceStatistics {
  chain: string;
  provider: string;
  priceLevel: 'slow' | 'average' | 'fast' | 'fastest';
  min: number;
  max: number;
  avg: number;
  median: number;
  stdDev: number;
  p25: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  count: number;
  startTime: string;
  endTime: string;
}

export interface GasPriceTrend {
  chain: string;
  priceLevel: 'slow' | 'average' | 'fast' | 'fastest';
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  changeValue: number;
  ma7: number;
  ma24: number;
  ma168: number;
  volatility: number;
  timestamp: string;
}

export interface ProviderHealth {
  provider: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  successRate: number;
  avgLatencyMs: number;
  lastSuccessTime: string;
  lastFailureTime?: string;
  consecutiveFailures: number;
  totalRequests: number;
  totalSuccesses: number;
  totalFailures: number;
}

export interface GasPriceHealthResponse {
  ok: boolean;
  data: ProviderHealth[];
  meta: {
    totalProviders: number;
    healthyCount: number;
    degradedCount: number;
    unhealthyCount: number;
  };
}

const DEFAULT_REFRESH_INTERVAL = 30000;
const SWR_CONFIG: SWRConfiguration = {
  revalidateOnFocus: false,
  dedupingInterval: 5000,
  errorRetryCount: 3,
  errorRetryInterval: 3000,
};

export function useGasPrice(
  chain: string | null,
  provider?: string,
  options?: SWRConfiguration<{ ok: boolean; data: GasPriceData }>
) {
  const queryParams = new URLSearchParams();
  if (chain) queryParams.set('chain', chain);
  if (provider) queryParams.set('provider', provider);

  const url = chain ? `/api/gas/price?${queryParams.toString()}` : null;

  return useSWR<{ ok: boolean; data: GasPriceData }>(
    url,
    fetcher,
    {
      refreshInterval: DEFAULT_REFRESH_INTERVAL,
      ...SWR_CONFIG,
      ...options,
    }
  );
}

export function useGasPrices(
  chains: string[],
  options?: SWRConfiguration<{ ok: boolean; data: GasPriceData[] }>
) {
  const queryParams = new URLSearchParams();
  if (chains.length > 0) {
    queryParams.set('chains', chains.join(','));
  }

  const url = chains.length > 0 ? `/api/gas/prices?${queryParams.toString()}` : null;

  return useSWR<{ ok: boolean; data: GasPriceData[] }>(
    url,
    fetcher,
    {
      refreshInterval: DEFAULT_REFRESH_INTERVAL,
      ...SWR_CONFIG,
      ...options,
    }
  );
}

export function useGasPriceHistory(
  chain: string | null,
  provider?: string,
  limit: number = 100,
  options?: SWRConfiguration<{ ok: boolean; data: GasPriceHistoryEntry[]; meta: { count: number; chain: string; provider?: string } }>
) {
  const queryParams = new URLSearchParams();
  if (chain) queryParams.set('chain', chain);
  if (provider) queryParams.set('provider', provider);
  queryParams.set('limit', limit.toString());

  const url = chain ? `/api/gas/history?${queryParams.toString()}` : null;

  return useSWR<{ ok: boolean; data: GasPriceHistoryEntry[]; meta: { count: number; chain: string; provider?: string } }>(
    url,
    fetcher,
    {
      refreshInterval: 60000,
      ...SWR_CONFIG,
      ...options,
    }
  );
}

export function useGasPriceStatistics(
  chain: string | null,
  provider: string | null,
  priceLevel: 'slow' | 'average' | 'fast' | 'fastest' | null,
  options?: SWRConfiguration<{ ok: boolean; data: GasPriceStatistics }>
) {
  const queryParams = new URLSearchParams();
  if (chain) queryParams.set('chain', chain);
  if (provider) queryParams.set('provider', provider);
  if (priceLevel) queryParams.set('priceLevel', priceLevel);

  const url = chain && provider && priceLevel ? `/api/gas/statistics?${queryParams.toString()}` : null;

  return useSWR<{ ok: boolean; data: GasPriceStatistics }>(
    url,
    fetcher,
    {
      refreshInterval: 60000,
      ...SWR_CONFIG,
      ...options,
    }
  );
}

export function useGasPriceTrend(
  chain: string | null,
  priceLevel: 'slow' | 'average' | 'fast' | 'fastest' | null,
  options?: SWRConfiguration<{ ok: boolean; data: GasPriceTrend }>
) {
  const queryParams = new URLSearchParams();
  if (chain) queryParams.set('chain', chain);
  if (priceLevel) queryParams.set('priceLevel', priceLevel);

  const url = chain && priceLevel ? `/api/gas/trend?${queryParams.toString()}` : null;

  return useSWR<{ ok: boolean; data: GasPriceTrend }>(
    url,
    fetcher,
    {
      refreshInterval: 60000,
      ...SWR_CONFIG,
      ...options,
    }
  );
}

export function useGasPriceHealth(
  options?: SWRConfiguration<GasPriceHealthResponse>
) {
  return useSWR<GasPriceHealthResponse>(
    '/api/gas/health',
    fetcher,
    {
      refreshInterval: 60000,
      ...SWR_CONFIG,
      ...options,
    }
  );
}

export function useWarmupGasCache(
  chains: string[],
  mutate?: () => void
) {
  return async () => {
    try {
      const res = await fetch('/api/gas/warmup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chains }),
      });

      if (!res.ok) {
        throw new Error(`Failed to warm up gas cache: ${res.status}`);
      }

      const data = await res.json();
      if (data.ok && mutate) {
        mutate();
      }

      return data;
    } catch (error) {
      console.error('Error warming up gas cache:', error);
      throw error;
    }
  };
}
