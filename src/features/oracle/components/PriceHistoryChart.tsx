'use client';

import { useMemo } from 'react';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatPrice } from '@/shared/utils';

export interface SingleAssetDataPoint {
  timestamp: number;
  price: number;
}

export interface MultiProtocolDataPoint {
  timestamp: string;
  recommendedPrice?: number;
  avgPrice?: number;
  medianPrice?: number;
}

export interface PriceHistoryChartProps {
  data: SingleAssetDataPoint[] | MultiProtocolDataPoint[];
  symbol: string;
  title?: string;
  className?: string;
  mode?: 'single' | 'multi-protocol';
  height?: number;
}

function isSingleAssetData(
  data: SingleAssetDataPoint[] | MultiProtocolDataPoint[]
): data is SingleAssetDataPoint[] {
  if (data.length === 0) return true;
  const firstItem = data[0];
  return firstItem !== undefined && 'price' in firstItem;
}

export function PriceHistoryChart({
  data,
  symbol,
  title,
  className,
  mode,
  height = 300,
}: PriceHistoryChartProps) {
  const detectedMode = useMemo(() => {
    if (mode) return mode;
    return isSingleAssetData(data) ? 'single' : 'multi-protocol';
  }, [data, mode]);

  if (detectedMode === 'single') {
    return (
      <SingleAssetChart
        data={data as SingleAssetDataPoint[]}
        symbol={symbol}
        title={title}
        className={className}
        height={height}
      />
    );
  }

  return (
    <MultiProtocolChart
      data={data as MultiProtocolDataPoint[]}
      symbol={symbol}
      title={title}
      className={className}
      height={height}
    />
  );
}

interface SingleAssetChartProps {
  data: SingleAssetDataPoint[];
  symbol: string;
  title?: string;
  className?: string;
  height: number;
}

function SingleAssetChart({ data, symbol, title, className, height }: SingleAssetChartProps) {
  const formattedData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      time: new Date(point.timestamp).toLocaleDateString(),
    }));
  }, [data]);

  const minPrice = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.min(...data.map((d) => d.price)) * 0.99;
  }, [data]);

  const maxPrice = useMemo(() => {
    if (data.length === 0) return 100;
    return Math.max(...data.map((d) => d.price)) * 1.01;
  }, [data]);

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="text-lg">{title || symbol}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
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

interface MultiProtocolChartProps {
  data: MultiProtocolDataPoint[];
  symbol: string;
  title?: string;
  className?: string;
  height: number;
}

function MultiProtocolChart({ data, symbol, title, className, height }: MultiProtocolChartProps) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title || `24h Price History - ${symbol}`}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTime}
                stroke="#71717a"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={['auto', 'auto']}
                stroke="#71717a"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(30, 41, 59, 0.95)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                  color: '#f8fafc',
                }}
                formatter={(value) => [formatPrice(value as number), '']}
                labelFormatter={(label) => new Date(label as string).toLocaleString()}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="recommendedPrice"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Recommended"
                activeDot={{ r: 6, fill: '#3b82f6' }}
              />
              <Line
                type="monotone"
                dataKey="avgPrice"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                name="Average"
                activeDot={{ r: 6, fill: '#22c55e' }}
              />
              <Line
                type="monotone"
                dataKey="medianPrice"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="Median"
                activeDot={{ r: 6, fill: '#f59e0b' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
