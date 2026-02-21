'use client';

import { useState, useMemo } from 'react';

import { TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { usePriceHistory } from '@/features/oracle/analytics/deviation/hooks/usePriceHistory';
import { PriceHistoryChart } from '@/features/oracle/components/PriceHistoryChart';
import type { SingleAssetDataPoint } from '@/features/oracle/components/PriceHistoryChart';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

type TimeRangeKey = '24h' | '7d' | '30d';

interface TimeRangeConfig {
  label: string;
  hours: number;
  limit: number;
}

const TIME_RANGE_CONFIG: Record<TimeRangeKey, TimeRangeConfig> = {
  '24h': { label: '24H', hours: 24, limit: 96 },
  '7d': { label: '7D', hours: 168, limit: 168 },
  '30d': { label: '30D', hours: 720, limit: 180 },
};

const POPULAR_PAIRS = [
  { symbol: 'ETH/USD', displaySymbol: 'ETH' },
  { symbol: 'BTC/USD', displaySymbol: 'BTC' },
  { symbol: 'LINK/USD', displaySymbol: 'LINK' },
];

interface ChainlinkPriceHistoryProps {
  className?: string;
}

export function ChainlinkPriceHistory({ className }: ChainlinkPriceHistoryProps) {
  const { t } = useI18n();
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRangeKey>('24h');
  const [selectedPair, setSelectedPair] = useState<string>(POPULAR_PAIRS[0]?.symbol ?? 'ETH/USD');

  const timeRangeConfig = TIME_RANGE_CONFIG[selectedTimeRange];
  const startTime = useMemo(() => {
    const now = new Date();
    now.setHours(now.getHours() - timeRangeConfig.hours);
    return now;
  }, [timeRangeConfig.hours]);

  const { data, isLoading, isError, error, refresh } = usePriceHistory('chainlink', selectedPair, {
    startTime,
    limit: timeRangeConfig.limit,
  });

  const chartData: SingleAssetDataPoint[] = useMemo(() => {
    return data.map((record) => ({
      timestamp: new Date(record.timestamp).getTime(),
      price: record.price,
    }));
  }, [data]);

  const priceStats = useMemo(() => {
    if (chartData.length === 0) return null;

    const prices = chartData.map((p) => p.price);
    const currentPrice = prices[prices.length - 1] ?? 0;
    const firstPrice = prices[0] ?? 0;
    const priceChange = currentPrice - firstPrice;
    const priceChangePercent = firstPrice !== 0 ? (priceChange / firstPrice) * 100 : 0;
    const highPrice = Math.max(...prices);
    const lowPrice = Math.min(...prices);

    return {
      currentPrice,
      priceChange,
      priceChangePercent,
      highPrice,
      lowPrice,
    };
  }, [chartData]);

  const currentPairDisplay =
    POPULAR_PAIRS.find((p) => p.symbol === selectedPair)?.displaySymbol ?? selectedPair;

  if (isError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('chainlink.priceHistory.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <div>
              <p className="font-medium text-foreground">{t('common.error')}</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refresh()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('common.retry')}
            </Button>
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
              {t('chainlink.priceHistory.title')}
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
                {t('chainlink.priceHistory.inPeriod')}
              </CardDescription>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-1">
              {POPULAR_PAIRS.map((pair) => (
                <Button
                  key={pair.symbol}
                  variant={selectedPair === pair.symbol ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPair(pair.symbol)}
                  className="h-8 px-3 text-xs"
                >
                  {pair.displaySymbol}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {(Object.keys(TIME_RANGE_CONFIG) as TimeRangeKey[]).map((key) => (
                <Button
                  key={key}
                  variant={selectedTimeRange === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTimeRange(key)}
                  className="h-8 px-2 text-xs"
                >
                  {TIME_RANGE_CONFIG[key].label}
                </Button>
              ))}
              <Button variant="ghost" size="sm" onClick={() => refresh()} className="ml-1">
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-lg bg-muted/30 p-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="mt-2 h-6 w-20" />
                </div>
              ))}
            </div>
            <Skeleton className="h-80 w-full" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t('chainlink.priceHistory.noData')}</p>
          </div>
        ) : (
          <>
            {priceStats && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    {t('chainlink.priceHistory.currentPrice')}
                  </p>
                  <p className="mt-1 font-mono text-lg font-semibold">
                    $
                    {priceStats.currentPrice.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    {t('chainlink.priceHistory.high')}
                  </p>
                  <p className="mt-1 font-mono text-lg font-semibold text-emerald-500">
                    ${priceStats.highPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">{t('chainlink.priceHistory.low')}</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-red-500">
                    ${priceStats.lowPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    {t('chainlink.priceHistory.change')}
                  </p>
                  <p
                    className={cn(
                      'mt-1 font-mono text-lg font-semibold',
                      priceStats.priceChange >= 0 ? 'text-emerald-500' : 'text-red-500',
                    )}
                  >
                    {priceStats.priceChange >= 0 ? '+' : ''}${priceStats.priceChange.toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            <PriceHistoryChart
              data={chartData}
              symbol={currentPairDisplay}
              title=""
              height={320}
              mode="single"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
