'use client';

import { useState, useEffect, useCallback } from 'react';

import { Network, Shield, Activity, Clock, TrendingUp, Inbox } from 'lucide-react';

import { Checkbox } from '@/components/ui';
import { Badge } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn, formatTime } from '@/shared/utils';

import { AlertActionButtons } from './AlertActionButtons';
import { getSeverityConfig } from '../constants';

import type { UnifiedAlert, AlertSource } from '../hooks/useAlerts';
import type { AlertTriangle } from 'lucide-react';

const sourceConfig: Record<AlertSource, { icon: typeof AlertTriangle; label: string }> = {
  price_anomaly: { icon: TrendingUp, label: 'Price Anomaly' },
  cross_chain: { icon: Network, label: 'Cross-Chain' },
  security: { icon: Shield, label: 'Security' },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  active: { color: 'bg-red-500', label: 'alerts.statusActive' },
  resolved: { color: 'bg-green-500', label: 'alerts.statusResolved' },
  investigating: { color: 'bg-blue-500', label: 'alerts.statusInvestigating' },
};

interface AlertCardProps {
  alert: UnifiedAlert;
  onClick?: () => void;
  isSelected?: boolean;
  compact?: boolean;
  showCheckbox?: boolean;
  isChecked?: boolean;
  onCheckChange?: (checked: boolean) => void;
}

export function AlertCard({
  alert,
  onClick,
  isSelected,
  compact = false,
  showCheckbox = false,
  isChecked = false,
  onCheckChange,
}: AlertCardProps) {
  const { t } = useI18n();

  const config = getSeverityConfig(alert.severity);
  const source = sourceConfig[alert.source] || sourceConfig.price_anomaly;
  const SourceIcon = source.icon;

  const deviationDisplay =
    alert.deviation !== undefined ? `${(alert.deviation * 100).toFixed(2)}%` : null;

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
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Badge className={config.bgColor}>{alert.severity}</Badge>
            <span className="truncate font-medium">{alert.title}</span>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatTime(alert.timestamp)}
          </span>
        </div>
      </button>
    );
  }

  return (
    <div
      className={cn(
        'cursor-pointer rounded-xl p-4 transition-all duration-200 hover:bg-card/50',
        isSelected && 'bg-primary/5 ring-2 ring-primary',
        isChecked && 'bg-primary/5 ring-2 ring-primary/50',
        'border-b border-border/30 last:border-b-0',
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {showCheckbox && (
          <div
            className="pt-1"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Checkbox checked={isChecked} onCheckedChange={onCheckChange} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <SourceIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Badge variant="outline" className="text-xs">
                  {source.label}
                </Badge>
                <Badge className={config.bgColor}>{alert.severity}</Badge>
              </div>
              <h4 className="truncate font-semibold">{alert.title}</h4>
              <p className="line-clamp-2 text-sm text-muted-foreground">{alert.description}</p>

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

            <div className="shrink-0 text-right">
              {(() => {
                const status = statusConfig[alert.status];
                return status ? <Badge className={status.color}>{t(status.label)}</Badge> : null;
              })()}
            </div>
          </div>

          {alert.reason && (
            <div className="mt-3 rounded-lg bg-muted p-2">
              <p className="text-xs text-muted-foreground">{alert.reason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface AlertDetailPanelProps {
  alert: UnifiedAlert | null;
  onAlertUpdate?: (alert: UnifiedAlert) => void;
}

export function AlertDetailPanel({ alert, onAlertUpdate }: AlertDetailPanelProps) {
  const { t } = useI18n();
  const [currentAlert, setCurrentAlert] = useState<UnifiedAlert | null>(alert);

  useEffect(() => {
    setCurrentAlert(alert);
  }, [alert]);

  const handleActionComplete = useCallback(
    (_action: string, updatedAlert: UnifiedAlert) => {
      setCurrentAlert(updatedAlert);
      onAlertUpdate?.(updatedAlert);
    },
    [onAlertUpdate],
  );

  if (!currentAlert) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/30 p-4">
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <Inbox className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="mb-1 text-sm font-medium text-foreground">{t('alerts.selectAlert')}</p>
            <p className="mb-4 text-xs text-muted-foreground">{t('alerts.selectAlertDesc')}</p>
          </div>
        </div>
      </div>
    );
  }

  const config = getSeverityConfig(currentAlert.severity);
  const source = sourceConfig[currentAlert.source] || sourceConfig.price_anomaly;
  const SourceIcon = source.icon;

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-xl border border-border/50 bg-card/30 p-4">
        <div className="flex items-center gap-2">
          <SourceIcon className="h-5 w-5 text-muted-foreground" />
          <Badge variant="outline">{source.label}</Badge>
          <Badge className={config.bgColor}>{currentAlert.severity}</Badge>
        </div>

        <h3 className="line-clamp-2 text-lg font-semibold">{currentAlert.title}</h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('alerts.time')}</span>
            <span className="font-medium">{formatTime(currentAlert.timestamp)}</span>
          </div>

          {currentAlert.symbol && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('alerts.symbol')}</span>
              <span className="font-medium">{currentAlert.symbol}</span>
            </div>
          )}

          {currentAlert.deviation !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('alerts.deviation')}</span>
              <span className={cn('font-mono font-medium', config.color)}>
                {(currentAlert.deviation * 100).toFixed(4)}%
              </span>
            </div>
          )}

          {currentAlert.chainA && currentAlert.chainB && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('alerts.chains')}</span>
              <span className="font-medium">
                {currentAlert.chainA} → {currentAlert.chainB}
              </span>
            </div>
          )}

          {currentAlert.priceA !== undefined && currentAlert.priceB !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('alerts.prices')}</span>
              <span className="font-medium">
                ${currentAlert.priceA.toFixed(2)} / ${currentAlert.priceB.toFixed(2)}
              </span>
            </div>
          )}

          {currentAlert.avgPrice !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('alerts.avgPrice')}</span>
              <span className="font-medium">${currentAlert.avgPrice.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('alerts.status')}</span>
            {(() => {
              const status = statusConfig[currentAlert.status];
              return status ? <Badge className={status.color}>{t(status.label)}</Badge> : null;
            })()}
          </div>
        </div>

        {currentAlert.description && (
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">{t('alerts.description')}</p>
            <p className="mt-1 line-clamp-3 break-words text-sm">{currentAlert.description}</p>
          </div>
        )}

        {currentAlert.reason && (
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">{t('alerts.reason')}</p>
            <p className="mt-1 line-clamp-3 break-words text-sm">{currentAlert.reason}</p>
          </div>
        )}

        {currentAlert.outlierProtocols && currentAlert.outlierProtocols.length > 0 && (
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">{t('alerts.outlierProtocols')}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {currentAlert.outlierProtocols.map((p) => (
                <Badge key={p} variant="secondary">
                  {p}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <AlertActionButtons alert={currentAlert} onActionComplete={handleActionComplete} />
    </div>
  );
}
