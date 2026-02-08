'use client';

import { useMemo, useState } from 'react';

import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  Info,
  Shield,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

export interface Alert {
  id: string;
  type: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  protocol?: string;
  assetPair?: string;
  acknowledged: boolean;
}

interface AlertCenterProps {
  alerts: Alert[];
  loading?: boolean;
  className?: string;
  onAcknowledge?: (alertId: string) => void;
  onDismiss?: (alertId: string) => void;
}

export function AlertCenter({
  alerts,
  loading,
  className,
  onAcknowledge,
  onDismiss,
}: AlertCenterProps) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'unacknowledged'>('all');

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (filter === 'all') return true;
      if (filter === 'unacknowledged') return !alert.acknowledged;
      return alert.type === filter;
    });
  }, [alerts, filter]);

  const stats = useMemo(() => {
    return {
      total: alerts.length,
      critical: alerts.filter((a) => a.type === 'critical').length,
      high: alerts.filter((a) => a.type === 'high').length,
      medium: alerts.filter((a) => a.type === 'medium').length,
      unacknowledged: alerts.filter((a) => !a.acknowledged).length,
    };
  }, [alerts]);

  const getAlertConfig = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return {
          icon: Shield,
          color: 'bg-rose-50 text-rose-700 border-rose-200',
          badgeColor: 'bg-rose-100 text-rose-800',
          label: t('protocol:alertLevel.critical'),
        };
      case 'high':
        return {
          icon: AlertTriangle,
          color: 'bg-orange-50 text-orange-700 border-orange-200',
          badgeColor: 'bg-orange-100 text-orange-800',
          label: t('protocol:alertLevel.high'),
        };
      case 'medium':
        return {
          icon: AlertCircle,
          color: 'bg-amber-50 text-amber-700 border-amber-200',
          badgeColor: 'bg-amber-100 text-amber-800',
          label: t('protocol:alertLevel.medium'),
        };
      case 'low':
        return {
          icon: Info,
          color: 'bg-blue-50 text-blue-700 border-blue-200',
          badgeColor: 'bg-blue-100 text-blue-800',
          label: t('protocol:alertLevel.low'),
        };
      case 'info':
        return {
          icon: CheckCircle,
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          badgeColor: 'bg-emerald-100 text-emerald-800',
          label: t('protocol:alertLevel.info'),
        };
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ${t('common:ago')}`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${t('common:ago')}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${t('common:ago')}`;
    const days = Math.floor(hours / 24);
    return `${days}d ${t('common:ago')}`;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5" />
              {t('protocol:alerts.title')}
              {stats.unacknowledged > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {stats.unacknowledged}
                </Badge>
              )}
            </CardTitle>
          </div>

          {/* Alert Stats */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'rounded-lg border p-2 text-center transition-colors',
                filter === 'all'
                  ? 'bg-primary/10 border-primary'
                  : 'bg-muted/50 hover:bg-muted'
              )}
            >
              <div className="text-lg font-bold">{stats.total}</div>
              <div className="text-muted-foreground text-xs">{t('protocol:alerts.all')}</div>
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={cn(
                'rounded-lg border p-2 text-center transition-colors',
                filter === 'critical'
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-muted/50 hover:bg-muted'
              )}
            >
              <div className="text-lg font-bold text-rose-600">{stats.critical}</div>
              <div className="text-muted-foreground text-xs">
                {t('protocol:alertLevel.critical')}
              </div>
            </button>
            <button
              onClick={() => setFilter('high')}
              className={cn(
                'rounded-lg border p-2 text-center transition-colors',
                filter === 'high'
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-muted/50 hover:bg-muted'
              )}
            >
              <div className="text-lg font-bold text-orange-600">{stats.high}</div>
              <div className="text-muted-foreground text-xs">
                {t('protocol:alertLevel.high')}
              </div>
            </button>
            <button
              onClick={() => setFilter('unacknowledged')}
              className={cn(
                'rounded-lg border p-2 text-center transition-colors',
                filter === 'unacknowledged'
                  ? 'bg-primary/10 border-primary'
                  : 'bg-muted/50 hover:bg-muted'
              )}
            >
              <div className="text-lg font-bold">{stats.unacknowledged}</div>
              <div className="text-muted-foreground text-xs">
                {t('protocol:alerts.unacknowledged')}
              </div>
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-2 p-4">
            {filteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="text-muted-foreground mb-4 h-12 w-12" />
                <p className="text-muted-foreground">{t('protocol:alerts.noAlerts')}</p>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const config = getAlertConfig(alert.type);
                const Icon = config.icon;

                return (
                  <div
                    key={alert.id}
                    className={cn(
                      'relative rounded-lg border p-4 transition-all',
                      config.color,
                      alert.acknowledged && 'opacity-60'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{alert.title}</span>
                              <Badge variant="secondary" className={cn('text-xs', config.badgeColor)}>
                                {config.label}
                              </Badge>
                            </div>
                            <p className="text-sm opacity-90 mt-1">{alert.message}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs opacity-70">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTimeAgo(alert.timestamp)}
                              </span>
                              {alert.protocol && (
                                <Badge variant="outline" className="text-xs">
                                  {alert.protocol}
                                </Badge>
                              )}
                              {alert.assetPair && (
                                <Badge variant="outline" className="text-xs">
                                  {alert.assetPair}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {!alert.acknowledged && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onAcknowledge?.(alert.id)}
                                className="h-7 text-xs"
                              >
                                {t('protocol:alerts.acknowledge')}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDismiss?.(alert.id)}
                              className="h-7 w-7"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
