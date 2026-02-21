'use client';

import { useCallback } from 'react';

import { CHAIN_DISPLAY_NAMES, CHAIN_COLORS, PYTH_SUPPORTED_CHAINS } from '@/config/chains';
import { getAvailablePythSymbols } from '@/config/pythPriceFeeds';
import { OracleCrossChainComparison } from '@/features/cross-chain/components';
import type { ChainPriceData, CrossChainStats } from '@/features/cross-chain/components';

const generateMockData = (symbol: string, chains: string[]) => {
  const now = Date.now();
  const basePrice =
    symbol === 'BTC'
      ? 67234.56
      : symbol === 'ETH'
        ? 3456.78
        : symbol === 'SOL'
          ? 178.45
          : symbol === 'LINK'
            ? 18.45
            : 1.0001;

  const prices: ChainPriceData[] = chains.map((chain, index) => {
    const chainMultiplier = 1 + (index - 3) * 0.0001;
    const price = basePrice * chainMultiplier * (1 + (Math.random() - 0.5) * 0.002);
    const confidence = 0.1 + Math.random() * 0.2;
    return {
      chain,
      price,
      timestamp: now - Math.random() * 300000,
      confidence,
      status: Math.random() > 0.05 ? 'available' : 'stale',
    };
  });

  const numericPrices = prices.map((p) => p.price);
  const avgPrice = numericPrices.reduce((a, b) => a + b, 0) / numericPrices.length;
  const maxPrice = Math.max(...numericPrices);
  const minPrice = Math.min(...numericPrices);
  const priceRange = maxPrice - minPrice;
  const priceRangePercent = (priceRange / avgPrice) * 100;
  const maxDeviation = Math.max(...numericPrices.map((p) => Math.abs(p - avgPrice)));
  const maxDeviationPercent = (maxDeviation / avgPrice) * 100;

  const stats: CrossChainStats = {
    avgPrice,
    maxPrice,
    minPrice,
    priceRange,
    priceRangePercent,
    maxDeviation,
    maxDeviationPercent,
  };

  return { symbol, prices, stats };
};

interface CrossChainPriceComparisonProps {
  isLoading?: boolean;
}

export function CrossChainPriceComparison({ isLoading = false }: CrossChainPriceComparisonProps) {
  const availableSymbols = getAvailablePythSymbols();

  const fetchData = useCallback(async (symbol: string, chains: string[]) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return generateMockData(symbol, chains);
  }, []);

  return (
    <OracleCrossChainComparison
      protocol="pyth"
      availableSymbols={availableSymbols}
      supportedChains={PYTH_SUPPORTED_CHAINS}
      chainDisplayNames={CHAIN_DISPLAY_NAMES}
      chainColors={CHAIN_COLORS}
      fetchData={fetchData}
      isLoading={isLoading}
      showConfidence={true}
      showStatus={true}
      showConsistencyScore={true}
    />
  );
}
