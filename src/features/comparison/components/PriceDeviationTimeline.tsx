'use client';

import { useMemo, useState, useEffect } from 'react';

import {
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Circle,
  Clock3,
} from 'lucide-react';

import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import { buildApiUrl } from '@/shared/utils';
import {
  formatDurationMinutes,
  formatTimeAgoShort,
  formatFullTime,
  formatFullDate,
} from '@/shared/utils/format';
import { formatDeviationSmall } from '@/shared/utils/format';
import type { PriceDeviationTimeline, PriceDeviationLevel } from '@/types/oracle/comparison';

interface PriceDeviationTimelineProps {
  data?: PriceDeviationTimeline;
  isLoading?: boolean;
  maxEvents?: number;
  symbol?: string;
  protocol?: string;
}

const levelConfig: Record<
  PriceDeviationLevel,
  {
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ElementType;
    ringColor: string;
    levelLabel: string;
  }
> = {
  low: {
    color: 'text-success',
    bgColor: 'bg-success/5',
    borderColor: 'border-success/30',
    icon: CheckCircle2,
    ringColor: 'ring-success/20',
    levelLabel: 'Low',
  },
  medium: {
    color: 'text-warning',
    bgColor: 'bg-warning/5',
    borderColor: 'border-warning/30',
    icon: TrendingUp,
    ringColor: 'ring-warning/20',
    levelLabel: 'Medium',
  },
  high: {
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/5',
    borderColor: 'border-orange-500/30',
    icon: TrendingDown,
    ringColor: 'ring-orange-500/20',
    levelLabel: 'High',
  },
  critical: {
    color: 'text-error',
    bgColor: 'bg-error/5',
    borderColor: 'border-error/30',
    icon: AlertTriangle,
    ringColor: 'ring-error/20',
    levelLabel: 'Critical',
  },
};

export function PriceDeviationTimeline({
  data: propData,
  isLoading: propLoading,
  maxEvents = 10,
  symbol = 'ETH/USD',
  protocol = 'chainlink',
}: PriceDeviationTimelineProps) {
  const { t } = useI18n();
  const [data, setData] = useState<PriceDeviationTimeline | undefined>(propData);
  const [isLoading, setIsLoading] = useState(propLoading ?? false);

  useEffect(() => {
    if (propData) {
      setData(propData);
    } else if (symbol && protocol) {
      setIsLoading(true);
      fetch(
        buildApiUrl('/api/comparison/deviation/history', {
          symbol,
          protocol,
          timeRange: '24h',
          type: 'timeline',
        }),
      )
        .then((res) => res.json())
        .then((result) => {
          if (result.data) {
            setData(result.data);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [symbol, protocol, propData]);

  const displayEvents = useMemo(() => {
    if (!data) return [];
    return data.events.slice(0, maxEvents);
  }, [data, maxEvents]);

  const eventStats = useMemo(() => {
    if (!data) return null;
    const total = data.events.length;
    const critical = data.events.filter((e) => e.deviationLevel === 'critical').length;
    const high = data.events.filter((e) => e.deviationLevel === 'high').length;
    const resolved = data.events.filter((e) => e.resolved).length;

    return { total, critical, high, resolved };
  }, [data]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.events.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('comparison.deviation.timelineTitle')}</CardTitle>
          <CardDescription>{t('comparison.status.noData')}</CardDescription>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
          <Clock className="mr-2 h-5 w-5" />
          {t('comparison.deviation.noEvents')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              {t('comparison.deviation.timelineTitle')}
            </CardTitle>
            <CardDescription className="mt-1 text-sm text-muted-foreground">
              {t('comparison.deviation.timelineDesc')}
            </CardDescription>
          </div>
          {eventStats && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {eventStats.total} {t('comparison.deviation.events')}
              </Badge>
              {eventStats.critical > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {eventStats.critical} {t('comparison.deviation.critical')}
                </Badge>
              )}
              {eventStats.resolved > 0 && (
                <Badge
                  variant="outline"
                  className="border-success/30 bg-success/5 text-xs text-success"
                >
                  {eventStats.resolved} Resolved
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute bottom-2 left-5 top-2 w-0.5 bg-gradient-to-b from-border via-muted-foreground/30 to-border" />

          <div className="space-y-8">
            {displayEvents.map((event, index) => {
              const config = levelConfig[event.deviationLevel];
              const Icon = config.icon;
              const isFirst = index === 0;
              const isLast = index === displayEvents.length - 1;

              return (
                <div key={event.id} className="relative flex gap-4 sm:gap-6">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300',
                        config.bgColor,
                        config.borderColor,
                        config.ringColor,
                        'ring-4',
                        isFirst && 'scale-110',
                      )}
                    >
                      <Icon className={cn('h-5 w-5', config.color)} />
                    </div>
                    {!isLast && (
                      <div
                        className={cn(
                          'w-0.5 flex-1',
                          event.deviationLevel === 'critical'
                            ? 'bg-error/20'
                            : event.deviationLevel === 'high'
                              ? 'bg-orange-500/20'
                              : event.deviationLevel === 'medium'
                                ? 'bg-warning/20'
                                : 'bg-success/20',
                        )}
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        'group rounded-xl border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:p-5',
                        config.bgColor,
                        config.borderColor,
                        'backdrop-blur-sm',
                      )}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs font-medium capitalize',
                              config.borderColor,
                              config.color,
                            )}
                          >
                            {config.levelLabel}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {event.protocol}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {event.symbol}
                          </Badge>
                          <Badge
                            variant={
                              event.deviationLevel === 'critical'
                                ? 'destructive'
                                : event.deviationLevel === 'high'
                                  ? 'default'
                                  : 'secondary'
                            }
                            className="text-xs font-semibold"
                          >
                            <Icon className="mr-1 h-3 w-3" />
                            {formatDeviationSmall(event.deviationPercent)}
                          </Badge>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            {event.resolved ? (
                              <div className="flex items-center gap-1 text-success">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="hidden text-xs font-medium sm:inline">
                                  Resolved
                                </span>
                              </div>
                            ) : (
                              <div className="flex animate-pulse items-center gap-1 text-error">
                                <XCircle className="h-4 w-4" />
                                <span className="hidden text-xs font-medium sm:inline">
                                  Ongoing
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock3 className="h-3 w-3" />
                              {formatFullTime(event.timestamp)}
                            </div>
                            <span className="text-[11px] text-muted-foreground/70">
                              {formatFullDate(event.timestamp)} ·{' '}
                              {formatTimeAgoShort(event.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                        <div className="rounded-lg border border-border/50 bg-background/50 p-3">
                          <p className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            {t('comparison.deviation.startPrice')}
                          </p>
                          <p className="text-sm font-semibold">${event.startPrice.toFixed(4)}</p>
                        </div>
                        <div className="rounded-lg border border-border/50 bg-background/50 p-3">
                          <p className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <TrendingDown className="h-3 w-3" />
                            {t('comparison.deviation.endPrice')}
                          </p>
                          <p className="text-sm font-semibold">${event.endPrice.toFixed(4)}</p>
                        </div>
                        <div className="rounded-lg border border-border/50 bg-background/50 p-3">
                          <p className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {t('comparison.deviation.duration')}
                          </p>
                          <p className="text-sm font-semibold">
                            {formatDurationMinutes(event.duration)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border/50 bg-background/50 p-3">
                          <p className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Circle className="h-3 w-3" />
                            {t('comparison.referencePrice')}
                          </p>
                          <p className="text-sm font-semibold">
                            ${event.referencePrice.toFixed(4)}
                          </p>
                        </div>
                      </div>

                      {!event.resolved && (
                        <div className="mt-4 flex items-center gap-2 rounded-lg border border-error/20 bg-error/5 p-3 text-error">
                          <AlertTriangle className="h-4 w-4 animate-pulse" />
                          <span className="text-sm font-medium">
                            {t('comparison.deviation.ongoing')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {data.events.length > maxEvents && (
          <div className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-center text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {t('comparison.deviation.showingEvents', {
              count: maxEvents,
              total: data.events.length,
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
