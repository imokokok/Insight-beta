'use client';

import { memo } from 'react';

import {
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  BarChart3,
  LineChart,
  Info,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { CrossChainHistoricalResponse } from '@/features/cross-chain/hooks';
import { useI18n } from '@/i18n';
import { cn, formatPercentValue } from '@/shared/utils';

interface CrossChainHistoricalCardProps {
  data?: CrossChainHistoricalResponse['data'];
  isLoading?: boolean;
}

export const CrossChainHistoricalCard = memo(function CrossChainHistoricalCard({
  data,
  isLoading,
}: CrossChainHistoricalCardProps) {
  const { t } = useI18n();

  const summary = data?.summary;
  const dataPoints = data?.dataPoints ?? [];
  const timeRange = data?.timeInterval === '1hour' ? '1 Hour' : '1 Day';

  const trendDirection = summary && summary.avgPriceRangePercent > summary.maxObservedDeviation * 0.5
    ? 'volatile'
    : summary && summary.avgPriceRangePercent < 0.5
      ? 'stable'
      : 'normal';

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-1 h-4 w-72" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || dataPoints.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            {t('crossChain.historical.title')}
          </CardTitle>
          <CardDescription>{t('crossChain.historical.description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
          <Info className="mr-2 h-5 w-5" />
          {t('crossChain.historical.noData')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Clock className="h-5 w-5 text-blue-500" />
              {t('crossChain.historical.title')}
              <Badge variant="secondary" className="ml-2">
                {dataPoints.length} {t('crossChain.historical.dataPoints')}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1 text-sm text-muted-foreground">
              {t('crossChain.historical.description')}
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {timeRange}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {summary && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                {t('crossChain.historical.avgDeviation')}
              </p>
              <p className="font-mono text-xl font-bold">
                {formatPercentValue(summary.avgPriceRangePercent, 2)}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Activity className="h-3 w-3" />
                {t('crossChain.historical.maxDeviation')}
              </p>
              <p className="font-mono text-xl font-bold text-amber-600">
                {formatPercentValue(summary.maxObservedDeviation, 2)}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingDown className="h-3 w-3" />
                {t('crossChain.historical.convergence')}
              </p>
              <p className="font-mono text-xl font-bold text-green-600">
                {summary.convergenceCount}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                {t('crossChain.historical.divergence')}
              </p>
              <p className="font-mono text-xl font-bold text-red-600">
                {summary.divergenceCount}
              </p>
            </div>
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                {t('crossChain.historical.stableChain')}
              </p>
              <p className="font-semibold capitalize text-green-600">
                {summary.mostStableChain}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                {t('crossChain.historical.volatileChain')}
              </p>
              <p className="font-semibold capitalize text-red-600">
                {summary.mostVolatileChain}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <BarChart3 className="h-3 w-3" />
                {t('crossChain.historical.volatility')}
              </p>
              <Badge
                variant="outline"
                className={cn(
                  'mt-1',
                  trendDirection === 'stable' && 'text-green-600',
                  trendDirection === 'volatile' && 'text-red-600',
                  trendDirection === 'normal' && 'text-amber-600',
                )}
              >
                {trendDirection === 'stable' && <TrendingDown className="mr-1 h-3 w-3" />}
                {trendDirection === 'volatile' && <TrendingUp className="mr-1 h-3 w-3" />}
                {trendDirection === 'stable' ? 'Stable' : trendDirection === 'volatile' ? 'Volatile' : 'Normal'}
              </Badge>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <LineChart className="h-3 w-3" />
                {t('crossChain.historical.trend')}
              </p>
              <p className="font-mono text-sm font-medium">
                {summary.divergenceCount > summary.convergenceCount
                  ? t('crossChain.status.warning')
                  : t('crossChain.status.normal')}
              </p>
            </div>
          </div>
        )}

        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t('crossChain.historical.insights')}</span>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            {summary && (
              <>
                <p>
                  {summary.avgPriceRangePercent > 1
                    ? `Average deviation is ${formatPercentValue(summary.avgPriceRangePercent, 1)}, indicating significant price inconsistency across chains.`
                    : `Average deviation is ${formatPercentValue(summary.avgPriceRangePercent, 1)}, showing relatively consistent pricing across chains.`}
                </p>
                <p className="mt-2">
                  <span className="font-medium capitalize text-foreground">{summary.mostStableChain}</span>
                  {' '}is the most stable chain, while{' '}
                  <span className="font-medium capitalize text-foreground">{summary.mostVolatileChain}</span>
                  {' '}shows the highest volatility.
                </p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
