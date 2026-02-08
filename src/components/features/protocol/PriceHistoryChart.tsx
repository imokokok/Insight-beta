'use client';

import { useState, useMemo } from 'react';

import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface PriceDataPoint {
  timestamp: string;
  price: number;
  volume?: number;
}

export interface PriceHistoryChartProps {
  data: PriceDataPoint[];
  symbol: string;
  title?: string;
  className?: string;
  height?: number;
}

type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d';

export function PriceHistoryChart({
  data,
  symbol,
  title,
  className,
  height = 350,
}: PriceHistoryChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [chartType, setChartType] = useState<'line' | 'area'>('area');

  // Filter data based on time range
  const filteredData = useMemo(() => {
    const now = new Date();
    const ranges: Record<TimeRange, number> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };

    const cutoff = new Date(now.getTime() - ranges[timeRange]);
    return data.filter((point) => new Date(point.timestamp) >= cutoff);
  }, [data, timeRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;

    const prices = filteredData.map((d) => d.price);
    const current = prices[prices.length - 1] ?? 0;
    const open = prices[0] ?? 0;
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const change = current - open;
    const changePercent = open > 0 ? (change / open) * 100 : 0;

    return {
      current,
      open,
      high,
      low,
      change,
      changePercent,
      isPositive: change >= 0,
    };
  }, [filteredData]);

  // Format price for display
  const formatChartPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    }).format(price);
  };

  // Format date for tooltip
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: '1h', label: '1H' },
    { value: '24h', label: '24H' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' },
  ];

  if (filteredData.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex h-[350px] items-center justify-center">
          <p className="text-muted-foreground">No price data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              {title || `${symbol} Price History`}
            </CardTitle>
            {stats && (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-2xl font-bold">{formatChartPrice(stats.current)}</span>
                <Badge
                  variant={stats.isPositive ? 'default' : 'destructive'}
                  className={cn(
                    'gap-1',
                    stats.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                  )}
                >
                  {stats.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {stats.isPositive ? '+' : ''}
                  {stats.changePercent.toFixed(2)}%
                </Badge>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChartType(chartType === 'line' ? 'area' : 'line')}
            >
              {chartType === 'line' ? 'Area' : 'Line'}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">High</p>
              <p className="font-medium text-green-600">{formatChartPrice(stats.high)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Low</p>
              <p className="font-medium text-red-600">{formatChartPrice(stats.low)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Open</p>
              <p className="font-medium">{formatChartPrice(stats.open)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Change</p>
              <p
                className={cn('font-medium', stats.isPositive ? 'text-green-600' : 'text-red-600')}
              >
                {stats.isPositive ? '+' : ''}
                {formatChartPrice(stats.change)}
              </p>
            </div>
          </div>
        )}

        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="text-muted-foreground h-4 w-4" />
          <div className="flex gap-1">
            {timeRangeOptions.map((option) => (
              <Button
                key={option.value}
                variant={timeRange === option.value ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setTimeRange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {chartType === 'area' ? (
            <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`colorPrice-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => {
                  const date = new Date(value);
                  if (timeRange === '1h') {
                    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  }
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(value) => `$${value.toLocaleString()}`}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as PriceDataPoint;
                    return (
                      <div className="rounded-lg border bg-white p-3 shadow-lg">
                        <p className="text-muted-foreground text-sm">
                          {formatDate(data.timestamp)}
                        </p>
                        <p className="text-lg font-bold">{formatChartPrice(data.price)}</p>
                        {data.volume && (
                          <p className="text-muted-foreground text-sm">
                            Vol: {data.volume.toLocaleString()}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#colorPrice-${symbol})`}
              />
            </AreaChart>
          ) : (
            <LineChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => {
                  const date = new Date(value);
                  if (timeRange === '1h') {
                    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  }
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(value) => `$${value.toLocaleString()}`}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as PriceDataPoint;
                    return (
                      <div className="rounded-lg border bg-white p-3 shadow-lg">
                        <p className="text-muted-foreground text-sm">
                          {formatDate(data.timestamp)}
                        </p>
                        <p className="text-lg font-bold">{formatChartPrice(data.price)}</p>
                        {data.volume && (
                          <p className="text-muted-foreground text-sm">
                            Vol: {data.volume.toLocaleString()}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Generate mock price history data for demonstration
export function generateMockPriceHistory(
  basePrice: number,
  points: number = 100,
  volatility: number = 0.02,
): PriceDataPoint[] {
  const data: PriceDataPoint[] = [];
  const now = new Date();
  let currentPrice = basePrice;

  for (let i = points; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000).toISOString();
    const change = (Math.random() - 0.5) * volatility * currentPrice;
    currentPrice += change;

    data.push({
      timestamp,
      price: Math.max(currentPrice, basePrice * 0.5),
      volume: Math.floor(Math.random() * 1000000),
    });
  }

  return data;
}
