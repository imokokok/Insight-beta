'use client';

import { useMemo } from 'react';

import { AlertTriangle, Network, Shield, Activity, Clock, TrendingUp } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/i18n';
import { cn, formatTime } from '@/shared/utils';

import type { UnifiedAlert, AlertSeverity, AlertSource } from '../hooks/useAlerts';

const severityConfig: Record<AlertSeverity, { color: string; bgColor: string; borderColor: string }> = {
  critical: { color: 'text-red-600', bgColor: 'bg-red-500', borderColor: 'border-red-500/30 bg-red-500/10' },
  high: { color: 'text-orange-600', bgColor: 'bg-orange-500', borderColor: 'border-orange-500/30 bg-orange-500/10' },
  medium: { color: 'text-yellow-600', bgColor: 'bg-yellow-500', borderColor: 'border-yellow-500/30 bg-yellow-500/10' },
  low: { color: 'text-green-600', bgColor: 'bg-green-500', borderColor: 'border-green-500/30 bg-green-500/10' },
  warning: { color: 'text-yellow-600', bgColor: 'bg-yellow-500', borderColor: 'border-yellow-500/30 bg-yellow-500/10' },
  info: { color: 'text-blue-600', bgColor: 'bg-blue-500', borderColor: 'border-blue-500/30 bg-blue-500/10' },
};

const sourceConfig: Record<AlertSource, { icon: typeof AlertTriangle; label: string }> = {
  price_anomaly: { icon: TrendingUp, label: 'Price Anomaly' },
  cross_chain: { icon: Network, label: 'Cross-Chain' },
  security: { icon: Shield, label: 'Security' },
};

interface AlertCardProps {
  alert: UnifiedAlert;
  onClick?: () => void;
  isSelected?: boolean;
  compact?: boolean;
}

export function AlertCard({ alert, onClick, isSelected, compact = false }: AlertCardProps) {
  const { t } = useI18n();

  const config = severityConfig[alert.severity] || severityConfig.medium;
  const source = sourceConfig[alert.source] || sourceConfig.price_anomaly;
  const SourceIcon = source.icon;

  const deviationDisplay = useMemo(() => {
    if (alert.deviation !== undefined) {
      return `${(alert.deviation * 100).toFixed(2)}%`;
    }
    return null;
  }, [alert.deviation]);

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full cursor-pointer rounded-lg border p-3 text-left transition-all hover:shadow-md',
          config.borderColor,
          isSelected && 'ring-2 ring-primary',
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={config.bgColor}>{alert.severity}</Badge>
            <span className="font-medium">{alert.title}</span>
          </div>
          <span className="text-xs text-muted-foreground">{formatTime(alert.timestamp)}</span>
        </div>
      </button>
    );
  }

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary',
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <SourceIcon className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="text-xs">
                {source.label}
              </Badge>
              <Badge className={config.bgColor}>{alert.severity}</Badge>
            </div>
            <h4 className="font-semibold">{alert.title}</h4>
            <p className="text-sm text-muted-foreground">{alert.description}</p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(alert.timestamp)}
              </div>
              {alert.symbol && (
                <div className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {alert.symbol}
                </div>
              )}
              {deviationDisplay && (
                <span className={cn('font-mono font-medium', config.color)}>
                  {deviationDisplay}
                </span>
              )}
            </div>

            {alert.chainA && alert.chainB && (
              <div className="text-xs">
                <span className="font-medium">{alert.chainA}</span>
                <span className="mx-1">→</span>
                <span className="font-medium">{alert.chainB}</span>
              </div>
            )}

            {alert.outlierProtocols && alert.outlierProtocols.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {alert.outlierProtocols.map((p) => (
                  <Badge key={p} variant="secondary" className="text-xs">
                    {p}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="text-right">
            {alert.status === 'active' && (
              <Badge className="bg-red-500">{t('alerts.statusActive')}</Badge>
            )}
            {alert.status === 'resolved' && (
              <Badge className="bg-green-500">{t('alerts.statusResolved')}</Badge>
            )}
            {alert.status === 'investigating' && (
              <Badge className="bg-blue-500">{t('alerts.statusInvestigating')}</Badge>
            )}
          </div>
        </div>

        {alert.reason && (
          <div className="mt-3 rounded-lg bg-muted p-2">
            <p className="text-xs text-muted-foreground">{alert.reason}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AlertDetailPanelProps {
  alert: UnifiedAlert | null;
}

export function AlertDetailPanel({ alert }: AlertDetailPanelProps) {
  const { t } = useI18n();

  if (!alert) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="mx-auto h-8 w-8 opacity-50" />
            <p className="mt-2">{t('alerts.selectAlert')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const config = severityConfig[alert.severity] || severityConfig.medium;
  const source = sourceConfig[alert.source] || sourceConfig.price_anomaly;
  const SourceIcon = source.icon;

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <SourceIcon className="h-5 w-5 text-muted-foreground" />
          <Badge variant="outline">{source.label}</Badge>
          <Badge className={config.bgColor}>{alert.severity}</Badge>
        </div>

        <h3 className="text-lg font-semibold">{alert.title}</h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('alerts.time')}</span>
            <span className="font-medium">{formatTime(alert.timestamp)}</span>
          </div>

          {alert.symbol && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('alerts.symbol')}</span>
              <span className="font-medium">{alert.symbol}</span>
            </div>
          )}

          {alert.deviation !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('alerts.deviation')}</span>
              <span className={cn('font-mono font-medium', config.color)}>
                {(alert.deviation * 100).toFixed(4)}%
              </span>
            </div>
          )}

          {alert.chainA && alert.chainB && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('alerts.chains')}</span>
              <span className="font-medium">
                {alert.chainA} → {alert.chainB}
              </span>
            </div>
          )}

          {alert.priceA !== undefined && alert.priceB !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('alerts.prices')}</span>
              <span className="font-medium">
                ${alert.priceA.toFixed(2)} / ${alert.priceB.toFixed(2)}
              </span>
            </div>
          )}

          {alert.avgPrice !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('alerts.avgPrice')}</span>
              <span className="font-medium">${alert.avgPrice.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('alerts.status')}</span>
            <Badge
              className={
                alert.status === 'active'
                  ? 'bg-red-500'
                  : alert.status === 'resolved'
                    ? 'bg-green-500'
                    : 'bg-blue-500'
              }
            >
              {alert.status}
            </Badge>
          </div>
        </div>

        {alert.description && (
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">{t('alerts.description')}</p>
            <p className="mt-1 text-sm">{alert.description}</p>
          </div>
        )}

        {alert.reason && (
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">{t('alerts.reason')}</p>
            <p className="mt-1 text-sm">{alert.reason}</p>
          </div>
        )}

        {alert.outlierProtocols && alert.outlierProtocols.length > 0 && (
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">{t('alerts.outlierProtocols')}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {alert.outlierProtocols.map((p) => (
                <Badge key={p} variant="secondary">
                  {p}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
