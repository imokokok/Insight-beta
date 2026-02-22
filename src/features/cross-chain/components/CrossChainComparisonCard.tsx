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

import { ContentSection } from '@/components/common';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui';
import { getChainColorTailwind, getChainDisplayName, type ChainId } from '@/config/chains';
import { useI18n } from '@/i18n';
import { cn, formatPrice, formatChangePercent, formatConfidence } from '@/shared/utils';

import type { CrossChainComparisonData } from '../types';

interface CrossChainComparisonCardProps {
  data?: CrossChainComparisonData;
  isLoading?: boolean;
  onRefresh?: () => void;
  selectedChains?: string[];
  onChainSelect?: (chain: string) => void;
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
      <ContentSection className="w-full">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-28" />
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      </ContentSection>
    );
  }

  if (!data || filteredPrices.length === 0) {
    return (
      <ContentSection
        className="w-full"
        title={t('crossChain.comparison.title')}
        description={t('crossChain.comparison.noData')}
      >
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Info className="mr-2 h-5 w-5" />
          {t('crossChain.comparison.selectAsset')}
        </div>
      </ContentSection>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <ContentSection
        className="w-full"
        title={
          <span className="flex items-center gap-2 text-lg font-semibold">
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
          </span>
        }
        description={t('crossChain.comparison.description', {
          count: filteredPrices.length.toString(),
        })}
        action={
          onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="mr-1 h-4 w-4" />
              {t('crossChain.controls.refresh')}
            </Button>
          )
        }
      >
        <div className="space-y-4">
          {/* Statistics Summary */}
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{t('crossChain.stats.avgPrice')}</p>
              <p className="font-mono font-semibold">{formatPrice(data.statistics.avgPrice)}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{t('crossChain.stats.medianPrice')}</p>
              <p className="font-mono font-semibold">{formatPrice(data.statistics.medianPrice)}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{t('crossChain.stats.priceRange')}</p>
              <p
                className={cn(
                  'font-mono font-semibold',
                  status === 'critical'
                    ? 'text-red-600'
                    : status === 'warning'
                      ? 'text-yellow-600'
                      : 'text-emerald-600',
                )}
              >
                {formatChangePercent(data.statistics.priceRangePercent / 100, 2, false)}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                {t('crossChain.stats.reliableSource')}
              </p>
              <p className="font-semibold">
                {getChainDisplayName(data.recommendations.mostReliableChain as ChainId)}
              </p>
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
                const chainColor = getChainColorTailwind(priceData.chain as ChainId);
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
                          onChainSelect && 'cursor-pointer hover:bg-opacity-20',
                        )}
                        onClick={() => onChainSelect?.(priceData.chain)}
                      >
                        <div className="flex items-center gap-3">
                          {isMaxPrice && <TrendingUp className="h-4 w-4 text-emerald-600" />}
                          {isMinPrice && <TrendingDown className="h-4 w-4 text-red-600" />}
                          <span className={cn('w-28 font-medium', chainColor?.text)}>
                            {getChainDisplayName(priceData.chain as ChainId)}
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="w-32 text-right font-mono font-semibold">
                            {formatPrice(priceData.price)}
                          </span>

                          <div className="flex w-24 items-center justify-end gap-1">
                            {deviationPercent >= 0 ? (
                              <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3 text-red-600" />
                            )}
                            <span
                              className={cn(
                                'font-mono text-sm font-medium',
                                deviationPercent > 0 ? 'text-emerald-600' : 'text-red-600',
                              )}
                            >
                              {formatChangePercent(deviationPercent / 100, 2, false)}
                            </span>
                          </div>

                          <div className="flex w-20 items-center justify-end gap-1">
                            {priceData.isStale ? (
                              <Badge variant="secondary" className="gap-1 text-xs">
                                <AlertTriangle className="h-3 w-3" />
                                {t('crossChain.status.stale')}
                              </Badge>
                            ) : isOutlier ? (
                              <Badge variant="destructive" className="gap-1 text-xs">
                                <AlertTriangle className="h-3 w-3" />
                                {t('crossChain.status.outlier')}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 bg-transparent text-xs">
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
                          {getChainDisplayName(priceData.chain as ChainId)} - {priceData.protocol}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <span className="text-muted-foreground">
                            {t('crossChain.tooltip.price')}:
                          </span>
                          <span className="font-medium">{formatPrice(priceData.price)}</span>

                          <span className="text-muted-foreground">
                            {t('crossChain.tooltip.deviation')}:
                          </span>
                          <span
                            className={cn(
                              'font-medium',
                              deviationPercent > 0 ? 'text-emerald-600' : 'text-red-600',
                            )}
                          >
                            {formatChangePercent(deviationPercent / 100, 2, false)}
                          </span>

                          <span className="text-muted-foreground">
                            {t('crossChain.tooltip.confidence')}:
                          </span>
                          <span className="font-medium">
                            {formatConfidence(priceData.confidence, 0)}
                          </span>

                          <span className="text-muted-foreground">
                            {t('crossChain.tooltip.updated')}:
                          </span>
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
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t('crossChain.recommendation.title')}</p>
                <p className="mt-1 text-xs text-muted-foreground">{data.recommendations.reason}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('crossChain.recommendation.reliable', {
                    chain: getChainDisplayName(data.recommendations.mostReliableChain as ChainId),
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
        </div>
      </ContentSection>
    </TooltipProvider>
  );
});
