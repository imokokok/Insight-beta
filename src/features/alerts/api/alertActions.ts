import type { AlertStatus, UnifiedAlert } from '@/features/alerts/types';

const alertStore = new Map<
  string,
  { status: AlertStatus; note?: string; silencedUntil?: string }
>();

export interface AlertActionRequest {
  action: 'acknowledge' | 'resolve' | 'silence';
  note?: string;
  duration?: number;
}

export interface AlertActionResult {
  alert: Partial<UnifiedAlert>;
  message: string;
  timestamp: string;
}

function getActionMessage(action: string): string {
  const messages: Record<string, string> = {
    acknowledge: 'Alert has been acknowledged and is now under investigation.',
    resolve: 'Alert has been resolved.',
    silence: 'Alert has been silenced.',
  };
  return messages[action] || 'Alert updated successfully.';
}

export async function updateAlertStatus(
  id: string,
  request: AlertActionRequest,
): Promise<AlertActionResult | null> {
  const { action, note, duration } = request;

  if (!action || !['acknowledge', 'resolve', 'silence'].includes(action)) {
    return null;
  }

  const newStatus: AlertStatus =
    action === 'acknowledge' ? 'investigating' : action === 'resolve' ? 'resolved' : 'active';

  const updateData: { status: AlertStatus; note?: string; silencedUntil?: string } = {
    status: newStatus,
    note,
  };

  if (action === 'silence' && duration) {
    const silencedUntil = new Date(Date.now() + duration * 60 * 1000).toISOString();
    updateData.silencedUntil = silencedUntil;
  }

  alertStore.set(id, updateData);

  const message = getActionMessage(action);

  return {
    alert: {
      id,
      status: newStatus,
    },
    message,
    timestamp: new Date().toISOString(),
  };
}

export function getAlertStoredData(id: string): {
  status: AlertStatus;
  note?: string;
  silencedUntil?: string;
} | null {
  return alertStore.get(id) || null;
}

export function validateAlertAction(action: unknown): action is AlertActionRequest['action'] {
  return typeof action === 'string' && ['acknowledge', 'resolve', 'silence'].includes(action);
}
