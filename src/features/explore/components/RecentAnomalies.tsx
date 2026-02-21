'use client';

import Link from 'next/link';

import { AlertTriangle, ArrowRight, Zap, Clock, TrendingUp } from 'lucide-react';

import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { getSeverityConfig } from '@/features/alerts/constants';
import { useI18n } from '@/i18n/LanguageProvider';
import { formatTime, cn } from '@/shared/utils';

import type { AnomalySummary } from '../types';

interface RecentAnomaliesProps {
  anomalies: AnomalySummary[];
  isLoading?: boolean;
  maxItems?: number;
}

const anomalyTypeConfig: Record<
  AnomalySummary['type'],
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  price_spike: {
    icon: TrendingUp,
    color: 'text-rose-500',
    bgColor: 'bg-rose-50',
  },
  deviation: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
  },
  delay: {
    icon: Clock,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
  },
  new_feed: {
    icon: Zap,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
  },
};

export function RecentAnomalies({ anomalies, isLoading, maxItems = 5 }: RecentAnomaliesProps) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">{t('market.anomalies.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const displayAnomalies = anomalies.slice(0, maxItems);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">{t('market.anomalies.title')}</CardTitle>
        <Link
          href="/alerts"
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          {t('market.anomalies.viewAll')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {displayAnomalies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-2 rounded-full bg-emerald-100 p-3">
              <AlertTriangle className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="text-sm text-muted-foreground">{t('market.anomalies.noAnomalies')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayAnomalies.map((anomaly) => {
              const typeConfig = anomalyTypeConfig[anomaly.type];
              const severityConf = getSeverityConfig(anomaly.severity);
              const Icon = typeConfig.icon;

              return (
                <Link
                  key={anomaly.id}
                  href={`/alerts?id=${anomaly.id}`}
                  className="group flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      typeConfig.bgColor,
                    )}
                  >
                    <Icon className={cn('h-5 w-5', typeConfig.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{anomaly.symbol}</span>
                      <Badge variant={severityConf.variant} className="text-xs">
                        {severityConf.label}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{anomaly.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatTime(anomaly.timestamp)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 self-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
