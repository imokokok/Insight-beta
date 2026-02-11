'use client';

import { memo, useMemo } from 'react';

import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Info,
  RefreshCw,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { CrossChainComparisonResult } from '@/hooks/useCrossChain';
import { useI18n } from '@/i18n';
import { cn, formatPrice } from '@/lib/utils';

interface CrossChainComparisonCardProps {
  data?: CrossChainComparisonResult;
  isLoading?: boolean;
  onRefresh?: () => void;
  selectedChains?: string[];
  onChainSelect?: (chain: string) => void;
}

const chainColors: Record<string, { bg: string; border: string; text: string }> = {
  ethereum: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500' },
  polygon: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-500' },
  bsc: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-500' },
  avalanche: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-500' },
  arbitrum: { bg: 'bg-blue-600/10', border: 'border-blue-600/30', text: 'text-blue-600' },
  optimism: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-500' },
  base: { bg: 'bg-blue-400/10', border: 'border-blue-400/30', text: 'text-blue-400' },
  solana: { bg: 'bg-gradient-to-r from-purple-500/10 to-amber-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
};

function formatDeviation(value: number): string {
  const absValue = Math.abs(value);
  if (absValue < 0.001) return '<0.1%';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatChainName(chain: string): string {
  return chain.charAt(0).toUpperCase() + chain.slice(1);
}

export const CrossChainComparisonCard = memo(function CrossChainComparisonCard({
  data,
  isLoading,
  onRefresh,
  selectedChains,
  onChainSelect,
}: CrossChainComparisonCardProps) {
  const { t } = useI18n();

  const filteredPrices = useMemo(() => {
    if (!data) return [];
    if (!selectedChains || selectedChains.length === 0) return data.pricesByChain;
    return data.pricesByChain.filter((p) => selectedChains.includes(p.chain));
  }, [data, selectedChains]);

  const status = useMemo(() => {
    if (!data) return 'normal';
    if (data.statistics.priceRangePercent > 2) return 'critical';
    if (data.statistics.priceRangePercent > 0.5) return 'warning';
    return 'normal';
  }, [data]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-1 h-4 w-72" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-28" />
                <Skeleton className="h-12 w-32" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || filteredPrices.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('crossChain.comparison.title')}</CardTitle>
          <CardDescription>{t('crossChain.comparison.noData')}</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground flex h-64 items-center justify-center">
          <Info className="mr-2 h-5 w-5" />
          {t('crossChain.comparison.selectAsset')}
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                {data.symbol} / USD
                {status === 'critical' && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {t('crossChain.status.critical')}
                  </Badge>
                )}
                {status === 'warning' && (
                  <Badge variant="secondary" className="gap-1 bg-yellow-500/20 text-yellow-600">
                    <AlertTriangle className="h-3 w-3" />
                    {t('crossChain.status.warning')}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1 text-sm">
                {t('crossChain.comparison.description', { count: filteredPrices.length.toString() })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {onRefresh && (
                <Button variant="outline" size="sm" onClick={onRefresh}>
                  <RefreshCw className="mr-1 h-4 w-4" />
                  {t('crossChain.controls.refresh')}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Statistics Summary */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-muted/30 rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">{t('crossChain.stats.avgPrice')}</p>
              <p className="font-mono font-semibold">{formatPrice(data.statistics.avgPrice)}</p>
            </div>
            <div className="bg-muted/30 rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">{t('crossChain.stats.medianPrice')}</p>
              <p className="font-mono font-semibold">{formatPrice(data.statistics.medianPrice)}</p>
            </div>
            <div className="bg-muted/30 rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">{t('crossChain.stats.priceRange')}</p>
              <p className={cn(
                'font-mono font-semibold',
                status === 'critical' ? 'text-red-600' : 
                status === 'warning' ? 'text-yellow-600' : 'text-emerald-600'
              )}>
                {formatDeviation(data.statistics.priceRangePercent)}
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">{t('crossChain.stats.reliableSource')}</p>
              <p className="font-semibold">{formatChainName(data.recommendations.mostReliableChain)}</p>
            </div>
          </div>

          {/* Chain Price List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b pb-2 text-xs text-muted-foreground">
              <span className="w-28">{t('crossChain.table.chain')}</span>
              <span className="w-32 text-right">{t('crossChain.table.price')}</span>
              <span className="w-24 text-right">{t('crossChain.table.deviation')}</span>
              <span className="w-20 text-right">{t('crossChain.table.status')}</span>
            </div>

            {filteredPrices
              .sort((a, b) => b.price - a.price)
              .map((priceData) => {
                const deviation = data.deviations.find((d) => d.chain === priceData.chain);
                const isOutlier = deviation?.isOutlier ?? false;
                const chainColor = chainColors[priceData.chain] ?? chainColors.ethereum;
                const isMinPrice = priceData.chain === data.statistics.minChain;
                const isMaxPrice = priceData.chain === data.statistics.maxChain;
                const deviationPercent = deviation?.deviationFromAvgPercent ?? 0;

                return (
                  <Tooltip key={priceData.chain}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'flex items-center justify-between rounded-lg border p-3 transition-colors',
                          chainColor?.bg,
                          chainColor?.border,
                          (isMinPrice || isMaxPrice) && 'ring-1 ring-primary/20',
                          onChainSelect && 'cursor-pointer hover:bg-opacity-20'
                        )}
                        onClick={() => onChainSelect?.(priceData.chain)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onChainSelect?.(priceData.chain);
                          }
                        }}
                        role={onChainSelect ? 'button' : undefined}
                        tabIndex={onChainSelect ? 0 : undefined}
                      >
                        <div className="flex items-center gap-3">
                          {isMaxPrice && <TrendingUp className="h-4 w-4 text-emerald-600" />}
                          {isMinPrice && <TrendingDown className="h-4 w-4 text-red-600" />}
                          <span className={cn('font-medium w-28', chainColor?.text)}>
                            {formatChainName(priceData.chain)}
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="font-mono w-32 text-right font-semibold">
                            {formatPrice(priceData.price)}
                          </span>

                          <div className="flex items-center gap-1 w-24 justify-end">
                            {deviationPercent >= 0 ? (
                              <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3 text-red-600" />
                            )}
                            <span className={cn(
                              'font-mono text-sm font-medium',
                              deviationPercent > 0 ? 'text-emerald-600' : 'text-red-600'
                            )}>
                              {formatDeviation(deviationPercent)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 w-20 justify-end">
                            {priceData.isStale ? (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {t('crossChain.status.stale')}
                              </Badge>
                            ) : isOutlier ? (
                              <Badge variant="destructive" className="text-xs gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {t('crossChain.status.outlier')}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs gap-1 bg-transparent">
                                <Minus className="h-3 w-3" />
                                {t('crossChain.status.normal')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs p-3">
                      <div className="space-y-2">
                        <div className="font-semibold">
                          {formatChainName(priceData.chain)} - {priceData.protocol}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <span className="text-muted-foreground">{t('crossChain.tooltip.price')}:</span>
                          <span className="font-medium">{formatPrice(priceData.price)}</span>

                          <span className="text-muted-foreground">{t('crossChain.tooltip.deviation')}:</span>
                          <span className={cn(
                            'font-medium',
                            deviationPercent > 0 ? 'text-emerald-600' : 'text-red-600'
                          )}>
                            {formatDeviation(deviationPercent)}
                          </span>

                          <span className="text-muted-foreground">{t('crossChain.tooltip.confidence')}:</span>
                          <span className="font-medium">
                            {priceData.confidence ? `${(priceData.confidence * 100).toFixed(0)}%` : 'N/A'}
                          </span>

                          <span className="text-muted-foreground">{t('crossChain.tooltip.updated')}:</span>
                          <span className="font-medium">
                            {new Date(priceData.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
          </div>

          {/* Recommendation */}
          <div className="bg-muted/20 rounded-lg border p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t('crossChain.recommendation.title')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.recommendations.reason}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('crossChain.recommendation.reliable', { 
                    chain: formatChainName(data.recommendations.mostReliableChain) 
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Last Updated */}
          <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
            <span>
              {t('crossChain.lastUpdated')}: {new Date(data.timestamp).toLocaleString()}
            </span>
            <span>
              {filteredPrices.length} {t('crossChain.chainsMonitored')}
            </span>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
});
