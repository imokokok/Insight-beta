import type { AlertStatus } from '@/features/alerts/types';
import { getClient } from '@/lib/database/db';
import { logger } from '@/shared/logger';

import type pg from 'pg';

export interface BatchActionRequest {
  action: 'acknowledge' | 'resolve' | 'silence';
  alertIds: string[];
  note?: string;
  duration?: number;
  userId?: string;
}

export interface BatchResult {
  alertId: string;
  success: boolean;
  error?: string;
  source?: 'main' | 'override' | 'none';
}

export interface BatchActionResult {
  processed: number;
  failed: number;
  results: BatchResult[];
  message: string;
}

export interface UpdateResult {
  success: boolean;
  source: 'main' | 'override' | 'none';
  message?: string;
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

function mapStatusToDb(status: AlertStatus): string {
  const statusMap: Record<string, string> = {
    active: 'open',
    investigating: 'acknowledged',
    resolved: 'resolved',
    open: 'open',
    acknowledged: 'acknowledged',
    Open: 'open',
    Acknowledged: 'acknowledged',
    Resolved: 'resolved',
    firing: 'open',
    pending: 'open',
    silenced: 'open',
  };
  return statusMap[status] || 'open';
}

async function upsertAlertStatusOverrideWithClient(
  client: pg.PoolClient,
  alertId: string,
  status: string,
  note?: string,
  silencedUntil?: string,
  userId?: string,
): Promise<void> {
  const now = new Date().toISOString();

  await client.query(
    `INSERT INTO alert_status_overrides (alert_id, status, note, silenced_until, updated_by, updated_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     ON CONFLICT (alert_id) DO UPDATE SET
       status = EXCLUDED.status,
       note = EXCLUDED.note,
       silenced_until = EXCLUDED.silenced_until,
       updated_by = EXCLUDED.updated_by,
       updated_at = EXCLUDED.updated_at`,
    [alertId, status, note || null, silencedUntil || null, userId || null, now],
  );
}

async function updateAlertInDbWithClient(
  client: pg.PoolClient,
  alertId: string,
  action: string,
  dbStatus: string,
  note: string | undefined,
  silencedUntil: string | undefined,
  userId: string | undefined,
  now: string,
): Promise<UpdateResult> {
  let updateResult;

  if (action === 'acknowledge') {
    updateResult = await client.query(
      `UPDATE unified_alerts 
       SET status = $1, acknowledged_by = $2, acknowledged_at = $3, updated_at = $3
       WHERE id = $4`,
      [dbStatus, userId || null, now, alertId],
    );
  } else if (action === 'resolve') {
    updateResult = await client.query(
      `UPDATE unified_alerts 
       SET status = $1, resolved_by = $2, resolved_at = $3, updated_at = $3
       WHERE id = $4`,
      [dbStatus, userId || null, now, alertId],
    );
  } else {
    updateResult = await client.query(
      `UPDATE unified_alerts 
       SET status = $1, updated_at = $2
       WHERE id = $3`,
      [dbStatus, now, alertId],
    );
  }

  if (updateResult.rowCount && updateResult.rowCount > 0) {
    return {
      success: true,
      source: 'main',
      message: `Updated alert ${alertId} in main table`,
    };
  }

  await upsertAlertStatusOverrideWithClient(client, alertId, dbStatus, note, silencedUntil, userId);
  return {
    success: true,
    source: 'override',
    message: `Alert ${alertId} not found in main table, created/updated override record`,
  };
}

export async function processBatchAction(request: BatchActionRequest): Promise<BatchActionResult> {
  const { action, alertIds, note, duration, userId } = request;

  const newStatus: AlertStatus =
    action === 'acknowledge' ? 'investigating' : action === 'resolve' ? 'resolved' : 'active';

  const dbStatus = mapStatusToDb(newStatus);
  const now = new Date().toISOString();

  let silencedUntil: string | undefined;
  if (action === 'silence' && duration) {
    silencedUntil = new Date(Date.now() + duration * 60 * 1000).toISOString();
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    const results: BatchResult[] = [];
    let processed = 0;
    let failed = 0;

    for (const alertId of alertIds) {
      try {
        const result = await updateAlertInDbWithClient(
          client,
          alertId,
          action,
          dbStatus,
          note,
          silencedUntil,
          userId,
          now,
        );
        results.push({
          alertId,
          success: result.success,
          source: result.source,
        });
        if (result.success) {
          processed++;
        } else {
          failed++;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        results.push({
          alertId,
          success: false,
          error: errorMessage,
          source: 'none',
        });
        failed++;
        logger.warn(`Failed to process alert ${alertId}`, { error: err });
      }
    }

    await client.query('COMMIT');

    const message = getBatchActionMessage(action, processed, failed);

    return {
      processed,
      failed,
      results,
      message,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Batch action transaction failed, rolling back', { error: err });
    throw err;
  } finally {
    client.release();
  }
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
