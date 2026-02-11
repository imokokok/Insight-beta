'use client';

import { memo } from 'react';

import {
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Server,
  Wifi,
  Clock,
  RefreshCw,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n';
import type { CrossChainDashboardData } from '@/hooks/useCrossChain';
import { cn } from '@/lib/utils';
import { STATUS_COLORS } from '@/lib/types/common';

interface CrossChainDashboardCardProps {
  data?: CrossChainDashboardData;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const statusConfig: Record<string, { icon: typeof CheckCircle; primary: string; bg: string; text: string; border: string; dot: string; label: string; color: string }> = {
  healthy: { icon: CheckCircle, ...STATUS_COLORS.healthy, label: 'Healthy', color: 'text-emerald-600' },
  degraded: { icon: AlertTriangle, ...STATUS_COLORS.degraded, label: 'Degraded', color: 'text-amber-600' },
  offline: { icon: XCircle, ...STATUS_COLORS.unhealthy, label: 'Offline', color: 'text-red-600' },
};

const defaultStatusConfig = statusConfig.offline;

function formatStaleness(minutes: number): string {
  if (minutes < 1) return '<1m ago';
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const CrossChainDashboardCard = memo(function CrossChainDashboardCard({
  data,
  isLoading,
  onRefresh,
}: CrossChainDashboardCardProps) {
  const { t } = useI18n();

  const healthyChains = data?.chainHealth.filter((c) => c.status === 'healthy').length ?? 0;
  const degradedChains = data?.chainHealth.filter((c) => c.status === 'degraded').length ?? 0;
  const offlineChains = data?.chainHealth.filter((c) => c.status === 'offline').length ?? 0;
  const totalChains = data?.chainHealth.length ?? 0;

  const healthPercent = totalChains > 0 ? (healthyChains / totalChains) * 100 : 0;

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-1 h-4 w-72" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            {t('crossChain.dashboard.title')}
          </CardTitle>
          <CardDescription>{t('crossChain.dashboard.description')}</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground flex h-64 items-center justify-center">
          <RefreshCw className="mr-2 h-5 w-5" />
          {t('crossChain.dashboard.loading')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Activity className="h-5 w-5 text-blue-500" />
              {t('crossChain.dashboard.title')}
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-1 text-sm">
              {t('crossChain.dashboard.description', { count: data.monitoredSymbols.length })}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="mr-1 h-4 w-4" />
                {t('crossChain.controls.refresh')}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPI Summary */}
        <div className="grid grid-cols-4 gap-3">
          {/* Alerts */}
          <div className="bg-muted/30 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs">{t('crossChain.dashboard.activeAlerts')}</p>
              <AlertTriangle className={cn(
                'h-4 w-4',
                data.activeAlerts > 0 ? 'text-yellow-500' : 'text-muted-foreground'
              )} />
            </div>
            <p className={cn(
              'mt-1 font-mono text-2xl font-bold',
              data.activeAlerts > 0 ? 'text-yellow-600' : 'text-emerald-600'
            )}>
              {data.activeAlerts}
            </p>
          </div>

          {/* Opportunities */}
          <div className="bg-muted/30 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs">{t('crossChain.dashboard.opportunities')}</p>
              <Activity className="h-4 w-4 text-blue-500" />
            </div>
            <p className="mt-1 font-mono text-2xl font-bold">
              {data.opportunities.total}
            </p>
            {data.opportunities.actionable > 0 && (
              <p className="text-xs text-emerald-600">
                {data.opportunities.actionable} {t('crossChain.dashboard.actionable')}
              </p>
            )}
          </div>

          {/* Profit */}
          <div className="bg-muted/30 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs">{t('crossChain.dashboard.avgProfit')}</p>
              <span className="text-lg">📈</span>
            </div>
            <p className={cn(
              'mt-1 font-mono text-2xl font-bold',
              data.opportunities.avgProfitPercent > 0 ? 'text-emerald-600' : 'text-muted-foreground'
            )}>
              {data.opportunities.avgProfitPercent > 0 ? '+' : ''}
              {data.opportunities.avgProfitPercent.toFixed(2)}%
            </p>
          </div>

          {/* Health */}
          <div className="bg-muted/30 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs">{t('crossChain.dashboard.chainHealth')}</p>
              <Server className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-1 flex items-center gap-2">
              <p className="font-mono text-2xl font-bold">
                {healthyChains}/{totalChains}
              </p>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  healthPercent === 100 ? 'bg-emerald-500/20 text-emerald-600' :
                  healthPercent >= 50 ? 'bg-yellow-500/20 text-yellow-600' :
                  'bg-red-500/20 text-red-600'
                )}
              >
                {healthPercent === 100 ? 'Perfect' : 
                 healthPercent >= 50 ? 'Good' : 'Poor'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Health Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('crossChain.dashboard.overallHealth')}</span>
            <span>{healthPercent.toFixed(0)}%</span>
          </div>
          <Progress value={healthPercent} className="h-2" />
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle className="h-3 w-3" />
              {healthyChains} {t('crossChain.status.healthy')}
            </span>
            <span className="flex items-center gap-1 text-yellow-600">
              <AlertTriangle className="h-3 w-3" />
              {degradedChains} {t('crossChain.status.degraded')}
            </span>
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="h-3 w-3" />
              {offlineChains} {t('crossChain.status.offline')}
            </span>
          </div>
        </div>

        {/* Chain Health Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data.chainHealth.map((chain) => {
            const config = statusConfig[chain.status] ?? defaultStatusConfig;
            const StatusIcon = config.icon;

            return (
              <div
                key={chain.chain}
                className={cn(
                  'rounded-lg border p-3',
                  config.bg,
                  config.border
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn('font-medium capitalize', config.color)}>
                    {chain.chain}
                  </span>
                  <StatusIcon className={cn('h-4 w-4', config.color)} />
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {chain.staleMinutes !== undefined
                    ? formatStaleness(chain.staleMinutes)
                    : t('crossChain.dashboard.unknown')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Price Comparison Summary */}
        {data.priceComparisons.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('crossChain.dashboard.priceStatus')}</p>
            <div className="flex flex-wrap gap-2">
              {data.priceComparisons.map((comparison) => (
                <div
                  key={comparison.symbol}
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-3 py-1 text-sm',
                    comparison.status === 'critical'
                      ? 'bg-red-500/10 border-red-500/30 text-red-600'
                      : comparison.status === 'warning'
                      ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                  )}
                >
                  <span className="font-medium">{comparison.symbol}</span>
                  <span className="text-xs text-muted-foreground">
                    ±{comparison.priceRangePercent.toFixed(2)}%
                  </span>
                  {comparison.chainsCount < 2 && (
                    <Badge variant="outline" className="text-xs">
                      Low Data
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Wifi className="h-3 w-3" />
            <span>{t('crossChain.dashboard.lastSync')}</span>
          </div>
          <span>{new Date(data.lastUpdated).toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
});
