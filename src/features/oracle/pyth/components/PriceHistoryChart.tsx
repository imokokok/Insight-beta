'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

import { motion } from 'framer-motion';
import { TrendingUp, Clock, Activity } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { useI18n } from '@/i18n';
import { fetchApiData } from '@/shared/utils';
import { cn } from '@/shared/utils/ui';

import type { PriceHistoryPoint, PriceHistoryResponse } from '../types/pyth';

type TimeRangeKey = '1h' | '24h' | '7d' | '30d';

interface TimeRangeConfig {
  label: string;
  hours: number;
  limit: number;
}

const TIME_RANGE_CONFIG: Record<TimeRangeKey, TimeRangeConfig> = {
  '1h': { label: '1小时', hours: 1, limit: 60 },
  '24h': { label: '24小时', hours: 24, limit: 1440 },
  '7d': { label: '7天', hours: 168, limit: 1000 },
  '30d': { label: '30天', hours: 720, limit: 2000 },
};

const POPULAR_SYMBOLS = [
  'BTC/USD',
  'ETH/USD',
  'SOL/USD',
  'BNB/USD',
  'XRP/USD',
  'AVAX/USD',
  'LINK/USD',
  'DOGE/USD',
];

interface PriceHistoryChartProps {
  isLoading?: boolean;
}

export function PriceHistoryChart({ isLoading: externalLoading }: PriceHistoryChartProps) {
  useI18n();
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRangeKey>('24h');
  const [selectedSymbol, setSelectedSymbol] = useState<string>(POPULAR_SYMBOLS[0] ?? 'BTC/USD');
  const [chartData, setChartData] = useState<PriceHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);

  const timeRangeConfig = TIME_RANGE_CONFIG[selectedTimeRange];

  const fetchPriceHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - timeRangeConfig.hours * 60 * 60 * 1000);

      const response = await fetchApiData<PriceHistoryResponse>(
        `/api/oracle/history/prices?protocol=pyth&symbol=${encodeURIComponent(selectedSymbol)}&startTime=${startTime.toISOString()}&endTime=${endTime.toISOString()}&limit=${timeRangeConfig.limit}`,
      );

      if (response && response.data) {
        const formattedData = response.data.map((point) => ({
          ...point,
          timestamp: new Date(point.timestamp).getTime(),
        }));
        setChartData(formattedData);
      } else {
        setChartData(generateMockData(selectedSymbol, timeRangeConfig));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price history');
      setChartData(generateMockData(selectedSymbol, timeRangeConfig));
    } finally {
      setLoading(false);
    }
  }, [selectedSymbol, timeRangeConfig]);

  useEffect(() => {
    fetchPriceHistory();
  }, [fetchPriceHistory]);

  const { stats, formattedData } = useMemo(() => {
    if (chartData.length === 0) {
      return {
        stats: {
          minPrice: 0,
          maxPrice: 0,
          avgPrice: 0,
          priceChange: 0,
          volatility: 0,
        },
        formattedData: [],
      };
    }

    const prices = chartData.map((d) => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

    const firstPrice = prices[0] ?? 0;
    const lastPrice = prices[prices.length - 1] ?? 0;
    const priceChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

    const volatility =
      prices.length > 1
        ? (Math.sqrt(
            prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length,
          ) /
            avgPrice) *
          100
        : 0;

    const formatTime = (timestamp: number) => {
      const date = new Date(timestamp);
      if (selectedTimeRange === '1h' || selectedTimeRange === '24h') {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return {
      stats: {
        minPrice,
        maxPrice,
        avgPrice,
        priceChange,
        volatility,
      },
      formattedData: chartData.map((point) => ({
        ...point,
        time: formatTime(
          typeof point.timestamp === 'number'
            ? point.timestamp
            : new Date(point.timestamp).getTime(),
        ),
        price: point.price,
      })),
    };
  }, [chartData, selectedTimeRange]);

  const formatPrice = (value: number) => {
    if (value >= 1000) {
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    if (value >= 1) {
      return value.toFixed(2);
    }
    return value.toFixed(4);
  };

  if (loading || externalLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>价格趋势分析</CardTitle>
          <CardDescription>Pyth 价格历史走势</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-80 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            价格趋势分析
          </CardTitle>
          <CardDescription>Pyth 价格历史走势与波动分析</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="选择价格源" />
              </SelectTrigger>
              <SelectContent>
                {POPULAR_SYMBOLS.map((symbol) => (
                  <SelectItem key={symbol} value={symbol}>
                    {symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Tabs
              value={selectedTimeRange}
              onValueChange={(value) => setSelectedTimeRange(value as TimeRangeKey)}
            >
              <TabsList>
                <TabsTrigger value="1h">1小时</TabsTrigger>
                <TabsTrigger value="24h">24小时</TabsTrigger>
                <TabsTrigger value="7d">7天</TabsTrigger>
                <TabsTrigger value="30d">30天</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-lg bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Activity className="h-3.5 w-3.5" />
                当前价格
              </div>
              <p className="mt-1 text-lg font-semibold">
                ${formatPrice(formattedData[formattedData.length - 1]?.price || 0)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                变化率
              </div>
              <p
                className={cn(
                  'mt-1 text-lg font-semibold',
                  stats.priceChange >= 0 ? 'text-green-500' : 'text-red-500',
                )}
              >
                {stats.priceChange >= 0 ? '+' : ''}
                {stats.priceChange.toFixed(2)}%
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">最高价</div>
              <p className="mt-1 text-lg font-semibold">${formatPrice(stats.maxPrice)}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">最低价</div>
              <p className="mt-1 text-lg font-semibold">${formatPrice(stats.minPrice)}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                波动率
              </div>
              <p className="mt-1 text-lg font-semibold">{stats.volatility.toFixed(2)}%</p>
            </div>
          </div>

          {formattedData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={formattedData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    tickFormatter={(value) => formatPrice(value)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [`$${formatPrice(value as number)}`, '价格']}
                    labelFormatter={(label) => `时间: ${label}`}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="price"
                    name="价格"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                  {formattedData.length > 0 && (
                    <ReferenceLine
                      y={stats.avgPrice}
                      stroke="#6366f1"
                      strokeDasharray="5 5"
                      label={{
                        value: `均值: $${formatPrice(stats.avgPrice)}`,
                        position: 'right',
                        fill: '#6366f1',
                        fontSize: 11,
                      }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-80 items-center justify-center text-muted-foreground">
              暂无价格历史数据
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function generateMockData(symbol: string, timeRange: TimeRangeConfig): PriceHistoryPoint[] {
  const data: PriceHistoryPoint[] = [];
  const now = Date.now();
  const basePrice = getBasePrice(symbol);
  const intervalMs = (timeRange.hours * 60 * 60 * 1000) / timeRange.limit;

  let currentPrice = basePrice * (0.98 + Math.random() * 0.04);

  for (let i = 0; i < timeRange.limit; i++) {
    const timestamp = now - (timeRange.limit - i) * intervalMs;
    const change = (Math.random() - 0.5) * basePrice * 0.02;
    currentPrice = Math.max(currentPrice + change, basePrice * 0.8);

    data.push({
      timestamp: new Date(timestamp).toISOString(),
      symbol,
      price: currentPrice,
      confidence: Math.random() * 2 + 0.5,
      priceChange: ((currentPrice - basePrice) / basePrice) * 100,
      volatility: Math.random() * 3,
    });
  }

  return data;
}

function getBasePrice(symbol: string): number {
  const prices: Record<string, number> = {
    'BTC/USD': 67000,
    'ETH/USD': 3450,
    'SOL/USD': 178,
    'BNB/USD': 598,
    'XRP/USD': 0.52,
    'AVAX/USD': 35.5,
    'LINK/USD': 14.5,
    'DOGE/USD': 0.12,
  };
  return prices[symbol] || 100;
}
