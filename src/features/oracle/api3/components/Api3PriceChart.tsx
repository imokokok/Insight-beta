'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

import { Calendar, LineChart, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  Area,
  AreaChart,
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
  timeRange?: '1h' | '4h' | '1d' | '1w' | '1m' | 'custom';
  className?: string;
}

const generateMockData = (timeRange: string): Api3PriceData[] => {
  const now = Date.now();
  const points =
    timeRange === '1h'
      ? 60
      : timeRange === '4h'
        ? 96
        : timeRange === '1d'
          ? 144
          : timeRange === '1w'
            ? 168
            : timeRange === '1m'
              ? 180
              : 720;
  const interval =
    timeRange === '1h'
      ? 60000
      : timeRange === '4h'
        ? 150000
        : timeRange === '1d'
          ? 600000
          : timeRange === '1w'
            ? 3600000
            : timeRange === '1m'
              ? 7200000
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
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
] as const;

export function Api3PriceChart({
  symbol,
  chain,
  timeRange: initialTimeRange = '1d',
  className,
}: Api3PriceChartProps) {
  const { t } = useI18n();
  const [timeRange, setTimeRange] = useState<'1h' | '4h' | '1d' | '1w' | '1m' | 'custom'>(
    initialTimeRange,
  );
  const [data, setData] = useState<Api3PriceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [brushData, setBrushData] = useState<Api3PriceData[]>([]);
  const [showBrush, setShowBrush] = useState(true);
  const [, setVisibleDataRange] = useState<{ start: number; end: number }>({ start: 0, end: 1 });
  const [customDateRange, setCustomDateRange] = useState<{ startDate: string; endDate: string }>({
    startDate: '',
    endDate: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 400));
        const newData = generateMockData(timeRange);

        if (timeRange === 'custom' && customDateRange.startDate && customDateRange.endDate) {
          const startTime = new Date(customDateRange.startDate).getTime();
          const endTime = new Date(customDateRange.endDate).getTime();
          const filteredData = newData.filter((item) => {
            const itemTime = new Date(item.timestamp).getTime();
            return itemTime >= startTime && itemTime <= endTime;
          });
          setData(filteredData);
          setBrushData(filteredData);
        } else {
          setData(newData);
          setBrushData(newData);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [symbol, chain, timeRange, customDateRange]);

  const sampledData = useMemo(() => {
    if (data.length <= 200) return data;
    const sampleRate = Math.ceil(data.length / 200);
    return data.filter((_, index) => index % sampleRate === 0);
  }, [data]);

  const chartData = useMemo(() => {
    return (brushData.length > 0 ? brushData : sampledData).map((item) => ({
      ...item,
      date: new Date(item.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour:
          timeRange === '1h' || timeRange === '4h' || timeRange === '1d' ? 'numeric' : undefined,
        minute: timeRange === '1h' ? 'numeric' : undefined,
      }),
    }));
  }, [sampledData, brushData, timeRange]);

  const priceMetrics = useMemo(() => {
    if (data.length === 0) return null;
    const latest = data[data.length - 1];
    if (!latest) return null;

    const getChange = (periodLength: number) => {
      const startIndex = Math.max(0, data.length - 1 - periodLength);
      const start = data[startIndex];
      return start ? ((latest.price - start.price) / start.price) * 100 : 0;
    };

    return {
      price: latest.price,
      emaPrice: latest.emaPrice,
      change1m: getChange(1),
      change5m: getChange(5),
      change1h: getChange(Math.min(60, data.length - 1)),
      change24h: getChange(Math.min(96, data.length - 1)),
      change7d: getChange(Math.min(168, data.length - 1)),
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
      const newData = generateMockData(timeRange);
      setData(newData);
      setBrushData(newData);
      setIsLoading(false);
    }, 400);
  };

  const handleBrushChange = ({
    startIndex,
    endIndex,
  }: {
    startIndex: number;
    endIndex: number;
  }) => {
    if (!data || data.length === 0) return;
    const start = Math.max(0, startIndex ?? 0);
    const end = Math.min(data.length - 1, endIndex ?? data.length - 1);
    setBrushData(data.slice(start, end + 1));
    setVisibleDataRange({ start, end });
  };

  const handleResetBrush = () => {
    setBrushData(data);
    setVisibleDataRange({ start: 0, end: data.length - 1 });
  };

  const handleTimeRangeChange = useCallback(
    (range: '1h' | '4h' | '1d' | '1w' | '1m' | 'custom') => {
      if (range === 'custom') {
        setShowDatePicker(true);
      } else {
        setShowDatePicker(false);
        setTimeRange(range);
      }
    },
    [],
  );

  const handleCustomDateApply = useCallback(() => {
    if (customDateRange.startDate && customDateRange.endDate) {
      setTimeRange('custom');
      setShowDatePicker(false);
    }
  }, [customDateRange]);

  const handleCustomDateChange = useCallback((field: 'startDate' | 'endDate', value: string) => {
    setCustomDateRange((prev) => ({ ...prev, [field]: value }));
  }, []);

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
                  onClick={() => handleTimeRangeChange(option.value)}
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
              <button
                key="custom"
                onClick={() => handleTimeRangeChange('custom')}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  timeRange === 'custom' ? 'text-primary-foreground bg-primary' : 'hover:bg-muted',
                )}
              >
                {t('api3.price.custom')}
              </button>
            </div>
            {showDatePicker && (
              <div className="flex items-center gap-2 rounded-lg border bg-background p-2">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={customDateRange.startDate}
                    onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                    className="rounded border px-2 py-1 text-xs"
                  />
                </div>
                <span className="text-xs text-muted-foreground">-</span>
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={customDateRange.endDate}
                    onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                    className="rounded border px-2 py-1 text-xs"
                  />
                </div>
                <Button size="sm" onClick={handleCustomDateApply} className="text-xs">
                  {t('api3.price.apply')}
                </Button>
              </div>
            )}
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {priceMetrics && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <div>
                <p className="text-sm text-muted-foreground">{t('api3.price.currentPrice')}</p>
                <p className="text-2xl font-bold">{formatPrice(priceMetrics.price)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('api3.price.emaPrice')}</p>
                <p className="text-lg font-semibold text-muted-foreground">
                  {formatPrice(priceMetrics.emaPrice)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">1h</p>
                <p
                  className={cn(
                    'text-lg font-semibold',
                    priceMetrics.change1h >= 0 ? 'text-green-500' : 'text-red-500',
                  )}
                >
                  {priceMetrics.change1h >= 0 ? '+' : ''}
                  {priceMetrics.change1h.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">24h</p>
                <p
                  className={cn(
                    'text-lg font-semibold',
                    priceMetrics.change24h >= 0 ? 'text-green-500' : 'text-red-500',
                  )}
                >
                  {priceMetrics.change24h >= 0 ? '+' : ''}
                  {priceMetrics.change24h.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">7d</p>
                <p
                  className={cn(
                    'text-lg font-semibold',
                    priceMetrics.change7d >= 0 ? 'text-green-500' : 'text-red-500',
                  )}
                >
                  {priceMetrics.change7d >= 0 ? '+' : ''}
                  {priceMetrics.change7d.toFixed(2)}%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span>1m:</span>
                <span
                  className={cn(
                    'font-semibold',
                    priceMetrics.change1m >= 0 ? 'text-green-500' : 'text-red-500',
                  )}
                >
                  {priceMetrics.change1m >= 0 ? '+' : ''}
                  {priceMetrics.change1m.toFixed(3)}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span>5m:</span>
                <span
                  className={cn(
                    'font-semibold',
                    priceMetrics.change5m >= 0 ? 'text-green-500' : 'text-red-500',
                  )}
                >
                  {priceMetrics.change5m >= 0 ? '+' : ''}
                  {priceMetrics.change5m.toFixed(3)}%
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
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

          {showBrush && (
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={sampledData.map((item) => ({
                    ...item,
                    date: new Date(item.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    }),
                  }))}
                >
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis hide domain={['auto', 'auto']} />
                  <XAxis hide dataKey="date" />
                  <Brush
                    dataKey="date"
                    height={30}
                    stroke="#3b82f6"
                    onChange={handleBrushChange}
                    tickFormatter={() => ''}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#3b82f6"
                    strokeWidth={1}
                    fillOpacity={1}
                    fill="url(#colorPrice)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBrush(!showBrush)}
              className="text-xs"
            >
              {showBrush ? (
                <Minimize2 className="mr-1 h-3 w-3" />
              ) : (
                <Maximize2 className="mr-1 h-3 w-3" />
              )}
              {showBrush ? t('api3.price.hideBrush') : t('api3.price.showBrush')}
            </Button>
            {brushData.length < data.length && (
              <Button variant="outline" size="sm" onClick={handleResetBrush} className="text-xs">
                {t('api3.price.resetView')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
