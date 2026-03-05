'use client';

import { useMemo, useState, useEffect } from 'react';

import {
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import { buildApiUrl } from '@/shared/utils';
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
  { color: string; bgColor: string; borderColor: string; icon: React.ElementType }
> = {
  low: {
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/20',
    icon: CheckCircle2,
  },
  medium: {
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/20',
    icon: TrendingUp,
  },
  high: {
    color: 'text-warning-dark',
    bgColor: 'bg-warning/20',
    borderColor: 'border-warning/30',
    icon: TrendingDown,
  },
  critical: {
    color: 'text-error',
    bgColor: 'bg-error/10',
    borderColor: 'border-error/20',
    icon: AlertTriangle,
  },
};

function formatDeviation(value: number): string {
  const percentValue = Math.abs(value) * 100;
  if (percentValue < 0.01) return '<0.01%';
  return `${percentValue.toFixed(2)}%`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes.toFixed(0)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) {
    const hours = Math.floor(diffMins / 60);
    return `${hours}h ago`;
  }
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

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
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
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
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              {t('comparison.deviation.timelineTitle')}
            </CardTitle>
            <CardDescription className="mt-1 text-sm text-muted-foreground">
              {t('comparison.deviation.timelineDesc')}
            </CardDescription>
          </div>
          {eventStats && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {eventStats.total} {t('comparison.deviation.events')}
              </Badge>
              {eventStats.critical > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {eventStats.critical} {t('comparison.deviation.critical')}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute bottom-0 left-4 top-0 w-0.5 bg-border" />

          <div className="space-y-4">
            {displayEvents.map((event) => {
              const config = levelConfig[event.deviationLevel];
              const Icon = config.icon;

              return (
                <div key={event.id} className="relative pl-10">
                  <div
                    className={cn(
                      'absolute left-2.5 top-1 flex h-4 w-4 items-center justify-center rounded-full',
                      config.bgColor,
                      config.borderColor,
                      'border-2',
                    )}
                  >
                    <div className={cn('h-2 w-2 rounded-full', config.color)} />
                  </div>

                  <div
                    className={cn(
                      'rounded-lg border p-4 transition-all hover:shadow-md',
                      config.bgColor,
                      config.borderColor,
                    )}
                  >
                    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">
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
                          className="text-xs"
                        >
                          <Icon className="mr-1 h-3 w-3" />
                          {formatDeviation(event.deviationPercent)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {event.resolved ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-error" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatTime(event.timestamp)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t('comparison.deviation.startPrice')}
                        </p>
                        <p className="font-medium">${event.startPrice.toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t('comparison.deviation.endPrice')}
                        </p>
                        <p className="font-medium">${event.endPrice.toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t('comparison.deviation.duration')}
                        </p>
                        <p className="font-medium">{formatDuration(event.duration)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t('comparison.referencePrice')}
                        </p>
                        <p className="font-medium">${event.referencePrice.toFixed(4)}</p>
                      </div>
                    </div>

                    {!event.resolved && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-error">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{t('comparison.deviation.ongoing')}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {data.events.length > maxEvents && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
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
