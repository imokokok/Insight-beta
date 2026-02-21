'use client';

import { Activity, RefreshCw, Layers, TrendingUp, TrendingDown } from 'lucide-react';

import { Card, CardContent } from '@/components/ui';
import { Progress } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { useI18n } from '@/i18n/LanguageProvider';
import { cn } from '@/shared/utils';

interface MarketStatsProps {
  activeFeeds: number;
  activeFeedsChange: number;
  updates24h: number;
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
  isLoading?: boolean;
}

export function MarketStats({
  activeFeeds,
  activeFeedsChange,
  updates24h,
  protocolCoverage,
  deviationDistribution,
  isLoading,
}: MarketStatsProps) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const trendIcon = activeFeedsChange >= 0 ? TrendingUp : TrendingDown;
  const trendColor = activeFeedsChange >= 0 ? 'text-emerald-500' : 'text-rose-500';
  const TrendIcon = trendIcon;

  const stats = [
    {
      title: t('market.stats.activeFeeds'),
      value: activeFeeds.toLocaleString(),
      change: activeFeedsChange,
      icon: <Activity className="h-5 w-5" />,
      color: 'blue',
    },
    {
      title: t('market.stats.updates24h'),
      value: updates24h.toLocaleString(),
      icon: <RefreshCw className="h-5 w-5" />,
      color: 'green',
    },
    {
      title: t('market.stats.protocolCoverage'),
      value: `${Math.round((protocolCoverage.chainlink + protocolCoverage.pyth + protocolCoverage.redstone) / 3)}%`,
      icon: <Layers className="h-5 w-5" />,
      color: 'purple',
    },
  ];

  const iconBgClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-emerald-100 text-emerald-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, index) => (
          <Card key={index} className="overflow-hidden transition-all hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight">{stat.value}</span>
                    {stat.change !== undefined && (
                      <span className={cn('flex items-center text-sm', trendColor)}>
                        <TrendIcon className="mr-1 h-3 w-3" />
                        {Math.abs(stat.change)}%
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full',
                    iconBgClasses[stat.color],
                  )}
                >
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <h4 className="mb-3 text-sm font-medium text-muted-foreground">
              {t('market.stats.protocolCoverageDetail')}
            </h4>
            <div className="space-y-3">
              {Object.entries(protocolCoverage).map(([protocol, coverage]) => (
                <div key={protocol} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize">{protocol}</span>
                    <span className="font-medium">{coverage}%</span>
                  </div>
                  <Progress value={coverage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h4 className="mb-3 text-sm font-medium text-muted-foreground">
              {t('market.stats.deviationDistribution')}
            </h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {t('market.deviation.low')}
                  </span>
                  <span className="font-medium">{deviationDistribution.low}%</span>
                </div>
                <Progress
                  value={deviationDistribution.low}
                  className="h-2 bg-emerald-100 [&>div]:bg-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    {t('market.deviation.medium')}
                  </span>
                  <span className="font-medium">{deviationDistribution.medium}%</span>
                </div>
                <Progress
                  value={deviationDistribution.medium}
                  className="h-2 bg-amber-100 [&>div]:bg-amber-500"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    {t('market.deviation.high')}
                  </span>
                  <span className="font-medium">{deviationDistribution.high}%</span>
                </div>
                <Progress
                  value={deviationDistribution.high}
                  className="h-2 bg-red-100 [&>div]:bg-red-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
