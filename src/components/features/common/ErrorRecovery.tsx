'use client';

import { useState, useCallback } from 'react';
import { AlertCircle, RefreshCw, Settings, MessageCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OracleError, type ErrorRecoveryAction } from '@/lib/errors';
import { useI18n } from '@/i18n/LanguageProvider';

interface ErrorRecoveryProps {
  error: OracleError | Error;
  onRetry?: () => void;
  onReset?: () => void;
}

const actionIcons: Record<string, React.ReactNode> = {
  retry: <RefreshCw className="mr-2 h-4 w-4" />,
  refresh: <RefreshCw className="mr-2 h-4 w-4" />,
  contact_support: <MessageCircle className="mr-2 h-4 w-4" />,
  check_config: <Settings className="mr-2 h-4 w-4" />,
  wait: <Clock className="mr-2 h-4 w-4" />,
};

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'high':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'medium':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'low':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function ErrorRecovery({ error, onRetry, onReset }: ErrorRecoveryProps) {
  const { t } = useI18n();
  const [isRetrying, setIsRetrying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const oracleError = error instanceof OracleError ? error : OracleError.fromError(error);
  const recoveryActions = oracleError.getRecoveryActions();

  const handleAction = useCallback(async (action: ErrorRecoveryAction) => {
    if (action.delay && action.delay > 0) {
      setCountdown(action.delay);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setTimeout(() => {
        executeAction(action.action);
      }, action.delay * 1000);
    } else {
      executeAction(action.action);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const executeAction = useCallback(
    (actionType: string) => {
      switch (actionType) {
        case 'retry':
          setIsRetrying(true);
          onRetry?.();
          setTimeout(() => setIsRetrying(false), 1000);
          break;
        case 'refresh':
          window.location.reload();
          break;
        case 'contact_support':
          window.open('https://support.example.com', '_blank');
          break;
        case 'check_config':
          onReset?.();
          break;
        case 'wait':
          // Just wait, no action needed
          break;
      }
    },
    [onRetry, onReset],
  );

  const severityClass = getSeverityColor(oracleError.severity);

  return (
    <div className={`rounded-lg border p-6 ${severityClass}`}>
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-white/50 p-2">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{oracleError.message}</h3>
          <p className="mt-1 text-sm opacity-80">
            {t('errors.errorCode')}: {oracleError.code} | {t('errors.severity')}:{' '}
            {oracleError.severity}
          </p>

          {oracleError.context && (
            <div className="mt-3 rounded bg-white/30 p-3 text-xs">
              <details>
                <summary className="cursor-pointer font-medium">{t('errors.errorDetails')}</summary>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(oracleError.context, null, 2)}
                </pre>
              </details>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {recoveryActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleAction(action)}
                disabled={isRetrying || countdown > 0}
                className="bg-white/50 hover:bg-white/80"
              >
                {actionIcons[action.action]}
                {countdown > 0 && action.delay ? `${action.label} (${countdown}s)` : action.label}
              </Button>
            ))}
          </div>

          {oracleError.retryable && (
            <p className="mt-3 text-xs opacity-70">{t('errors.retryable')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
