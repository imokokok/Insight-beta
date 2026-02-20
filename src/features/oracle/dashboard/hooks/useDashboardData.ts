'use client';

import { useState, useCallback } from 'react';

import { useAutoRefresh } from '@/hooks';
import { usePageOptimizations } from '@/hooks/usePageOptimizations';
import { fetchApiData } from '@/shared/utils';

import { generateMockChartData, generateMockComparisonData } from '../utils/mockData';

import type { DashboardStats, ChartDataPoint, ComparisonDataPoint } from '../types/dashboard';

const IS_DEMO_MODE = process.env.NEXT_PUBLIC_INSIGHT_DEMO_MODE === 'true';

export interface UseDashboardDataReturn {
  stats: DashboardStats | null;
  priceTrendData: ChartDataPoint[];
  comparisonData: ComparisonDataPoint[];
  latencyData: ChartDataPoint[];
  isDemoData: boolean;
  lastUpdated: Date | null;
  isRefreshing: boolean;
  isError: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useDashboardData(): UseDashboardDataReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [priceTrendData, setPriceTrendData] = useState<ChartDataPoint[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonDataPoint[]>([]);
  const [latencyData, setLatencyData] = useState<ChartDataPoint[]>([]);
  const [isDemoData, setIsDemoData] = useState(false);

  usePageOptimizations({
    pageName: 'Oracle Dashboard',
    onRefresh: async () => {
      await refresh();
    },
    enableSearch: true,
    searchSelector: 'input[type="search"]',
    showRefreshToast: true,
  });

  const { lastUpdated, isRefreshing, isError, error, refresh } = useAutoRefresh({
    pageId: 'dashboard-overview',
    fetchFn: useCallback(async () => {
      const data = await fetchApiData<DashboardStats>('/api/oracle/stats');
      setStats(data);

      if (IS_DEMO_MODE) {
        setPriceTrendData(generateMockChartData());
        setComparisonData(generateMockComparisonData());
        setLatencyData(generateMockChartData(12));
        setIsDemoData(true);
      } else {
        try {
          const chartData = await fetchApiData<ChartDataPoint[]>('/api/oracle/charts/price-trend');
          setPriceTrendData(chartData.length > 0 ? chartData : generateMockChartData());
          setIsDemoData(chartData.length === 0);
        } catch {
          setPriceTrendData(generateMockChartData());
          setIsDemoData(true);
        }

        try {
          const compData = await fetchApiData<ComparisonDataPoint[]>(
            '/api/oracle/charts/comparison',
          );
          setComparisonData(compData.length > 0 ? compData : generateMockComparisonData());
        } catch {
          setComparisonData(generateMockComparisonData());
        }

        try {
          const latData = await fetchApiData<ChartDataPoint[]>('/api/oracle/charts/latency');
          setLatencyData(latData.length > 0 ? latData : generateMockChartData(12));
        } catch {
          setLatencyData(generateMockChartData(12));
        }
      }
    }, []),
    enabled: true,
  });

  return {
    stats,
    priceTrendData,
    comparisonData,
    latencyData,
    isDemoData,
    lastUpdated,
    isRefreshing,
    isError,
    error,
    refresh,
  };
}
