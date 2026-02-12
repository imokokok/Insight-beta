/**
 * Comparison Data Hooks
 *
 * P1 优化：使用 SWR 优化跨协议比较数据获取
 * - 自动缓存和去重
 * - 自动重验证
 * - 错误自动重试
 * - 防抖优化
 */

import useSWR from 'swr';

import type {
  ComparisonFilter,
  ComparisonView,
  CostComparison,
  LatencyAnalysis,
  PriceHeatmapData,
  RealtimeComparisonItem,
} from '@/lib/types/oracle/comparison';
import { buildApiUrl } from '@/lib/utils';

import { createSWRConfig, REALTIME_CONFIG } from './useSWRConfig';

// ============================================================================
// 热力图数据 Hook
// ============================================================================

interface UseHeatmapOptions {
  filter: ComparisonFilter;
  enabled?: boolean;
}

export function useHeatmapData({ filter, enabled = true }: UseHeatmapOptions) {
  const cacheKey = enabled ? ['heatmap', filter] : null;

  const { data, error, isLoading, mutate } = useSWR<PriceHeatmapData>(
    cacheKey,
    () => fetchHeatmapData(filter),
    createSWRConfig(),
  );

  return {
    data,
    error,
    isLoading,
    refresh: mutate,
  };
}

async function fetchHeatmapData(filter: ComparisonFilter): Promise<PriceHeatmapData> {
  const url = buildApiUrl('/api/comparison/heatmap', {
    symbols: filter.symbols?.length ? filter.symbols.join(',') : undefined,
    protocols: filter.protocols?.length ? filter.protocols.join(',') : undefined,
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch heatmap data');
  }
  return response.json();
}

// ============================================================================
// 延迟分析数据 Hook
// ============================================================================

interface UseLatencyOptions {
  filter: ComparisonFilter;
  enabled?: boolean;
}

export function useLatencyData({ filter, enabled = true }: UseLatencyOptions) {
  const cacheKey = enabled ? ['latency', filter] : null;

  const { data, error, isLoading, mutate } = useSWR<LatencyAnalysis>(
    cacheKey,
    () => fetchLatencyData(filter),
    createSWRConfig(),
  );

  return {
    data,
    error,
    isLoading,
    refresh: mutate,
  };
}

async function fetchLatencyData(filter: ComparisonFilter): Promise<LatencyAnalysis> {
  const url = buildApiUrl('/api/comparison/latency', {
    symbols: filter.symbols?.length ? filter.symbols.join(',') : undefined,
    protocols: filter.protocols?.length ? filter.protocols.join(',') : undefined,
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch latency data');
  }
  return response.json();
}

// ============================================================================
// 成本分析数据 Hook
// ============================================================================

interface UseCostOptions {
  filter: ComparisonFilter;
  enabled?: boolean;
}

export function useCostData({ filter, enabled = true }: UseCostOptions) {
  const cacheKey = enabled ? ['cost', filter] : null;

  const { data, error, isLoading, mutate } = useSWR<CostComparison>(
    cacheKey,
    () => fetchCostData(filter),
    createSWRConfig(),
  );

  return {
    data,
    error,
    isLoading,
    refresh: mutate,
  };
}

async function fetchCostData(filter: ComparisonFilter): Promise<CostComparison> {
  const url = buildApiUrl('/api/comparison/cost', {
    symbols: filter.symbols?.length ? filter.symbols.join(',') : undefined,
    protocols: filter.protocols?.length ? filter.protocols.join(',') : undefined,
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch cost data');
  }
  return response.json();
}

// ============================================================================
// 实时对比数据 Hook
// ============================================================================

interface UseRealtimeOptions {
  filter: ComparisonFilter;
  enabled?: boolean;
  refreshInterval?: number;
}

export function useRealtimeData({
  filter,
  enabled = true,
  refreshInterval = REALTIME_CONFIG.refreshInterval,
}: UseRealtimeOptions) {
  const cacheKey = enabled ? ['realtime', filter] : null;

  const { data, error, isLoading, mutate } = useSWR<RealtimeComparisonItem[]>(
    cacheKey,
    () => fetchRealtimeData(filter),
    createSWRConfig({ refreshInterval }),
  );

  return {
    data,
    error,
    isLoading,
    refresh: mutate,
  };
}

async function fetchRealtimeData(filter: ComparisonFilter): Promise<RealtimeComparisonItem[]> {
  const url = buildApiUrl('/api/comparison/realtime', {
    symbols: filter.symbols?.length ? filter.symbols.join(',') : undefined,
    protocols: filter.protocols?.length ? filter.protocols.join(',') : undefined,
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch realtime data');
  }
  return response.json();
}

// ============================================================================
// 综合对比数据 Hook（根据视图自动选择）
// ============================================================================

interface UseComparisonOptions {
  view: ComparisonView;
  filter: ComparisonFilter;
  enabled?: boolean;
}

export function useComparisonData({ view, filter, enabled = true }: UseComparisonOptions) {
  const heatmap = useHeatmapData({ filter, enabled: enabled && view === 'heatmap' });
  const latency = useLatencyData({ filter, enabled: enabled && view === 'latency' });
  const cost = useCostData({ filter, enabled: enabled && view === 'cost' });
  const realtime = useRealtimeData({ filter, enabled: enabled && view === 'realtime' });

  return {
    heatmap,
    latency,
    cost,
    realtime,
    // 当前视图的数据
    current: {
      data: view === 'heatmap' ? heatmap.data :
            view === 'latency' ? latency.data :
            view === 'cost' ? cost.data :
            view === 'realtime' ? realtime.data : null,
      isLoading: view === 'heatmap' ? heatmap.isLoading :
                 view === 'latency' ? latency.isLoading :
                 view === 'cost' ? cost.isLoading :
                 view === 'realtime' ? realtime.isLoading : false,
      error: view === 'heatmap' ? heatmap.error :
             view === 'latency' ? latency.error :
             view === 'cost' ? cost.error :
             view === 'realtime' ? realtime.error : null,
    },
  };
}


