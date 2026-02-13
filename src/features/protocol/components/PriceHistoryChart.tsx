'use client';

import { useMemo } from 'react';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/shared/utils';

interface PriceDataPoint {
  timestamp: number;
  price: number;
}

interface PriceHistoryChartProps {
  data: PriceDataPoint[];
  symbol: string;
  title?: string;
  className?: string;
}

export function PriceHistoryChart({ data, symbol, title, className }: PriceHistoryChartProps) {
  const formattedData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      time: new Date(point.timestamp).toLocaleDateString(),
    }));
  }, [data]);

  const minPrice = useMemo(() => {
    return Math.min(...data.map((d) => d.price)) * 0.99;
  }, [data]);

  const maxPrice = useMemo(() => {
    return Math.max(...data.map((d) => d.price)) * 1.01;
  }, [data]);

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="text-lg">{title || symbol}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData}>
              <defs>
                <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis
                domain={[minPrice, maxPrice]}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => `$${value.toFixed(2)}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Price']}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#gradient-${symbol})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
