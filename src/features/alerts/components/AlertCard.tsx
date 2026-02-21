'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';

import { AlertTriangle, Network, Shield, Activity, Clock, TrendingUp } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useI18n } from '@/i18n';
import { cn, formatTime } from '@/shared/utils';

import { AlertActionButtons } from './AlertActionButtons';
import { getSeverityConfig } from '../constants';

import type { UnifiedAlert, AlertSource } from '../hooks/useAlerts';

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
        <div className="flex-1">
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
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="mx-auto h-8 w-8 opacity-50" />
            <p className="mt-2">{t('alerts.selectAlert')}</p>
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

        <h3 className="text-lg font-semibold">{currentAlert.title}</h3>

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
            <Badge
              className={
                currentAlert.status === 'active'
                  ? 'bg-red-500'
                  : currentAlert.status === 'resolved'
                    ? 'bg-green-500'
                    : 'bg-blue-500'
              }
            >
              {currentAlert.status}
            </Badge>
          </div>
        </div>

        {currentAlert.description && (
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">{t('alerts.description')}</p>
            <p className="mt-1 text-sm">{currentAlert.description}</p>
          </div>
        )}

        {currentAlert.reason && (
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">{t('alerts.reason')}</p>
            <p className="mt-1 text-sm">{currentAlert.reason}</p>
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
