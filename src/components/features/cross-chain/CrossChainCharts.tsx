'use client';

import React, { useMemo } from 'react';

import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  Area,
  AreaChart,
  ComposedChart,
  ReferenceLine,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n';
import { formatPrice } from '@/lib/utils';

interface CrossChainPriceChartProps {
  data?: {
    symbol: string;
    analysisType: string;
    startTime: string;
    endTime: string;
    timeInterval: string;
    dataPoints: {
      timestamp: string;
      avgPrice: number;
      medianPrice: number;
      maxDeviation: number;
    }[];
    summary: {
      avgPriceRangePercent: number;
      maxObservedDeviation: number;
      convergenceCount: number;
      divergenceCount: number;
    };
  };
  isLoading?: boolean;
  height?: number;
}

const CHAIN_COLORS: Record<string, string> = {
  ethereum: '#627eea',
  bsc: '#f0b90b',
  polygon: '#8247e5',
  avalanche: '#e84142',
  arbitrum: '#28a0f0',
  optimism: '#ff0420',
  base: '#0052ff',
  solana: '#9945ff',
};

function formatChartDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
  });
}

function formatDeviation(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatChartPrice(value: number): string {
  return formatPrice(value);
}

export const CrossChainPriceChart: React.FC<CrossChainPriceChartProps> = ({
  data,
  isLoading,
  height = 300,
}) => {
  const { t } = useI18n();

  const chartData = useMemo(() => {
    if (!data?.dataPoints) return [];
    return data.dataPoints.map((point) => ({
      time: formatChartDate(point.timestamp),
      timestamp: point.timestamp,
      avgPrice: point.avgPrice,
      medianPrice: point.medianPrice,
      deviation: point.maxDeviation,
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  if (!data || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('crossChain.chart.priceTrend.title', { symbol: data?.symbol ?? '' })}</CardTitle>
          <CardDescription>{t('crossChain.chart.noData')}</CardDescription>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
          {t('crossChain.chart.waitingForData')}
        </CardContent>
      </Card>
    );
  }

  const priceMin = Math.min(...chartData.map((d) => d.avgPrice));
  const priceMax = Math.max(...chartData.map((d) => d.avgPrice));
  const priceDomain = [priceMin * 0.99, priceMax * 1.01];

  const tooltipFormatter = (value: string | number | undefined, name: string | number | Array<{ name: string; color: string }>) => {
    const nameStr = Array.isArray(name) ? name[0]?.name ?? '' : String(name);
    const safeValue = typeof value === 'string' ? parseFloat(value) || 0 : value || 0;
    if (nameStr === 'deviation') {
      return [formatDeviation(safeValue), t('crossChain.chart.deviation')] as [string, string];
    }
    return [formatChartPrice(safeValue), nameStr === 'avgPrice' ? t('crossChain.chart.avgPrice') : t('crossChain.chart.medianPrice')] as [string, string];
  };

  const legendFormatter = (value: string | number) => {
    if (value === 'avgPrice') return t('crossChain.chart.avgPrice');
    if (value === 'medianPrice') return t('crossChain.chart.medianPrice');
    return String(value);
  };

  const yAxisFormatter = (value: number) => formatChartPrice(value);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{t('crossChain.chart.priceTrend.title', { symbol: data.symbol })}</CardTitle>
        <CardDescription>
          {t('crossChain.chart.priceTrend.description', {
            count: chartData.length.toString(),
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              domain={priceDomain}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              dx={-10}
              tickFormatter={yAxisFormatter}
            />
            <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                formatter={(value: string | number | undefined) => tooltipFormatter(value as number, 'tooltip')}
                labelStyle={{ color: '#111827', fontWeight: 'bold', marginBottom: '4px' }}
              />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={legendFormatter}
            />
            <Area
              type="monotone"
              dataKey="avgPrice"
              stroke="#8b5cf6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#priceGradient)"
              dot={false}
              name="avgPrice"
            />
            <Line
              type="monotone"
              dataKey="medianPrice"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="medianPrice"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

interface CrossChainDeviationChartProps {
  data?: {
    symbol: string;
    dataPoints: {
      timestamp: string;
      maxDeviation: number;
    }[];
  };
  isLoading?: boolean;
  height?: number;
}

export const CrossChainDeviationChart: React.FC<CrossChainDeviationChartProps> = ({
  data,
  isLoading,
  height = 200,
}) => {
  const { t } = useI18n();

  const chartData = useMemo(() => {
    if (!data?.dataPoints) return [];
    return data.dataPoints.map((point) => ({
      time: formatChartDate(point.timestamp),
      timestamp: point.timestamp,
      deviation: Math.abs(point.maxDeviation),
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  if (!data || chartData.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-48 items-center justify-center text-muted-foreground">
          {t('crossChain.chart.noData')}
        </CardContent>
      </Card>
    );
  }

  const maxDeviation = Math.max(...chartData.map((d) => d.deviation));
  const threshold = 0.5;

  const deviationTooltipFormatter = (value: string | number | undefined) => {
    const safeValue = typeof value === 'string' ? parseFloat(value) || 0 : value || 0;
    return [`${(safeValue * 100).toFixed(2)}%`, t('crossChain.chart.maxDeviation')] as [string, string];
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{t('crossChain.chart.deviationTrend.title', { symbol: data.symbol })}</CardTitle>
        <CardDescription>
          {t('crossChain.chart.deviationTrend.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="deviationGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              domain={[0, Math.max(maxDeviation * 1.1, threshold * 1.5)]}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              dx={-10}
              tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: string | number | undefined) => deviationTooltipFormatter(value)}
            />
            <ReferenceLine
              y={threshold}
              stroke="#ef4444"
              strokeDasharray="5 5"
              label={{
                value: t('crossChain.chart.threshold'),
                position: 'right',
                fill: '#ef4444',
                fontSize: 10,
              }}
            />
            <Area
              type="monotone"
              dataKey="deviation"
              stroke="#f59e0b"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#deviationGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

interface CrossChainComparisonBarProps {
  prices?: {
    chain: string;
    price: number;
    deviationFromAvg: number;
  }[];
  isLoading?: boolean;
  height?: number;
}

export const CrossChainComparisonBar: React.FC<CrossChainComparisonBarProps> = ({
  prices,
  isLoading,
  height = 250,
}) => {
  const { t } = useI18n();

  const chartData = useMemo(() => {
    if (!prices) return [];
    return prices.map((p) => ({
      chain: p.chain.charAt(0).toUpperCase() + p.chain.slice(1),
      price: p.price,
      deviation: p.deviationFromAvg,
      fill: CHAIN_COLORS[p.chain] || '#8b5cf6',
    }));
  }, [prices]);

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  if (!prices || chartData.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
          {t('crossChain.chart.noData')}
        </CardContent>
      </Card>
    );
  }

  const priceMin = Math.min(...chartData.map((d) => d.price));
  const priceMax = Math.max(...chartData.map((d) => d.price));
  const domain = [priceMin * 0.999, priceMax * 1.001];

  const barTooltipFormatter = (value: string | number | undefined, name: string | number | Array<{ name: string; color: string }>) => {
    const nameStr = Array.isArray(name) ? name[0]?.name ?? '' : String(name);
    const safeValue = typeof value === 'string' ? parseFloat(value) || 0 : value || 0;
    if (nameStr === 'deviation') {
      return [formatDeviation(safeValue), t('crossChain.chart.deviation')] as [string, string];
    }
    return [formatChartPrice(safeValue), t('crossChain.chart.price')] as [string, string];
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{t('crossChain.chart.chainComparison.title')}</CardTitle>
        <CardDescription>
          {t('crossChain.chart.chainComparison.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              domain={domain}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatChartPrice}
            />
            <YAxis
              type="category"
              dataKey="chain"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: string | number | undefined, name: any) => barTooltipFormatter(value, name)}
            />
            <Bar dataKey="price" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

interface CrossChainHealthChartProps {
  data?: {
    chain: string;
    status: 'healthy' | 'degraded' | 'offline';
    staleMinutes?: number;
  }[];
  isLoading?: boolean;
}

export const CrossChainHealthChart: React.FC<CrossChainHealthChartProps> = ({
  data,
  isLoading,
}) => {
  const { t } = useI18n();

  const chartData = useMemo(() => {
    if (!data) return [];
    const statusCounts = {
      healthy: data.filter((d) => d.status === 'healthy').length,
      degraded: data.filter((d) => d.status === 'degraded').length,
      offline: data.filter((d) => d.status === 'offline').length,
    };
    return [
      { name: t('crossChain.status.healthy'), value: statusCounts.healthy, color: '#10b981' },
      { name: t('crossChain.status.degraded'), value: statusCounts.degraded, color: '#f59e0b' },
      { name: t('crossChain.status.offline'), value: statusCounts.offline, color: '#ef4444' },
    ];
  }, [data, t]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  const healthyPercent = total > 0 ? (chartData[0]?.value ?? 0) / total : 0;

  const healthTooltipFormatter = (value: string | number | undefined) => {
    const safeValue = typeof value === 'string' ? parseInt(value) || 0 : value || 0;
    return [safeValue, t('crossChain.chart.count')] as [number, string];
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{t('crossChain.chart.chainHealth.title')}</CardTitle>
        <CardDescription>
          {t('crossChain.chart.chainHealth.description', { healthyPercent: `${(healthyPercent * 100).toFixed(0)}%` })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <ResponsiveContainer width="60%" height={100}>
            <BarChart data={chartData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                }}
                formatter={(value: string | number | undefined) => healthTooltipFormatter(value as number)}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <rect key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-muted-foreground">{item.name}</span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
