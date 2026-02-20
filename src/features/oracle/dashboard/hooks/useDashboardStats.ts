'use client';

import { useMemo } from 'react';

import { CHART_COLORS } from '@/components/charts';
import type { StatCardStatus } from '@/components/common/StatCard';

import type { DashboardStats } from '../types/dashboard';

export interface StatCardData {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  status: StatCardStatus;
  trend: { value: number; isPositive: boolean; label: string };
  sparkline?: { data: number[]; color: string };
}

export interface UseDashboardStatsReturn {
  statCardsData: StatCardData[];
  scaleCardsData: StatCardData[];
}

export function useDashboardStats(stats: DashboardStats | null): UseDashboardStatsReturn {
  const statCardsData: StatCardData[] = useMemo(
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

  const scaleCardsData: StatCardData[] = useMemo(
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
    statCardsData,
    scaleCardsData,
  };
}
