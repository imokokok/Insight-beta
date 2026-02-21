'use client';

import { useState, useCallback } from 'react';

import { CheckCircle, XCircle, BellOff, Loader2, X, AlertTriangle } from 'lucide-react';

import { useToast } from '@/components/common/DashboardToast';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Input } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

import type { AlertAction } from '../hooks/useAlertActions';
import type { UnifiedAlert } from '../types';

export interface BatchActionRequest {
  action: AlertAction;
  alertIds: string[];
  note?: string;
  duration?: number;
}

export interface BatchActionResponse {
  success: boolean;
  data?: {
    processed: number;
    failed: number;
    results: Array<{
      alertId: string;
      success: boolean;
      error?: string;
    }>;
  };
  error?: string;
}

interface ActionDialogProps {
  isOpen: boolean;
  action: AlertAction;
  selectedCount: number;
  onConfirm: (request: Omit<BatchActionRequest, 'alertIds'>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function ActionDialog({
  isOpen,
  action,
  selectedCount,
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
      title: t('alerts.batchActions.acknowledge'),
      description: t('alerts.batchActions.acknowledgeDesc'),
      icon: CheckCircle,
      color: 'text-blue-500',
    },
    resolve: {
      title: t('alerts.batchActions.resolve'),
      description: t('alerts.batchActions.resolveDesc'),
      icon: XCircle,
      color: 'text-green-500',
    },
    silence: {
      title: t('alerts.batchActions.silence'),
      description: t('alerts.batchActions.silenceDesc'),
      icon: BellOff,
      color: 'text-yellow-500',
    },
  };

  const config = actionConfig[action];
  const Icon = config.icon;

  const handleConfirm = () => {
    onConfirm({
      action,
      note: note.trim() || undefined,
      duration: action === 'silence' ? duration : undefined,
    });
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
              <span className="text-sm font-medium">{t('alerts.batchActions.selectedAlerts')}</span>
              <Badge variant="secondary">{selectedCount}</Badge>
            </div>
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

interface AlertBatchActionsProps {
  selectedAlerts: UnifiedAlert[];
  onClearSelection: () => void;
  onBatchActionComplete?: (processed: number, failed: number) => void;
}

export function AlertBatchActions({
  selectedAlerts,
  onClearSelection,
  onBatchActionComplete,
}: AlertBatchActionsProps) {
  const { t } = useI18n();
  const { success, error: showError } = useToast();
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    action: AlertAction | null;
  }>({ isOpen: false, action: null });
  const [isLoading, setIsLoading] = useState(false);

  const selectedCount = selectedAlerts.length;

  const executeBatchAction = useCallback(
    async (request: Omit<BatchActionRequest, 'alertIds'>) => {
      if (selectedAlerts.length === 0) return;

      setIsLoading(true);
      try {
        const response = await fetch('/api/alerts/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...request,
            alertIds: selectedAlerts.map((a) => a.id),
          }),
        });

        const result: BatchActionResponse = await response.json();

        if (!response.ok || !result.success) {
          const errorMessage = result.error || `Failed to ${request.action} alerts`;
          showError(t('alerts.batchActions.failed'), errorMessage);
          return;
        }

        if (result.data) {
          const { processed, failed } = result.data;

          if (failed === 0) {
            success(
              t('alerts.batchActions.success'),
              t('alerts.batchActions.successDesc', { count: processed }),
            );
          } else {
            success(
              t('alerts.batchActions.partialSuccess'),
              t('alerts.batchActions.partialSuccessDesc', {
                processed,
                failed,
              }),
            );
          }

          onBatchActionComplete?.(processed, failed);
          onClearSelection();
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        showError(t('alerts.batchActions.failed'), errorMessage);
      } finally {
        setIsLoading(false);
        setDialogState({ isOpen: false, action: null });
      }
    },
    [selectedAlerts, success, showError, t, onBatchActionComplete, onClearSelection],
  );

  const handleActionClick = useCallback((action: AlertAction) => {
    setDialogState({ isOpen: true, action });
  }, []);

  const handleConfirm = useCallback(
    (request: Omit<BatchActionRequest, 'alertIds'>) => {
      executeBatchAction(request);
    },
    [executeBatchAction],
  );

  const handleCancel = useCallback(() => {
    setDialogState({ isOpen: false, action: null });
  }, []);

  if (selectedCount === 0) {
    return null;
  }

  const activeCount = selectedAlerts.filter((a) => a.status === 'active').length;
  const unresolvedCount = selectedAlerts.filter((a) => a.status !== 'resolved').length;

  const actions: {
    action: AlertAction;
    icon: typeof CheckCircle;
    label: string;
    disabled: boolean;
  }[] = [
    {
      action: 'acknowledge',
      icon: CheckCircle,
      label: t('alerts.actions.acknowledge'),
      disabled: activeCount === 0,
    },
    {
      action: 'resolve',
      icon: XCircle,
      label: t('alerts.actions.resolve'),
      disabled: unresolvedCount === 0,
    },
    {
      action: 'silence',
      icon: BellOff,
      label: t('alerts.actions.silence'),
      disabled: unresolvedCount === 0,
    },
  ];

  return (
    <>
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <AlertTriangle className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {t('alerts.batchActions.selected', { count: selectedCount })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activeCount} {t('alerts.batchActions.active')} · {unresolvedCount}{' '}
                  {t('alerts.batchActions.unresolved')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex flex-wrap gap-2">
                {actions.map(({ action, icon: Icon, label, disabled }) => (
                  <Button
                    key={action}
                    variant="outline"
                    size="sm"
                    onClick={() => handleActionClick(action)}
                    disabled={disabled || isLoading}
                    className="flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Button>
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                disabled={isLoading}
                className="ml-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {dialogState.action && (
        <ActionDialog
          isOpen={dialogState.isOpen}
          action={dialogState.action}
          selectedCount={selectedCount}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      )}
    </>
  );
}
