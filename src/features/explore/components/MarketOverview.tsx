'use client';

import { RefreshCw } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
      <Card className="border-destructive/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-destructive">{t('common.errorLoading')}</p>
          <button
            onClick={() => mutate()}
            className="mt-4 text-sm text-primary hover:underline min-h-[44px] px-4"
          >
            {t('common.retry')}
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-2xl font-bold tracking-tight">{t('market.overview.title')}</h2>
        <button
          onClick={() => mutate()}
          disabled={isLoading}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 min-h-[44px] px-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{t('common.refresh')}</span>
        </button>
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm md:text-base font-medium">
              {t('market.healthScore.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-6 md:py-8">
                <Skeleton className="h-24 w-24 md:h-28 md:w-28 rounded-full" />
              </div>
            ) : (
              <MarketHealthScore score={data?.healthScore ?? 0} />
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <MarketStats
              activeFeeds={data?.activeFeeds ?? 0}
              activeFeedsChange={data?.activeFeedsChange ?? 0}
              updates24h={data?.updates24h ?? 0}
              protocolCoverage={data?.protocolCoverage ?? { chainlink: 0, pyth: 0, redstone: 0 }}
              deviationDistribution={data?.deviationDistribution ?? { low: 0, medium: 0, high: 0 }}
            />
          )}
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {isLoading ? (
            <Card>
              <CardContent className="p-4 md:p-6">
                <Skeleton className="h-48 md:h-64 w-full" />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm md:text-base font-medium">
                  {t('market.stats.detailedStats')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="rounded-lg border p-3 md:p-4">
                    <p className="text-xs md:text-sm text-muted-foreground">{t('market.stats.totalProtocols')}</p>
                    <p className="mt-1 text-xl md:text-2xl font-bold">3</p>
                    <p className="text-xs text-muted-foreground">Chainlink, Pyth, Redstone</p>
                  </div>
                  <div className="rounded-lg border p-3 md:p-4">
                    <p className="text-xs md:text-sm text-muted-foreground">{t('market.stats.avgUpdateLatency')}</p>
                    <p className="mt-1 text-xl md:text-2xl font-bold">~2.5s</p>
                    <p className="text-xs text-muted-foreground">{t('market.stats.lastHour')}</p>
                  </div>
                  <div className="rounded-lg border p-3 md:p-4">
                    <p className="text-xs md:text-sm text-muted-foreground">{t('market.stats.dataQuality')}</p>
                    <p className="mt-1 text-xl md:text-2xl font-bold text-emerald-500">98.5%</p>
                    <p className="text-xs text-muted-foreground">{t('market.stats.basedOnSamples')}</p>
                  </div>
                  <div className="rounded-lg border p-3 md:p-4">
                    <p className="text-xs md:text-sm text-muted-foreground">{t('market.stats.uptime')}</p>
                    <p className="mt-1 text-xl md:text-2xl font-bold text-emerald-500">99.9%</p>
                    <p className="text-xs text-muted-foreground">{t('market.stats.last30Days')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
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
