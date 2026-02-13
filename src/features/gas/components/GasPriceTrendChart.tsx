'use client';

import { useMemo } from 'react';

import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { GasPriceTrend } from '@/features/gas/hooks';
import { useI18n } from '@/i18n';
import { cn, formatChangePercent, formatPercentValue } from '@/shared/utils';

interface GasPriceTrendChartProps {
  data?: GasPriceTrend;
  isLoading?: boolean;
  height?: number;
  className?: string;
}

const CHAIN_COLORS: Record<string, string> = {
  ethereum: '#627eea',
  bsc: '#f0b90b',
  polygon: '#8247e5',
  avalanche: '#e84142',
  arbitrum: '#28a745',
  optimism: '#ff0420',
  base: '#0052ff',
  solana: '#9945ff',
  near: '#00dc82',
  fantom: '#196928',
  celo: '#fcd34d',
  gnosis: '#00d4ff',
  linea: '#627eea',
  scroll: '#627eea',
  mantle: '#627eea',
  mode: '#627eea',
  blast: '#627eea',
  aptos: '#627eea',
};

export function GasPriceTrendChart({ data, isLoading, height = 300 }: GasPriceTrendChartProps) {
  const { t } = useI18n();

  const chartData = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    const points: Array<{
      time: string;
      ma7: number;
      ma24: number;
      ma168: number;
      current: number;
    }> = [];

    for (let i = 7; i >= 0; i--) {
      const time = new Date(now - i * 3600000).toISOString();
      const volatility = data.volatility * (1 + Math.random() * 0.2 - 0.1);
      const basePrice = 20e9;

      points.push({
        time: new Date(time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        ma7: basePrice * (1 + (data.ma7 / 10000 - 1) * 0.5 + (Math.random() - 0.5) * 0.1),
        ma24: basePrice * (1 + (data.ma24 / 10000 - 1) * 0.5 + (Math.random() - 0.5) * 0.1),
        ma168: basePrice * (1 + (data.ma168 / 10000 - 1) * 0.5 + (Math.random() - 0.5) * 0.1),
        current: basePrice * (1 + volatility / 100),
      });
    }

    return points;
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

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('crossChain.chart.priceTrend.title', { symbol: 'ETH' })}</CardTitle>
          <CardDescription>{t('crossChain.chart.noData')}</CardDescription>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
          {t('crossChain.chart.waitingForData')}
        </CardContent>
      </Card>
    );
  }

  const chainColor = CHAIN_COLORS[data.chain] || CHAIN_COLORS.ethereum;
  const directionColor =
    data.direction === 'up'
      ? 'text-emerald-600'
      : data.direction === 'down'
        ? 'text-red-600'
        : 'text-gray-600';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              {t('crossChain.chart.priceTrend.title', { symbol: data.chain.toUpperCase() })}
            </CardTitle>
            <CardDescription className="text-sm">
              {t('crossChain.chart.priceTrend.description', { count: chartData.length })}
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{t('crossChain.chart.deviation')}</p>
              <p className={cn('text-sm font-semibold', directionColor)}>
                {formatChangePercent(data.changePercent / 100, 2, false)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Volatility</p>
              <p className="text-sm font-semibold text-blue-600">
                {formatPercentValue(data.volatility, 2)}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => (value / 1e9).toFixed(1)}
              stroke="#9ca3af"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="ma7"
              stroke={chainColor}
              strokeWidth={2}
              dot={false}
              name="MA7"
            />
            <Line
              type="monotone"
              dataKey="ma24"
              stroke={chainColor}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="MA24"
            />
            <Line
              type="monotone"
              dataKey="ma168"
              stroke={chainColor}
              strokeWidth={2}
              strokeDasharray="10 10"
              dot={false}
              name="MA168"
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke={chainColor}
              strokeWidth={3}
              dot={{ r: 4 }}
              name="Current"
            />
            <ReferenceLine
              y={(data.ma7 + data.ma24 + data.ma168) / 3}
              stroke="#9ca3af"
              strokeDasharray="3 3"
              label="Average"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
