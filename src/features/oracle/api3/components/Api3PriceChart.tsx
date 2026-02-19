'use client';

import { useState, useEffect, useMemo } from 'react';

import { LineChart, RefreshCw } from 'lucide-react';
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

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SkeletonList } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

import type { Api3PriceData } from '../types/api3';

interface Api3PriceChartProps {
  symbol: string;
  chain?: string;
  timeRange?: '1h' | '24h' | '7d' | '30d';
  className?: string;
}

const generateMockData = (timeRange: string): Api3PriceData[] => {
  const now = Date.now();
  const points =
    timeRange === '1h' ? 60 : timeRange === '24h' ? 96 : timeRange === '7d' ? 168 : 720;
  const interval =
    timeRange === '1h'
      ? 60000
      : timeRange === '24h'
        ? 900000
        : timeRange === '7d'
          ? 600000
          : 3600000;

  const basePrice = 2450;
  let currentPrice = basePrice;
  let emaPrice = basePrice;

  return Array.from({ length: points }, (_, i) => {
    const change = (Math.random() - 0.5) * 20;
    currentPrice = currentPrice + change;
    emaPrice = emaPrice * 0.95 + currentPrice * 0.05;

    return {
      timestamp: new Date(now - (points - 1 - i) * interval).toISOString(),
      price: Math.max(currentPrice, 0),
      emaPrice: Math.max(emaPrice, 0),
    };
  });
};

const timeRangeOptions = [
  { value: '1h', label: '1H' },
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
] as const;

export function Api3PriceChart({
  symbol,
  chain,
  timeRange: initialTimeRange = '24h',
  className,
}: Api3PriceChartProps) {
  const { t } = useI18n();
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>(initialTimeRange);
  const [data, setData] = useState<Api3PriceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 400));
        setData(generateMockData(timeRange));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [symbol, chain, timeRange]);

  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      date: new Date(item.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: timeRange === '1h' || timeRange === '24h' ? 'numeric' : undefined,
        minute: timeRange === '1h' ? 'numeric' : undefined,
      }),
    }));
  }, [data, timeRange]);

  const latestPrice = useMemo(() => {
    if (data.length === 0) return null;
    const latest = data[data.length - 1];
    if (!latest) return null;
    const previous = data[data.length - 2];
    const change = previous ? ((latest.price - previous.price) / previous.price) * 100 : 0;
    return {
      price: latest.price,
      emaPrice: latest.emaPrice,
      change,
    };
  }, [data]);

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setData(generateMockData(timeRange));
      setIsLoading(false);
    }, 400);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-primary" />
            {symbol}/USD
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonList count={1} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-primary" />
              {symbol}/USD
              {chain && (
                <Badge variant="secondary" className="ml-2 capitalize">
                  {chain}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">{t('api3.price.description')}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border p-1">
              {timeRangeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimeRange(option.value)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    timeRange === option.value
                      ? 'text-primary-foreground bg-primary'
                      : 'hover:bg-muted',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {latestPrice && (
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('api3.price.currentPrice')}</p>
              <p className="text-2xl font-bold">{formatPrice(latestPrice.price)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('api3.price.emaPrice')}</p>
              <p className="text-lg font-semibold text-muted-foreground">
                {formatPrice(latestPrice.emaPrice)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('api3.price.change')}</p>
              <p
                className={cn(
                  'text-lg font-semibold',
                  latestPrice.change >= 0 ? 'text-green-500' : 'text-red-500',
                )}
              >
                {latestPrice.change >= 0 ? '+' : ''}
                {latestPrice.change.toFixed(4)}%
              </p>
            </div>
          </div>
        )}

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                domain={['auto', 'auto']}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value, name) => [
                  formatPrice(Number(value) || 0),
                  name === 'price' ? t('api3.price.spotPrice') : t('api3.price.emaPrice'),
                ]}
                labelFormatter={(label) => `${t('common.time')}: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="price"
                name={t('api3.price.spotPrice')}
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="emaPrice"
                name={t('api3.price.emaPrice')}
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span>{t('api3.price.spotPrice')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-0.5 bg-purple-500" />
            <span>{t('api3.price.emaPrice')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
