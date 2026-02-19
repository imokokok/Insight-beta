'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

import { TrendingUp, AlertTriangle, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useI18n } from '@/i18n';
import { cn, formatTime } from '@/shared/utils';

export interface PriceDataPoint {
  timestamp: string;
  price: number;
  volume?: number;
  sourceCount: number;
  deviation: number;
  isValid: boolean;
}

export interface AggregationStatus {
  totalSources: number;
  activeSources: number;
  lastUpdate: string;
  avgResponseTime: number;
  status: 'healthy' | 'degraded' | 'error';
}

interface BandPriceChartProps {
  symbol: string;
  chain?: string;
  timeRange?: '1h' | '6h' | '24h' | '7d' | '30d';
  className?: string;
}

const TIME_RANGE_CONFIG = {
  '1h': { label: '1H', interval: 60000, points: 60 },
  '6h': { label: '6H', interval: 300000, points: 72 },
  '24h': { label: '24H', interval: 900000, points: 96 },
  '7d': { label: '7D', interval: 3600000, points: 168 },
  '30d': { label: '30D', interval: 14400000, points: 180 },
};

const getDeviationColor = (deviation: number): string => {
  const absDeviation = Math.abs(deviation);
  if (absDeviation >= 5) return '#dc2626';
  if (absDeviation >= 2) return '#ea580c';
  if (absDeviation >= 1) return '#f97316';
  return '#22c55e';
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: PriceDataPoint }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload as PriceDataPoint;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <p className="mb-2 text-xs text-muted-foreground">{formatTime(label)}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">Price</span>
          <span className="font-mono font-semibold">${data.price.toFixed(4)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">Sources</span>
          <span className="font-mono">{data.sourceCount}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">Deviation</span>
          <span
            className="font-mono font-medium"
            style={{ color: getDeviationColor(data.deviation) }}
          >
            {(data.deviation * 100).toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">Status</span>
          {data.isValid ? (
            <Badge variant="success" size="sm">
              Valid
            </Badge>
          ) : (
            <Badge variant="warning" size="sm">
              Anomaly
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export function BandPriceChart({
  symbol,
  chain = 'cosmos',
  timeRange = '24h',
  className,
}: BandPriceChartProps) {
  const { t } = useI18n();
  const [priceData, setPriceData] = useState<PriceDataPoint[]>([]);
  const [aggregationStatus, setAggregationStatus] = useState<AggregationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        symbol,
        chain,
        timeRange: selectedTimeRange,
      });

      const response = await fetch(`/api/band/prices?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch price data');
      }
      const data = await response.json();
      setPriceData(data.priceHistory ?? []);
      setAggregationStatus(data.aggregationStatus ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPriceData([]);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, chain, selectedTimeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartData = useMemo(() => {
    return priceData.map((point) => ({
      ...point,
      time: new Date(point.timestamp).getTime(),
      formattedTime: formatTime(point.timestamp),
    }));
  }, [priceData]);

  const priceStats = useMemo(() => {
    if (priceData.length === 0) return null;

    const prices = priceData.map((p) => p.price);
    const currentPrice = prices[prices.length - 1] ?? 0;
    const firstPrice = prices[0] ?? 0;
    const priceChange = currentPrice - firstPrice;
    const priceChangePercent = firstPrice !== 0 ? (priceChange / firstPrice) * 100 : 0;
    const highPrice = Math.max(...prices);
    const lowPrice = Math.min(...prices);
    const avgDeviation =
      priceData.reduce((sum, p) => sum + Math.abs(p.deviation), 0) / priceData.length;

    return {
      currentPrice,
      priceChange,
      priceChangePercent,
      highPrice,
      lowPrice,
      avgDeviation,
    };
  }, [priceData]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {symbol} {t('band.priceChart.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {symbol} {t('band.priceChart.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <div>
              <p className="font-medium text-foreground">{t('common.error')}</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('common.retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {symbol} {t('band.priceChart.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t('band.priceChart.noData')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {symbol} {t('band.priceChart.title')}
            </CardTitle>
            {priceStats && (
              <CardDescription className="mt-1">
                <span
                  className={cn(
                    'font-mono font-medium',
                    priceStats.priceChangePercent >= 0 ? 'text-emerald-500' : 'text-red-500',
                  )}
                >
                  {priceStats.priceChangePercent >= 0 ? '+' : ''}
                  {priceStats.priceChangePercent.toFixed(2)}%
                </span>{' '}
                {t('band.priceChart.inPeriod')}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            {Object.entries(TIME_RANGE_CONFIG).map(([key, config]) => (
              <Button
                key={key}
                variant={selectedTimeRange === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTimeRange(key as typeof timeRange)}
                className="h-8 px-2 text-xs"
              >
                {config.label}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={fetchData} className="ml-2">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {priceStats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{t('band.priceChart.currentPrice')}</p>
              <p className="mt-1 font-mono text-lg font-semibold">
                ${priceStats.currentPrice.toFixed(4)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{t('band.priceChart.high')}</p>
              <p className="mt-1 font-mono text-lg font-semibold text-emerald-500">
                ${priceStats.highPrice.toFixed(4)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{t('band.priceChart.low')}</p>
              <p className="mt-1 font-mono text-lg font-semibold text-red-500">
                ${priceStats.lowPrice.toFixed(4)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{t('band.priceChart.avgDeviation')}</p>
              <p
                className="mt-1 font-mono text-lg font-semibold"
                style={{ color: getDeviationColor(priceStats.avgDeviation) }}
              >
                {(priceStats.avgDeviation * 100).toFixed(2)}%
              </p>
            </div>
          </div>
        )}

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                domain={['auto', 'auto']}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={priceStats?.currentPrice}
                stroke="#6366f1"
                strokeDasharray="5 5"
                label={{
                  value: 'Current',
                  position: 'right',
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="price"
                name="Price"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#6366f1' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {aggregationStatus && (
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">{t('band.priceChart.aggregationStatus')}</span>
              <StatusBadge
                status={
                  aggregationStatus.status === 'healthy'
                    ? 'active'
                    : aggregationStatus.status === 'degraded'
                      ? 'warning'
                      : 'offline'
                }
                text={aggregationStatus.status}
                size="sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                <span>
                  {aggregationStatus.activeSources}/{aggregationStatus.totalSources}{' '}
                  {t('band.priceChart.activeSources')}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {t('band.priceChart.lastUpdate')}: {formatTime(aggregationStatus.lastUpdate)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>
                  {t('band.priceChart.avgResponse')}: {aggregationStatus.avgResponseTime}ms
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
