'use client';

import { useState, useMemo, useCallback } from 'react';

import { usePageOptimizations } from '@/hooks/usePageOptimizations';

import { useGasPrices, useGasPriceTrend, useGasPriceHealth } from './index';

export const DEFAULT_CHAINS = ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base'];

export const TIME_RANGE_OPTIONS = [
  { value: '1h', label: '1H', duration: 3600000 },
  { value: '6h', label: '6H', duration: 21600000 },
  { value: '24h', label: '24H', duration: 86400000 },
  { value: '7d', label: '7D', duration: 604800000 },
];

export function useGasMonitor() {
  const [selectedChains, setSelectedChains] = useState<string[]>(DEFAULT_CHAINS);
  const [showTrend, setShowTrend] = useState(false);
  const [selectedChainForTrend, setSelectedChainForTrend] = useState<string>('ethereum');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  const {
    data: gasPrices,
    isLoading: pricesLoading,
    mutate: refreshPrices,
  } = useGasPrices(selectedChains);
  const { data: trendData, isLoading: trendLoading } = useGasPriceTrend(
    selectedChainForTrend,
    'average',
  );
  const { data: healthData, isLoading: healthLoading, mutate: refreshHealth } = useGasPriceHealth();

  const handleRefresh = useCallback(() => {
    refreshPrices();
    refreshHealth();
  }, [refreshPrices, refreshHealth]);

  usePageOptimizations({
    pageName: 'Gas价格监控',
    onRefresh: async () => {
      handleRefresh();
    },
    enableSearch: false,
    showRefreshToast: true,
  });

  const handleToggleChain = useCallback(
    (chain: string) => {
      if (selectedChains.includes(chain)) {
        setSelectedChains(selectedChains.filter((c) => c !== chain));
      } else {
        setSelectedChains([...selectedChains, chain]);
      }
    },
    [selectedChains],
  );

  const handleShowTrend = useCallback((chain: string) => {
    setSelectedChainForTrend(chain);
    setShowTrend(true);
  }, []);

  const gasData = gasPrices?.data || [];
  const avgGasPrice = useMemo(
    () => gasData.reduce((sum, p) => sum + p.average, 0) / (gasData.length || 1),
    [gasData],
  );
  const slowGasPrice = useMemo(
    () => gasData.reduce((sum, p) => sum + p.slow, 0) / (gasData.length || 1),
    [gasData],
  );
  const fastGasPrice = useMemo(
    () => gasData.reduce((sum, p) => sum + p.fast, 0) / (gasData.length || 1),
    [gasData],
  );

  return {
    selectedChains,
    setSelectedChains,
    showTrend,
    setShowTrend,
    selectedChainForTrend,
    setSelectedChainForTrend,
    timeRange,
    setTimeRange,
    customDateRange,
    setCustomDateRange,
    gasPrices,
    pricesLoading,
    refreshPrices,
    trendData,
    trendLoading,
    healthData,
    healthLoading,
    refreshHealth,
    handleRefresh,
    handleToggleChain,
    handleShowTrend,
    avgGasPrice,
    slowGasPrice,
    fastGasPrice,
  };
}
