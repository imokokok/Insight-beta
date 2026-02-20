'use client';

import { useState } from 'react';

import { useIsMobile } from '@/hooks';

import { useDashboardCharts } from './useDashboardCharts';
import { useDashboardData } from './useDashboardData';
import { useDashboardStats } from './useDashboardStats';

export function useOracleDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const {
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
  } = useDashboardData();

  const { priceChartConfig, comparisonChartConfig, latencyChartConfig } = useDashboardCharts(
    priceTrendData,
    comparisonData,
    latencyData,
  );

  const { statCardsData, scaleCardsData } = useDashboardStats(stats);

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
    isDemoData,
  };
}
