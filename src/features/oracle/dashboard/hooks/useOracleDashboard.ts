'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

import { CHART_COLORS } from '@/components/charts';
import type { StatCardStatus } from '@/components/common/StatCard';
import { WS_CONFIG } from '@/config/constants';
import { useWebSocket, useIsMobile, useAutoRefresh } from '@/hooks';
import { usePageOptimizations } from '@/hooks/usePageOptimizations';
import { logger } from '@/shared/logger';
import { fetchApiData, formatNumber } from '@/shared/utils';
import { isStatsUpdateMessage } from '@/shared/utils/typeGuards';

import { generateMockChartData, generateMockComparisonData } from '../utils/mockData';

import type { DashboardStats, ChartDataPoint, ComparisonDataPoint } from '../types/dashboard';

export function useOracleDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const [priceTrendData, setPriceTrendData] = useState<ChartDataPoint[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonDataPoint[]>([]);
  const [latencyData, setLatencyData] = useState<ChartDataPoint[]>([]);

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
      setPriceTrendData(generateMockChartData());
      setComparisonData(generateMockComparisonData());
      setLatencyData(generateMockChartData(12));
    }, []),
    enabled: true,
  });

  const { isConnected, sendMessage, lastMessage } = useWebSocket(WS_CONFIG.URL, {
    autoConnect: true,
    onConnect: () => {
      sendMessage({ type: 'subscribe_dashboard' });
    },
  });

  useEffect(() => {
    if (!lastMessage) return;
    try {
      if (isStatsUpdateMessage(lastMessage)) {
        setStats(lastMessage.data as DashboardStats);
      }
    } catch (err: unknown) {
      logger.error('Failed to process WebSocket message', { err });
    }
  }, [lastMessage]);

  const priceChartConfig = useMemo(
    () => ({
      data: priceTrendData,
      dataKey: 'value',
      color: CHART_COLORS.primary.DEFAULT,
      valueFormatter: (v: number) => `$${formatNumber(v, 2)}`,
      labelFormatter: (l: string | number) =>
        new Date(l).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    }),
    [priceTrendData],
  );

  const comparisonChartConfig = useMemo(
    () => ({
      data: comparisonData,
      bars: [
        { dataKey: 'latency', name: 'Latency (ms)', color: CHART_COLORS.series[0] },
        { dataKey: 'accuracy', name: 'Accuracy (%)', color: CHART_COLORS.series[1] },
      ],
      valueFormatter: (v: number) => formatNumber(v, 1),
    }),
    [comparisonData],
  );

  const latencyChartConfig = useMemo(
    () => ({
      data: latencyData,
      lines: [{ dataKey: 'value', name: 'Latency', color: CHART_COLORS.semantic.warning.DEFAULT }],
      valueFormatter: (v: number) => `${formatNumber(v, 0)}ms`,
    }),
    [latencyData],
  );

  const statCardsData: Array<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    status: StatCardStatus;
    trend: { value: number; isPositive: boolean; label: string };
    sparkline?: { data: number[]; color: string };
  }> = useMemo(
    () => [
      {
        title: 'Active Incidents',
        value: stats?.activeAlerts ?? 0,
        icon: null,
        status: (stats?.activeAlerts ?? 0) > 0 ? 'warning' : 'healthy',
        trend: { value: 12, isPositive: false, label: 'vs last hour' },
        sparkline: {
          data: [10, 12, 8, 15, 12, 18, 12],
          color: CHART_COLORS.semantic.warning.DEFAULT,
        },
      },
      {
        title: 'Avg Latency',
        value: `${stats?.avgLatency ?? 0}ms`,
        icon: null,
        status: (stats?.avgLatency ?? 0) > 1000 ? 'warning' : 'healthy',
        trend: { value: 5, isPositive: false, label: 'vs last hour' },
        sparkline: {
          data: [500, 520, 480, 550, 530, 580, 520],
          color: CHART_COLORS.primary.DEFAULT,
        },
      },
      {
        title: 'Network Uptime',
        value: `${stats?.networkUptime ?? 99.9}%`,
        icon: null,
        status: 'healthy',
        trend: { value: 0.1, isPositive: true, label: 'vs last hour' },
        sparkline: {
          data: [99.8, 99.9, 99.9, 99.8, 99.9, 99.9, 99.9],
          color: CHART_COLORS.semantic.success.DEFAULT,
        },
      },
      {
        title: 'Stale Feeds',
        value: stats?.staleFeeds ?? 0,
        icon: null,
        status: (stats?.staleFeeds ?? 0) > 0 ? 'warning' : 'healthy',
        trend: { value: 2, isPositive: false, label: 'vs last hour' },
        sparkline: { data: [2, 3, 2, 4, 3, 2, 3], color: CHART_COLORS.semantic.error.DEFAULT },
      },
    ],
    [stats],
  );

  const scaleCardsData: Array<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    status: StatCardStatus;
    trend: { value: number; isPositive: boolean; label: string };
  }> = useMemo(
    () => [
      {
        title: 'Protocols',
        value: stats?.totalProtocols ?? 0,
        icon: null,
        status: 'neutral',
        trend: { value: 8, isPositive: true, label: 'vs last week' },
      },
      {
        title: 'Price Feeds',
        value: stats?.totalPriceFeeds ?? 0,
        icon: null,
        status: 'neutral',
        trend: { value: 15, isPositive: true, label: 'vs last week' },
      },
      {
        title: 'TVS',
        value: stats?.totalValueSecured ?? '$0',
        icon: null,
        status: 'neutral',
        trend: { value: 23, isPositive: true, label: 'vs last week' },
      },
      {
        title: 'Updates (24h)',
        value: stats?.priceUpdates24h?.toLocaleString() ?? '0',
        icon: null,
        status: 'neutral',
        trend: { value: 18, isPositive: true, label: 'vs yesterday' },
      },
    ],
    [stats],
  );

  return {
    activeTab,
    setActiveTab,
    stats,
    sidebarOpen,
    setSidebarOpen,
    isMobile,
    priceTrendData,
    comparisonData,
    latencyData,
    isConnected,
    lastUpdated,
    isRefreshing,
    isError,
    error,
    refresh,
    priceChartConfig,
    comparisonChartConfig,
    latencyChartConfig,
    statCardsData,
    scaleCardsData,
  };
}
