'use client';

import { useCallback } from 'react';

import { CHAIN_DISPLAY_NAMES, CHAIN_COLORS, CHAINLINK_SUPPORTED_CHAINS } from '@/config/chains';
import { OracleCrossChainComparison } from '@/features/cross-chain/components';
import type { ChainPriceData, CrossChainStats } from '@/features/cross-chain/components';

const CHAINLINK_SYMBOLS = ['ETH', 'BTC', 'LINK', 'USDC', 'USDT'];

const generateMockData = (symbol: string, chains: string[]) => {
  const now = Date.now();
  const basePrice =
    symbol === 'ETH'
      ? 3245.67
      : symbol === 'BTC'
        ? 98456.32
        : symbol === 'LINK'
          ? 18.45
          : symbol === 'USDC'
            ? 1.0001
            : 1.0002;

  const prices: ChainPriceData[] = chains.map((chain, index) => {
    const chainMultiplier = 1 + (index - 2) * 0.0001;
    const price = basePrice * chainMultiplier * (1 + (Math.random() - 0.5) * 0.001);
    return {
      chain,
      price,
      timestamp: new Date(now - Math.random() * 120000).toISOString(),
      status: Math.random() > 0.1 ? 'available' : 'stale',
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
  collapsible?: boolean;
  className?: string;
}

export function CrossChainPriceComparison({
  collapsible = false,
  className,
}: CrossChainPriceComparisonProps) {
  const fetchData = useCallback(async (symbol: string, chains: string[]) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return generateMockData(symbol, chains);
  }, []);

  if (collapsible) {
    return (
      <div className={className}>
        <OracleCrossChainComparison
          protocol="chainlink"
          availableSymbols={CHAINLINK_SYMBOLS}
          supportedChains={CHAINLINK_SUPPORTED_CHAINS}
          chainDisplayNames={CHAIN_DISPLAY_NAMES}
          chainColors={CHAIN_COLORS}
          fetchData={fetchData}
          showConfidence={false}
          showStatus={true}
          showConsistencyScore={true}
          title=""
          description=""
        />
      </div>
    );
  }

  return (
    <OracleCrossChainComparison
      protocol="chainlink"
      availableSymbols={CHAINLINK_SYMBOLS}
      supportedChains={CHAINLINK_SUPPORTED_CHAINS}
      chainDisplayNames={CHAIN_DISPLAY_NAMES}
      chainColors={CHAIN_COLORS}
      fetchData={fetchData}
      showConfidence={false}
      showStatus={true}
      showConsistencyScore={true}
      className={className}
    />
  );
}
