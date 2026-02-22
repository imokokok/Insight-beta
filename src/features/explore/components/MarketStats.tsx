'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

import { Progress } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

interface MarketStatsProps {
  activeFeeds: number;
  activeFeedsChange: number;
  protocolCoverage: {
    chainlink: number;
    pyth: number;
    redstone: number;
  };
  deviationDistribution: {
    low: number;
    medium: number;
    high: number;
  };
}

export function MarketStats({
  activeFeeds,
  activeFeedsChange,
  protocolCoverage,
  deviationDistribution,
}: MarketStatsProps) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4">
      <div className="rounded-xl border border-border/30 bg-card/30 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground md:text-sm">
            {t('market.stats.activeFeeds')}
          </p>
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium',
              activeFeedsChange >= 0 ? 'text-emerald-500' : 'text-red-500',
            )}
          >
            {activeFeedsChange >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(activeFeedsChange).toFixed(1)}%
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold md:text-3xl">{activeFeeds.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{t('market.stats.last24h')}</p>
      </div>

      <div className="rounded-xl border border-border/30 bg-card/30 p-4">
        <p className="text-xs text-muted-foreground md:text-sm">
          {t('market.stats.protocolCoverage')}
        </p>
        <div className="mt-3 space-y-2">
          {Object.entries(protocolCoverage).map(([protocol, coverage]) => (
            <div key={protocol} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="capitalize">{protocol}</span>
                <span className="font-medium">{coverage}%</span>
              </div>
              <Progress value={coverage} className="h-1.5" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border/30 bg-card/30 p-4">
        <p className="text-xs text-muted-foreground md:text-sm">
          {t('market.stats.deviationDistribution')}
        </p>
        <div className="mt-3 space-y-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {t('market.deviation.low')}
              </span>
              <span className="font-medium">{deviationDistribution.low}%</span>
            </div>
            <Progress
              value={deviationDistribution.low}
              className="h-1.5 bg-emerald-100 [&>div]:bg-emerald-500"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                {t('market.deviation.medium')}
              </span>
              <span className="font-medium">{deviationDistribution.medium}%</span>
            </div>
            <Progress
              value={deviationDistribution.medium}
              className="h-1.5 bg-amber-100 [&>div]:bg-amber-500"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                {t('market.deviation.high')}
              </span>
              <span className="font-medium">{deviationDistribution.high}%</span>
            </div>
            <Progress
              value={deviationDistribution.high}
              className="h-1.5 bg-red-100 [&>div]:bg-red-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
