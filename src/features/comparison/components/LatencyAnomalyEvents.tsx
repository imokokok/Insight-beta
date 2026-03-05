'use client';

import { useMemo, useState, useEffect } from 'react';

import { AlertTriangle, Zap, Activity, CheckCircle2, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import { buildApiUrl } from '@/shared/utils';
import { formatLatency, formatDurationMinutes, formatTimeAgoShort } from '@/shared/utils/format';
import type { LatencyAnomalyTimeline } from '@/types/oracle/comparison';

interface LatencyAnomalyEventsProps {
  data?: LatencyAnomalyTimeline;
  isLoading?: boolean;
  maxEvents?: number;
  symbol?: string;
  protocol?: string;
  chain?: string;
}

const severityConfig = {
  warning: {
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: AlertTriangle,
  },
  critical: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: Zap,
  },
  emergency: {
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: Activity,
  },
};

export function LatencyAnomalyEvents({
  data: propData,
  isLoading: propLoading,
  maxEvents = 10,
  symbol,
  protocol,
  chain,
}: LatencyAnomalyEventsProps) {
  const { t } = useI18n();
  const [data, setData] = useState<LatencyAnomalyTimeline | undefined>(propData);
  const [isLoading, setIsLoading] = useState(propLoading ?? false);

  useEffect(() => {
    if (propData) {
      setData(propData);
    } else {
      setIsLoading(true);
      fetch(
        buildApiUrl('/api/comparison/latency/events', {
          symbol,
          protocol,
          chain,
          timeRange: '24h',
          type: 'anomalies',
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
  }, [symbol, protocol, chain, propData]);

  const displayEvents = useMemo(() => {
    if (!data) return [];
    return data.events.slice(0, maxEvents);
  }, [data, maxEvents]);

  const eventStats = useMemo(() => {
    if (!data) return null;
    const total = data.events.length;
    const emergency = data.events.filter((e) => e.severity === 'emergency').length;
    const critical = data.events.filter((e) => e.severity === 'critical').length;
    const resolved = data.events.filter((e) => e.resolved).length;

    return { total, emergency, critical, resolved };
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
              <Skeleton key={i} className="h-32" />
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
          <CardTitle>{t('comparison.latency.anomalyTitle')}</CardTitle>
          <CardDescription>{t('comparison.status.noData')}</CardDescription>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
          <CheckCircle2 className="mr-2 h-5 w-5" />
          {t('comparison.latency.noAnomalies')}
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
              {t('comparison.latency.anomalyTitle')}
            </CardTitle>
            <CardDescription className="mt-1 text-sm text-muted-foreground">
              {t('comparison.latency.anomalyDesc')}
            </CardDescription>
          </div>
          {eventStats && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {eventStats.total} {t('comparison.latency.events')}
              </Badge>
              {eventStats.emergency > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {eventStats.emergency} {t('comparison.latency.emergency')}
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
              const config = severityConfig[event.severity];
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
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {event.protocol}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {event.symbol}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {event.chain}
                        </Badge>
                        <Badge
                          variant={event.severity === 'emergency' ? 'destructive' : 'default'}
                          className="text-xs"
                        >
                          <Icon className="mr-1 h-3 w-3" />
                          {t(`comparison.latency.${event.severity}`)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {event.resolved ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgoShort(event.timestamp)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t('comparison.latency.currentLatency')}
                        </p>
                        <p className={cn('font-medium', config.color)}>
                          {formatLatency(event.latencyMs)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t('comparison.latency.threshold')}
                        </p>
                        <p className="font-medium">{formatLatency(event.threshold)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t('comparison.latency.duration')}
                        </p>
                        <p className="font-medium">{formatDurationMinutes(event.duration)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t('comparison.latency.affectedFeeds')}
                        </p>
                        <p className="font-medium">{event.impact.affectedFeeds}</p>
                      </div>
                    </div>

                    {event.cause && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <span className="font-medium">{t('comparison.latency.cause')}:</span>{' '}
                        {event.cause}
                      </div>
                    )}

                    {!event.resolved && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{t('comparison.latency.ongoing')}</span>
                      </div>
                    )}

                    {event.resolved && event.resolvedAt && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {t('comparison.latency.resolvedAt')}:{' '}
                        {new Date(event.resolvedAt).toLocaleTimeString()}
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
            {t('comparison.latency.showingEvents', {
              count: maxEvents,
              total: data.events.length,
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
