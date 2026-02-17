'use client';

import { PriceHistoryChart } from '@/components/charts/PriceHistoryChart';
import type { SingleAssetDataPoint } from '@/components/charts/PriceHistoryChart';

interface PriceHistoryChartProps {
  data: SingleAssetDataPoint[];
  symbol: string;
  title?: string;
  className?: string;
}

export function PriceHistoryChartWrapper({
  data,
  symbol,
  title,
  className,
}: PriceHistoryChartProps) {
  return (
    <PriceHistoryChart
      data={data}
      symbol={symbol}
      title={title}
      mode="single"
      height={300}
      className={className}
    />
  );
}

export { PriceHistoryChartWrapper as PriceHistoryChart };
