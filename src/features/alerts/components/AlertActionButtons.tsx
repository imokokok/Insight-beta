'use client';

import { useState, useCallback } from 'react';

import { CheckCircle, XCircle, BellOff, Loader2, AlertTriangle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/i18n';
import { logger } from '@/shared/logger';
import { cn } from '@/shared/utils';

import { useAlertActions } from '../hooks/useAlertActions';

import type { AlertAction, AlertActionRequest } from '../hooks/useAlertActions';
import type { UnifiedAlert } from '../types';

interface ActionDialogProps {
  isOpen: boolean;
  action: AlertAction;
  alert: UnifiedAlert;
  onConfirm: (request: AlertActionRequest) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function ActionDialog({
  isOpen,
  action,
  alert,
  onConfirm,
  onCancel,
  isLoading,
}: ActionDialogProps) {
  const { t } = useI18n();
  const [note, setNote] = useState('');
  const [duration, setDuration] = useState(60);

  if (!isOpen) return null;

  const actionConfig: Record<
    AlertAction,
    { title: string; description: string; icon: typeof CheckCircle; color: string }
  > = {
    acknowledge: {
      title: t('alerts.actions.acknowledge'),
      description: t('alerts.actions.acknowledgeDesc'),
      icon: CheckCircle,
      color: 'text-blue-500',
    },
    resolve: {
      title: t('alerts.actions.resolve'),
      description: t('alerts.actions.resolveDesc'),
      icon: XCircle,
      color: 'text-green-500',
    },
    silence: {
      title: t('alerts.actions.silence'),
      description: t('alerts.actions.silenceDesc'),
      icon: BellOff,
      color: 'text-yellow-500',
    },
  };

  const config = actionConfig[action];
  const Icon = config.icon;

  const handleConfirm = () => {
    const request: AlertActionRequest = {
      action,
      note: note.trim() || undefined,
      duration: action === 'silence' ? duration : undefined,
    };
    onConfirm(request);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className={cn('h-5 w-5', config.color)} />
            {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{config.description}</p>

          <div className="rounded-lg bg-muted p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{alert.title}</span>
              <Badge
                className={
                  alert.severity === 'critical'
                    ? 'bg-red-500'
                    : alert.severity === 'high'
                      ? 'bg-orange-500'
                      : alert.severity === 'medium'
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                }
              >
                {alert.severity}
              </Badge>
            </div>
            {alert.symbol && <p className="mt-1 text-xs text-muted-foreground">{alert.symbol}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('alerts.actions.note')}</label>
            <Input
              placeholder={t('alerts.actions.notePlaceholder')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {action === 'silence' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('alerts.actions.duration')}</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={1440}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">{t('alerts.actions.minutes')}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleConfirm} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.confirm')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface AlertActionButtonsProps {
  alert: UnifiedAlert;
  onActionComplete?: (action: AlertAction, updatedAlert: UnifiedAlert) => void;
}

export function AlertActionButtons({ alert, onActionComplete }: AlertActionButtonsProps) {
  const { t } = useI18n();
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    action: AlertAction | null;
  }>({ isOpen: false, action: null });

  const { executeAction, isLoading } = useAlertActions({
    onSuccess: (action, updatedAlert) => {
      setDialogState({ isOpen: false, action: null });
      onActionComplete?.(action, updatedAlert);
    },
    onError: (action, error) => {
      logger.error(`Failed to ${action} alert`, { error, alertId: alert.id });
    },
  });

  const handleActionClick = useCallback((action: AlertAction) => {
    setDialogState({ isOpen: true, action });
  }, []);

  const handleConfirm = useCallback(
    (request: AlertActionRequest) => {
      executeAction(alert.id, request);
    },
    [alert.id, executeAction],
  );

  const handleCancel = useCallback(() => {
    setDialogState({ isOpen: false, action: null });
  }, []);

  const isActionDisabled = (action: AlertAction): boolean => {
    if (isLoading) return true;
    switch (action) {
      case 'acknowledge':
        return alert.status !== 'active';
      case 'resolve':
        return alert.status === 'resolved';
      case 'silence':
        return alert.status === 'resolved';
      default:
        return false;
    }
  };

  const getButtonVariant = (action: AlertAction): 'default' | 'outline' | 'secondary' => {
    switch (action) {
      case 'acknowledge':
        return 'default';
      case 'resolve':
        return 'outline';
      case 'silence':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const actions: { action: AlertAction; icon: typeof CheckCircle; label: string }[] = [
    { action: 'acknowledge', icon: CheckCircle, label: t('alerts.actions.acknowledge') },
    { action: 'resolve', icon: XCircle, label: t('alerts.actions.resolve') },
    { action: 'silence', icon: BellOff, label: t('alerts.actions.silence') },
  ];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            {t('alerts.actions.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {actions.map(({ action, icon: Icon, label }) => (
              <Button
                key={action}
                variant={getButtonVariant(action)}
                size="sm"
                onClick={() => handleActionClick(action)}
                disabled={isActionDisabled(action)}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>

          {alert.status !== 'active' && (
            <p className="mt-3 text-xs text-muted-foreground">
              {t('alerts.actions.currentStatus')}: <Badge className="ml-1">{alert.status}</Badge>
            </p>
          )}
        </CardContent>
      </Card>

      {dialogState.action && (
        <ActionDialog
          isOpen={dialogState.isOpen}
          action={dialogState.action}
          alert={alert}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      )}
    </>
  );
}
