'use client';

import { useMemo } from 'react';

import { CHART_COLORS } from '@/components/charts';
import { formatNumber } from '@/shared/utils';

import type { ChartDataPoint, ComparisonDataPoint } from '../types/dashboard';

export interface ChartConfig {
  data: ChartDataPoint[];
  dataKey: string;
  color: string;
  valueFormatter: (v: number) => string;
  labelFormatter: (l: string | number) => string;
}

export interface ComparisonChartConfig {
  data: ComparisonDataPoint[];
  bars: Array<{ dataKey: string; name: string; color: string }>;
  valueFormatter: (v: number) => string;
}

export interface LatencyChartConfig {
  data: ChartDataPoint[];
  lines: Array<{ dataKey: string; name: string; color: string }>;
  valueFormatter: (v: number) => string;
}

export interface UseDashboardChartsReturn {
  priceChartConfig: ChartConfig;
  comparisonChartConfig: ComparisonChartConfig;
  latencyChartConfig: LatencyChartConfig;
}

export function useDashboardCharts(
  priceTrendData: ChartDataPoint[],
  comparisonData: ComparisonDataPoint[],
  latencyData: ChartDataPoint[],
): UseDashboardChartsReturn {
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

  return {
    priceChartConfig,
    comparisonChartConfig,
    latencyChartConfig,
  };
}
