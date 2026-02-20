'use client';

import { useMemo, memo } from 'react';

import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  LabelList,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n';
import { cn, formatPrice, formatChangePercent } from '@/shared/utils';

const CHAIN_COLORS: Record<string, { main: string; light: string }> = {
  ethereum: { main: '#627eea', light: '#627eea40' },
  bsc: { main: '#f0b90b', light: '#f0b90b40' },
  polygon: { main: '#8247e5', light: '#8247e540' },
  avalanche: { main: '#e84142', light: '#e8414240' },
  arbitrum: { main: '#28a0f0', light: '#28a0f040' },
  optimism: { main: '#ff0420', light: '#ff042040' },
  base: { main: '#0052ff', light: '#0052ff40' },
  solana: { main: '#9945ff', light: '#9945ff40' },
};

interface PriceData {
  chain: string;
  price: number;
  deviationFromAvg: number;
}

interface CrossChainComparisonBarProps {
  prices?: PriceData[];
  isLoading?: boolean;
  height?: number;
  avgPrice?: number;
  onBarClick?: (chain: string) => void;
}

interface ChartDataPoint {
  chain: string;
  price: number;
  deviationFromAvg: number;
  deviationPercent: number;
  isAboveAvg: boolean;
  color: string;
}

export const CrossChainComparisonBar = memo(function CrossChainComparisonBar({
  prices,
  isLoading,
  height = 350,
  avgPrice,
  onBarClick,
}: CrossChainComparisonBarProps) {
  const { t } = useI18n();

  const chartData = useMemo((): ChartDataPoint[] => {
    if (!prices || prices.length === 0) return [];

    return prices
      .sort((a, b) => b.price - a.price)
      .map((p) => ({
        chain: p.chain,
        price: p.price,
        deviationFromAvg: p.deviationFromAvg,
        deviationPercent: (p.deviationFromAvg / (avgPrice || p.price)) * 100,
        isAboveAvg: p.deviationFromAvg >= 0,
        color: CHAIN_COLORS[p.chain]?.main || '#94a3b8',
      }));
  }, [prices, avgPrice]);

  const calculatedAvgPrice = useMemo(() => {
    if (avgPrice) return avgPrice;
    if (chartData.length === 0) return 0;
    return chartData.reduce((sum, d) => sum + d.price, 0) / chartData.length;
  }, [avgPrice, chartData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-1 h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton style={{ height }} className="w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!prices || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t('crossChain.chart.chainComparison.title')}
          </CardTitle>
          <CardDescription>{t('crossChain.chart.noData')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            style={{ height }}
            className="flex items-center justify-center text-muted-foreground"
          >
            {t('crossChain.chart.waitingForData')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {t('crossChain.chart.chainComparison.title')}
        </CardTitle>
        <CardDescription>{t('crossChain.chart.chainComparison.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 60 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                horizontal={true}
                vertical={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => formatPrice(value)}
                domain={['auto', 'auto']}
              />
              <YAxis
                type="category"
                dataKey="chain"
                tick={{ fontSize: 11 }}
                width={70}
                tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  backgroundColor: 'white',
                }}
                formatter={(value, name) => {
                  const numValue = typeof value === 'number' ? value : 0;
                  const nameStr = String(name);
                  if (nameStr === 'price') {
                    return [formatPrice(numValue), t('crossChain.chart.price')];
                  }
                  return [formatChangePercent(numValue), t('crossChain.chart.deviation')];
                }}
                labelFormatter={(label) => {
                  const item = chartData.find((d) => d.chain === label);
                  return item ? (
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium capitalize">{label}</span>
                    </div>
                  ) : (
                    String(label)
                  );
                }}
              />
              <ReferenceLine
                x={calculatedAvgPrice}
                stroke="#94a3b8"
                strokeDasharray="5 5"
                label={{
                  value: 'Avg',
                  position: 'top',
                  fill: '#94a3b8',
                  fontSize: 10,
                }}
              />
              <Bar
                dataKey="price"
                radius={[0, 4, 4, 0]}
                className={onBarClick ? 'cursor-pointer' : ''}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    onClick={() => {
                      if (onBarClick) {
                        onBarClick(entry.chain);
                      }
                    }}
                    className={onBarClick ? 'cursor-pointer' : ''}
                  />
                ))}
                <LabelList
                  dataKey="deviationPercent"
                  position="right"
                  formatter={(value) => {
                    const numValue = typeof value === 'number' ? value : 0;
                    const sign = numValue >= 0 ? '+' : '';
                    return `${sign}${numValue.toFixed(2)}%`;
                  }}
                  style={{ fontSize: 10, fill: '#64748b' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {chartData.map((item) => (
            <div
              key={item.chain}
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-1 text-xs',
                item.isAboveAvg ? 'bg-green-500/10' : 'bg-red-500/10',
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="font-medium capitalize">{item.chain}</span>
              {item.isAboveAvg ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span
                className={cn('font-mono', item.isAboveAvg ? 'text-green-600' : 'text-red-600')}
              >
                {item.deviationPercent >= 0 ? '+' : ''}
                {item.deviationPercent.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
