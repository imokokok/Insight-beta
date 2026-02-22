'use client';

import { RefreshCw } from 'lucide-react';

import { ContentSection, ContentGrid } from '@/components/common';
import { Skeleton } from '@/components/ui';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useI18n } from '@/i18n/LanguageProvider';

import { MarketHealthScore } from './MarketHealthScore';
import { MarketStats } from './MarketStats';
import { RecentAnomalies } from './RecentAnomalies';
import { useMarketOverview } from '../hooks/useMarketOverview';

export function MarketOverview() {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const { data, isLoading, error, mutate } = useMarketOverview();

  if (error) {
    return (
      <div className="border-destructive/50 bg-destructive/10 rounded-xl border p-6 text-center">
        <p className="text-destructive">{t('common.errorLoading')}</p>
        <button
          onClick={() => mutate()}
          className="mt-4 min-h-[44px] px-4 text-sm text-primary hover:underline"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight md:text-2xl">
          {t('market.overview.title')}
        </h2>
        <button
          onClick={() => mutate()}
          disabled={isLoading}
          className="flex min-h-[44px] items-center gap-2 px-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{t('common.refresh')}</span>
        </button>
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-4">
        <ContentSection className="lg:col-span-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 md:py-8">
              <Skeleton className="h-24 w-24 rounded-full md:h-28 md:w-28" />
            </div>
          ) : (
            <MarketHealthScore score={data?.healthScore ?? 0} />
          )}
        </ContentSection>

        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-border/30 bg-card/30 p-4">
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <MarketStats
              activeFeeds={data?.activeFeeds ?? 0}
              activeFeedsChange={data?.activeFeedsChange ?? 0}
              protocolCoverage={data?.protocolCoverage ?? { chainlink: 0, pyth: 0, redstone: 0 }}
              deviationDistribution={data?.deviationDistribution ?? { low: 0, medium: 0, high: 0 }}
            />
          )}
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="rounded-xl border border-border/30 bg-card/30 p-4 md:p-6">
              <Skeleton className="h-48 w-full md:h-64" />
            </div>
          ) : (
            <ContentSection title={t('market.stats.detailedStats')}>
              <ContentGrid columns={2}>
                <div className="rounded-lg border border-border/30 bg-muted/20 p-3 md:p-4">
                  <p className="text-xs text-muted-foreground md:text-sm">
                    {t('market.stats.totalProtocols')}
                  </p>
                  <p className="mt-1 text-xl font-bold md:text-2xl">3</p>
                  <p className="text-xs text-muted-foreground">Chainlink, Pyth, Redstone</p>
                </div>
                <div className="rounded-lg border border-border/30 bg-muted/20 p-3 md:p-4">
                  <p className="text-xs text-muted-foreground md:text-sm">
                    {t('market.stats.avgUpdateLatency')}
                  </p>
                  <p className="mt-1 text-xl font-bold md:text-2xl">~2.5s</p>
                  <p className="text-xs text-muted-foreground">{t('market.stats.lastHour')}</p>
                </div>
                <div className="rounded-lg border border-border/30 bg-muted/20 p-3 md:p-4">
                  <p className="text-xs text-muted-foreground md:text-sm">
                    {t('market.stats.dataQuality')}
                  </p>
                  <p className="mt-1 text-xl font-bold text-emerald-500 md:text-2xl">98.5%</p>
                  <p className="text-xs text-muted-foreground">
                    {t('market.stats.basedOnSamples')}
                  </p>
                </div>
                <div className="rounded-lg border border-border/30 bg-muted/20 p-3 md:p-4">
                  <p className="text-xs text-muted-foreground md:text-sm">
                    {t('market.stats.uptime')}
                  </p>
                  <p className="mt-1 text-xl font-bold text-emerald-500 md:text-2xl">99.9%</p>
                  <p className="text-xs text-muted-foreground">{t('market.stats.last30Days')}</p>
                </div>
              </ContentGrid>
            </ContentSection>
          )}
        </div>

        <div className="lg:col-span-1">
          <RecentAnomalies
            anomalies={data?.recentAnomalies ?? []}
            isLoading={isLoading}
            maxItems={isMobile ? 3 : 5}
          />
        </div>
      </div>
    </div>
  );
}
