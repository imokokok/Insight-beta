'use client';

import { useMemo } from 'react';

import { LineChart } from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/i18n';

import type { CrossChainComparisonData } from '../types/api3';

interface CrossChainPriceChartProps {
  data: CrossChainComparisonData;
  chainColors: Record<string, string>;
  className?: string;
}

export function CrossChainPriceChart({ data, chainColors, className }: CrossChainPriceChartProps) {
  const { t } = useI18n();

  const chartData = useMemo(() => {
    return data.priceHistory.map((item) => ({
      ...item,
      date: new Date(item.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    }));
  }, [data.priceHistory]);

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  const priceRange = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    data.chains.forEach((chain) => {
      chartData.forEach((point) => {
        const price = Number(point[chain]);
        if (price < min) min = price;
        if (price > max) max = price;
      });
    });
    const padding = (max - min) * 0.1;
    return { min: min - padding, max: max + padding };
  }, [chartData, data.chains]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LineChart className="h-5 w-5 text-primary" />
          {data.dapiName} 价格对比
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                interval={chartData.length > 50 ? Math.floor(chartData.length / 10) : 0}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                domain={[priceRange.min, priceRange.max]}
                tickFormatter={(v) => formatPrice(v)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value, name) => [
                  formatPrice(Number(value) || 0),
                  name,
                ]}
                labelFormatter={(label) => `${t('common.time')}: ${label}`}
              />
              <Legend />
              {data.chains.map((chain) => (
                <Line
                  key={chain}
                  type="monotone"
                  dataKey={chain}
                  name={chain}
                  stroke={chainColors[chain]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {data.chains.map((chain) => (
            <div key={chain} className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: chainColors[chain] }} />
              <span className="capitalize">{chain}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
