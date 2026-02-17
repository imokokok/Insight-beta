'use client';

import { PriceHistoryChart } from '@/components/charts/PriceHistoryChart';
import type { CrossOracleComparison } from '@/types';

interface PriceHistoryChartProps {
  data: CrossOracleComparison[];
  symbol: string;
  className?: string;
}

export function PriceHistoryChartWrapper({ data, symbol, className }: PriceHistoryChartProps) {
  const chartData = data.map((item) => ({
    timestamp: item.timestamp,
    recommendedPrice: item.recommendedPrice,
    avgPrice: item.avgPrice,
    medianPrice: item.medianPrice,
  }));

  return (
    <PriceHistoryChart
      data={chartData}
      symbol={symbol}
      mode="multi-protocol"
      height={400}
      className={className}
    />
  );
}

export { PriceHistoryChartWrapper as PriceHistoryChart };
