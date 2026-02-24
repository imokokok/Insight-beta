import type { AlertStatus } from '@/features/alerts/types';
import { logger } from '@/shared/logger';

const batchAlertStore = new Map<
  string,
  { status: AlertStatus; note?: string; silencedUntil?: string }
>();

export interface BatchActionRequest {
  action: 'acknowledge' | 'resolve' | 'silence';
  alertIds: string[];
  note?: string;
  duration?: number;
}

export interface BatchResult {
  alertId: string;
  success: boolean;
  error?: string;
}

export interface BatchActionResult {
  processed: number;
  failed: number;
  results: BatchResult[];
  message: string;
}

function getBatchActionMessage(action: string, processed: number, failed: number): string {
  const actionLabels: Record<string, string> = {
    acknowledge: 'acknowledged',
    resolve: 'resolved',
    silence: 'silenced',
  };

  const label = actionLabels[action] || 'processed';

  if (failed === 0) {
    return `Successfully ${label} ${processed} alert(s).`;
  }

  return `Processed ${processed} alert(s), failed ${failed}.`;
}

export async function processBatchAction(request: BatchActionRequest): Promise<BatchActionResult> {
  const { action, alertIds, note, duration } = request;

  const newStatus: AlertStatus =
    action === 'acknowledge' ? 'investigating' : action === 'resolve' ? 'resolved' : 'active';

  const results: BatchResult[] = [];
  let processed = 0;
  let failed = 0;

  for (const alertId of alertIds) {
    try {
      const updateData: { status: AlertStatus; note?: string; silencedUntil?: string } = {
        status: newStatus,
        note,
      };

      if (action === 'silence' && duration) {
        const silencedUntil = new Date(Date.now() + duration * 60 * 1000).toISOString();
        updateData.silencedUntil = silencedUntil;
      }

      batchAlertStore.set(alertId, updateData);
      results.push({ alertId, success: true });
      processed++;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      results.push({ alertId, success: false, error: errorMessage });
      failed++;
      logger.warn(`Failed to process alert ${alertId}`, { error: err });
    }
  }

  const message = getBatchActionMessage(action, processed, failed);

  return {
    processed,
    failed,
    results,
    message,
  };
}

export function validateBatchRequest(request: unknown): request is BatchActionRequest {
  if (!request || typeof request !== 'object') return false;

  const { action, alertIds } = request as Partial<BatchActionRequest>;

  if (!action || !['acknowledge', 'resolve', 'silence'].includes(action)) {
    return false;
  }

  if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
    return false;
  }

  return true;
}
