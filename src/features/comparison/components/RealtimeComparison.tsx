'use client';

import { Clock, RefreshCw } from 'lucide-react';

import { ContentSection, ContentGrid } from '@/components/common';
import { Badge } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import type { RealtimeComparisonItem, ComparisonFilter } from '@/types/oracle/comparison';

interface RealtimeComparisonProps {
  data: RealtimeComparisonItem[] | undefined;
  isLoading: boolean;
  isLive: boolean;
  onRefresh: () => void;
  filter: ComparisonFilter;
  onFilterChange: (filter: ComparisonFilter) => void;
}

export function RealtimeComparisonView({
  data,
  isLoading,
  isLive,
  onRefresh,
}: RealtimeComparisonProps) {
  const { t } = useI18n();

  const formatPrice = (price: number) => {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'stale':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    }
  };

  if (isLoading && !data?.length) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="rounded-xl border border-border/30 bg-card/30 py-12 text-center">
        <p className="text-muted-foreground">{t('common.noData')}</p>
      </div>
    );
  }

  return (
    <ContentSection
      title={t('comparison.realtime.title')}
      description={t('comparison.realtime.description')}
      action={
        <div className="flex items-center gap-2">
          {isLive && (
            <Badge variant="success" className="animate-pulse">
              {t('common.live')}
            </Badge>
          )}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex min-h-[44px] items-center gap-2 px-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.slice(0, 6).map((item) => (
          <div
            key={item.symbol}
            className="rounded-xl border border-border/30 bg-card/30 p-4 transition-colors hover:bg-muted/30"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold">{item.symbol}</span>
              <span className="text-xs text-muted-foreground">
                {t('comparison.spread')}: {(item.spread.percent * 100).toFixed(2)}%
              </span>
            </div>

            <div className="space-y-2">
              {item.protocols.slice(0, 3).map((protocol) => (
                <div
                  key={protocol.protocol}
                  className="flex items-center justify-between rounded-lg bg-muted/20 p-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {protocol.protocol}
                    </Badge>
                    <Badge className={cn('text-xs', getStatusColor(protocol.status))}>
                      {protocol.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${formatPrice(protocol.price)}</p>
                    <div className="flex items-center justify-end gap-1 text-xs">
                      <span
                        className={cn(
                          protocol.deviationFromConsensus < 0.005
                            ? 'text-emerald-500'
                            : protocol.deviationFromConsensus < 0.01
                              ? 'text-amber-500'
                              : 'text-red-500',
                        )}
                      >
                        {(protocol.deviationFromConsensus * 100).toFixed(3)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border/30 pt-2 text-xs text-muted-foreground">
              <span>
                {t('comparison.consensus')}: ${formatPrice(item.consensus.median)}
              </span>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(item.protocols[0]?.timestamp || new Date().toISOString())}
              </div>
            </div>
          </div>
        ))}
      </div>

      {data.length > 0 && (
        <div className="mt-6 border-t border-border/30 pt-4">
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            {t('comparison.realtime.summary')}
          </p>
          <ContentGrid columns={4}>
            <div className="rounded-lg border border-border/30 bg-muted/20 p-3 text-center">
              <p className="text-xs text-muted-foreground">{t('comparison.totalPairs')}</p>
              <p className="mt-1 text-lg font-bold">{data.length}</p>
            </div>
            <div className="rounded-lg border border-border/30 bg-muted/20 p-3 text-center">
              <p className="text-xs text-muted-foreground">{t('comparison.avgSpread')}</p>
              <p className="mt-1 text-lg font-bold">
                {(
                  (data.reduce((sum, item) => sum + item.spread.percent, 0) / data.length) *
                  100
                ).toFixed(3)}
                %
              </p>
            </div>
            <div className="rounded-lg border border-border/30 bg-muted/20 p-3 text-center">
              <p className="text-xs text-muted-foreground">{t('comparison.activeProtocols')}</p>
              <p className="mt-1 text-lg font-bold">
                {new Set(data.flatMap((item) => item.protocols.map((p) => p.protocol))).size}
              </p>
            </div>
            <div className="rounded-lg border border-border/30 bg-muted/20 p-3 text-center">
              <p className="text-xs text-muted-foreground">{t('comparison.healthyFeeds')}</p>
              <p className="mt-1 text-lg font-bold text-emerald-500">
                {data.flatMap((item) => item.protocols).filter((p) => p.status === 'active').length}
              </p>
            </div>
          </ContentGrid>
        </div>
      )}
    </ContentSection>
  );
}
