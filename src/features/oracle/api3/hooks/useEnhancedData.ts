/**
 * API3 Enhanced Hooks
 * 
 * 提供增强功能的数据 hooks
 */

'use client';

import useSWR from 'swr';

import { buildApiUrl } from '@/shared/utils';
import { fetchApiData } from '@/shared/utils/api';

// ============================================================================
// 价格更新热力图数据
// ============================================================================

export interface PriceUpdateData {
  id: string;
  timestamp: string;
  dapiName: string;
  chain: string;
  value: number;
  delay: number;
  blockNumber: number;
  severity: 'normal' | 'warning' | 'critical';
}

export interface PriceUpdatesResponse {
  updates: PriceUpdateData[];
  metadata: {
    total: number;
    timeRange: string;
    fetchedAt: string;
  };
}

export interface UsePriceUpdatesOptions {
  timeRange?: '1h' | '6h' | '24h' | '7d';
  dapiName?: string;
  refreshInterval?: number;
}

export function usePriceUpdates(options: UsePriceUpdatesOptions = {}) {
  const { timeRange = '24h', dapiName, refreshInterval = 30000 } = options;

  const params = new URLSearchParams();
  params.set('timeRange', timeRange);
  if (dapiName) params.set('dapi', dapiName);

  const url = buildApiUrl(`/api/oracle/api3/price-updates?${params.toString()}`);

  return useSWR<PriceUpdatesResponse>(
    url,
    (url: string) => fetchApiData<PriceUpdatesResponse>(url),
    {
      refreshInterval,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );
}

// ============================================================================
// dAPI 历史趋势数据
// ============================================================================

export interface DapiHistoryData {
  timestamp: string;
  value: number;
  updateCount: number;
  avgDelay: number;
}

export interface DapiHistoryResponse {
  dapiName: string;
  history: DapiHistoryData[];
  metadata: {
    timeRange: string;
    dataPoints: number;
    fetchedAt: string;
  };
}

export interface UseDapiHistoryOptions {
  timeRange?: '1h' | '24h' | '7d' | '30d';
  refreshInterval?: number;
}

export function useDapiHistory(
  dapiName: string,
  options: UseDapiHistoryOptions = {},
) {
  const { timeRange = '24h', refreshInterval = 30000 } = options;

  const params = new URLSearchParams();
  params.set('timeRange', timeRange);

  const url = buildApiUrl(`/api/oracle/api3/dapi-history?dapi=${encodeURIComponent(dapiName)}&${params.toString()}`);

  return useSWR<DapiHistoryResponse>(
    url,
    (url: string) => fetchApiData<DapiHistoryResponse>(url),
    {
      refreshInterval,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      enabled: !!dapiName,
    },
  );
}

// ============================================================================
// 跨链一致性数据
// ============================================================================

export interface ChainDataPoint {
  chain: string;
  value: number;
  timestamp: string;
  delay: number;
  blockNumber: number;
}

export interface CrossChainConsistencyResponse {
  dapiName: string;
  data: ChainDataPoint[];
  metadata: {
    totalChains: number;
    fetchedAt: string;
  };
}

export interface UseCrossChainConsistencyOptions {
  refreshInterval?: number;
}

export function useCrossChainConsistency(
  dapiName: string,
  options: UseCrossChainConsistencyOptions = {},
) {
  const { refreshInterval = 30000 } = options;

  const url = buildApiUrl(`/api/oracle/api3/cross-chain-consistency?dapi=${encodeURIComponent(dapiName)}`);

  return useSWR<CrossChainConsistencyResponse>(
    url,
    (url: string) => fetchApiData<CrossChainConsistencyResponse>(url),
    {
      refreshInterval,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      enabled: !!dapiName,
    },
  );
}
