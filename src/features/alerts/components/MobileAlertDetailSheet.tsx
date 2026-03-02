'use client';

import { useCallback, useEffect, useRef } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Activity } from 'lucide-react';

import { Badge } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn, formatTime } from '@/shared/utils';

import { AlertActionButtons } from './AlertActionButtons';
import { getSeverityConfig } from '../constants';

import type { AlertAction } from '../hooks/useAlertActions';
import type { UnifiedAlert, AlertSource } from '../hooks/useAlerts';
import type { PanInfo } from 'framer-motion';

const sourceConfig: Record<AlertSource, { label: string }> = {
  price_anomaly: { label: 'Price Anomaly' },
  cross_chain: { label: 'Cross-Chain' },
  security: { label: 'Security' },
};

interface MobileAlertDetailSheetProps {
  alert: UnifiedAlert | null;
  isOpen: boolean;
  onClose: () => void;
  onAlertUpdate?: (action: AlertAction, updatedAlert: UnifiedAlert) => void;
}

export function MobileAlertDetailSheet({
  alert,
  isOpen,
  onClose,
  onAlertUpdate,
}: MobileAlertDetailSheetProps) {
  const { t } = useI18n();
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.y > 100 || info.velocity.y > 500) {
        onClose();
      }
    },
    [onClose],
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  if (!alert) return null;

  const config = getSeverityConfig(alert.severity);
  const source = sourceConfig[alert.source] || sourceConfig.price_anomaly;

  const statusConfig = (() => {
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
  })();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/50"
          onClick={handleBackdropClick}
        >
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl bg-background shadow-xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/30 bg-background px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-1 w-8 rounded-full bg-muted-foreground/30" />
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 pb-20">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {source.label}
                  </Badge>
                  <Badge className={cn(config.bgColor, 'text-xs')}>{alert.severity}</Badge>
                  <Badge className={cn(statusConfig.className, 'text-xs')}>
                    {statusConfig.label}
                  </Badge>
                </div>

                <h3 className="text-lg font-semibold leading-tight">{alert.title}</h3>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('alerts.time')}</span>
                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatTime(alert.timestamp)}
                    </div>
                  </div>

                  {alert.symbol && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('alerts.symbol')}</span>
                      <div className="flex items-center gap-1.5 font-medium">
                        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                        {alert.symbol}
                      </div>
                    </div>
                  )}

                  {alert.deviation !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('alerts.deviation')}</span>
                      <span className={cn('font-mono font-medium', config.color)}>
                        {(alert.deviation * 100).toFixed(4)}%
                      </span>
                    </div>
                  )}

                  {alert.chainA && alert.chainB && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('alerts.chains')}</span>
                      <span className="font-medium">
                        {alert.chainA} → {alert.chainB}
                      </span>
                    </div>
                  )}

                  {alert.protocol && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('alerts.protocol')}</span>
                      <span className="font-medium">{alert.protocol}</span>
                    </div>
                  )}

                  {alert.priceA !== undefined && alert.priceB !== undefined && (
                    <div className="space-y-1.5">
                      <span className="text-muted-foreground">{t('alerts.prices')}</span>
                      <div className="space-y-1 rounded-lg bg-muted/50 p-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{alert.chainA}:</span>
                          <span className="font-mono">${alert.priceA.toFixed(4)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>{alert.chainB}:</span>
                          <span className="font-mono">${alert.priceB.toFixed(4)}</span>
                        </div>
                        {alert.avgPrice !== undefined && (
                          <div className="mt-1 flex items-center justify-between border-t border-border/30 pt-1 text-sm">
                            <span>{t('alerts.avgPrice')}:</span>
                            <span className="font-mono">${alert.avgPrice.toFixed(4)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {alert.description && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="mb-1 text-xs text-muted-foreground">{t('alerts.description')}</p>
                    <p className="text-sm leading-relaxed">{alert.description}</p>
                  </div>
                )}

                {alert.reason && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="mb-1 text-xs text-muted-foreground">{t('alerts.reason')}</p>
                    <p className="text-sm leading-relaxed">{alert.reason}</p>
                  </div>
                )}

                {alert.outlierProtocols && alert.outlierProtocols.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">
                      {t('alerts.outlierProtocols')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {alert.outlierProtocols.map((p) => (
                        <Badge key={p} variant="secondary" className="text-xs">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <AlertActionButtons alert={alert} onActionComplete={onAlertUpdate} />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
