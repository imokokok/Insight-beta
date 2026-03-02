'use client';

import { useState, useCallback, useMemo } from 'react';

import { ChevronRight, Clock, Activity, Network, Shield, TrendingUp } from 'lucide-react';

import { Badge } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn, formatTime } from '@/shared/utils';

import { getSeverityConfig } from '../constants';

import type { UnifiedAlert, AlertSource } from '../hooks/useAlerts';
import type { AlertTriangle } from 'lucide-react';

const sourceConfig: Record<AlertSource, { icon: typeof AlertTriangle; label: string }> = {
  price_anomaly: { icon: TrendingUp, label: 'Price Anomaly' },
  cross_chain: { icon: Network, label: 'Cross-Chain' },
  security: { icon: Shield, label: 'Security' },
};

interface MobileAlertCardProps {
  alert: UnifiedAlert;
  onClick?: () => void;
  isSelected?: boolean;
  showCheckbox?: boolean;
  isChecked?: boolean;
  onCheckChange?: (checked: boolean) => void;
}

export function MobileAlertCard({
  alert,
  onClick,
  isSelected,
  showCheckbox = false,
  isChecked = false,
  onCheckChange,
}: MobileAlertCardProps) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);

  const config = getSeverityConfig(alert.severity);
  const source = sourceConfig[alert.source] || sourceConfig.price_anomaly;

  const deviationDisplay = useMemo(() => {
    if (alert.deviation !== undefined) {
      return `${(alert.deviation * 100).toFixed(2)}%`;
    }
    return null;
  }, [alert.deviation]);

  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  }, []);

  const handleCardClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const statusConfig = useMemo(() => {
    switch (alert.status) {
      case 'active':
        return { label: t('alerts.statusActive'), className: 'bg-red-500' };
      case 'resolved':
        return { label: t('alerts.statusResolved'), className: 'bg-green-500' };
      case 'investigating':
        return { label: t('alerts.statusInvestigating'), className: 'bg-blue-500' };
      default:
        return { label: alert.status, className: 'bg-gray-500' };
    }
  }, [alert.status, t]);

  return (
    <div
      className={cn(
        'rounded-lg border bg-card transition-all duration-200',
        'hover:border-border hover:shadow-sm',
        isSelected && 'border-primary/30 shadow-md',
        isChecked && 'border-primary/20 bg-primary/5',
        isExpanded ? 'border-primary/30 shadow-md' : 'border-border/50',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between p-3',
          onClick && 'cursor-pointer active:bg-muted/50',
        )}
        onClick={handleCardClick}
      >
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          {showCheckbox && (
            <div onClick={handleCheckboxClick} className="pt-0.5">
              <Checkbox checked={isChecked} onCheckedChange={onCheckChange} />
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn(config.bgColor, 'text-xs')}>{alert.severity}</Badge>
              <Badge variant="outline" className="text-xs">
                {source.label}
              </Badge>
              <Badge className={cn(statusConfig.className, 'text-xs')}>{statusConfig.label}</Badge>
            </div>

            <h4 className="line-clamp-2 text-sm font-semibold leading-tight">{alert.title}</h4>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatTime(alert.timestamp)}</span>
              </div>
              {alert.symbol && (
                <div className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  <span>{alert.symbol}</span>
                </div>
              )}
              {deviationDisplay && (
                <span className={cn('font-mono font-medium', config.color)}>
                  {deviationDisplay}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleToggleExpand}
          className={cn(
            'ml-2 flex h-8 w-8 items-center justify-center rounded-full',
            'text-muted-foreground hover:bg-muted hover:text-foreground',
            'shrink-0 transition-all duration-200',
          )}
          aria-label={isExpanded ? '收起详情' : '查看详情'}
        >
          <ChevronRight
            className={cn('h-5 w-5 transition-transform duration-300', isExpanded && 'rotate-90')}
          />
        </button>
      </div>

      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="border-t border-border/30 bg-muted/20 px-3 py-3">
          <div className="space-y-3">
            {alert.description && (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">{t('alerts.description')}</p>
                <p className="line-clamp-3 text-sm">{alert.description}</p>
              </div>
            )}

            {alert.chainA && alert.chainB && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t('alerts.chains')}</span>
                <span className="text-sm font-medium">
                  {alert.chainA} → {alert.chainB}
                </span>
              </div>
            )}

            {alert.protocol && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t('alerts.protocol')}</span>
                <span className="text-sm font-medium">{alert.protocol}</span>
              </div>
            )}

            {alert.priceA !== undefined && alert.priceB !== undefined && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">{t('alerts.prices')}</span>
                <div className="flex items-center justify-between text-sm">
                  <span>{alert.chainA}:</span>
                  <span className="font-mono">${alert.priceA.toFixed(4)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>{alert.chainB}:</span>
                  <span className="font-mono">${alert.priceB.toFixed(4)}</span>
                </div>
                {alert.avgPrice !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span>{t('alerts.avgPrice')}:</span>
                    <span className="font-mono">${alert.avgPrice.toFixed(4)}</span>
                  </div>
                )}
              </div>
            )}

            {alert.outlierProtocols && alert.outlierProtocols.length > 0 && (
              <div>
                <p className="mb-2 text-xs text-muted-foreground">{t('alerts.outlierProtocols')}</p>
                <div className="flex flex-wrap gap-1">
                  {alert.outlierProtocols.map((p) => (
                    <Badge key={p} variant="secondary" className="text-xs">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {alert.reason && (
              <div className="rounded-md bg-muted p-2">
                <p className="text-xs text-muted-foreground">{t('alerts.reason')}</p>
                <p className="mt-1 line-clamp-2 text-sm">{alert.reason}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
