'use client';

import { useCallback, useState } from 'react';

import type { AlertStatus, UnifiedAlert } from '../types';

export type AlertAction = 'acknowledge' | 'resolve' | 'silence';

export interface AlertActionRequest {
  action: AlertAction;
  note?: string;
  duration?: number;
}

export interface AlertActionResponse {
  success: boolean;
  data?: {
    alert: UnifiedAlert;
    message: string;
  };
  error?: string;
}

export interface UseAlertActionsOptions {
  onSuccess?: (action: AlertAction, alert: UnifiedAlert) => void;
  onError?: (action: AlertAction, error: string) => void;
}

export interface UseAlertActionsReturn {
  executeAction: (alertId: string, request: AlertActionRequest) => Promise<AlertActionResponse>;
  isLoading: boolean;
  error: string | null;
  lastAction: AlertAction | null;
}

export function useAlertActions(options: UseAlertActionsOptions = {}): UseAlertActionsReturn {
  const { onSuccess, onError } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<AlertAction | null>(null);

  const executeAction = useCallback(
    async (alertId: string, request: AlertActionRequest): Promise<AlertActionResponse> => {
      setIsLoading(true);
      setError(null);
      setLastAction(request.action);

      try {
        const response = await fetch(`/api/alerts/${alertId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        const result: AlertActionResponse = await response.json();

        if (!response.ok || !result.success) {
          const errorMessage = result.error || `Failed to ${request.action} alert`;
          setError(errorMessage);
          onError?.(request.action, errorMessage);
          return result;
        }

        if (result.data?.alert) {
          onSuccess?.(request.action, result.data.alert);
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
        onError?.(request.action, errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess, onError],
  );

  return {
    executeAction,
    isLoading,
    error,
    lastAction,
  };
}

export function getActionStatus(action: AlertAction): AlertStatus {
  switch (action) {
    case 'acknowledge':
      return 'investigating';
    case 'resolve':
      return 'resolved';
    case 'silence':
      return 'active';
    default:
      return 'active';
  }
}

export function getActionLabel(action: AlertAction): string {
  switch (action) {
    case 'acknowledge':
      return 'Acknowledge';
    case 'resolve':
      return 'Resolve';
    case 'silence':
      return 'Silence';
    default:
      return action;
  }
}
