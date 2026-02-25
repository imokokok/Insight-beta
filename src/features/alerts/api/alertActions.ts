import type { AlertStatus, UnifiedAlert } from '@/features/alerts/types';
import { query } from '@/lib/database/db';
import { logger } from '@/shared/logger';

export interface AlertActionRequest {
  action: 'acknowledge' | 'resolve' | 'silence';
  note?: string;
  duration?: number;
  userId?: string;
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

async function upsertAlertStatusOverride(
  alertId: string,
  status: string,
  note?: string,
  silencedUntil?: string,
  userId?: string,
): Promise<void> {
  const now = new Date().toISOString();

  await query(
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

export async function updateAlertStatus(
  id: string,
  request: AlertActionRequest,
): Promise<AlertActionResult | null> {
  const { action, note, duration, userId } = request;

  if (!action || !['acknowledge', 'resolve', 'silence'].includes(action)) {
    return null;
  }

  const newStatus: AlertStatus =
    action === 'acknowledge' ? 'investigating' : action === 'resolve' ? 'resolved' : 'active';

  const dbStatus = mapStatusToDb(newStatus);
  const now = new Date().toISOString();

  let silencedUntil: string | undefined;
  if (action === 'silence' && duration) {
    silencedUntil = new Date(Date.now() + duration * 60 * 1000).toISOString();
  }

  try {
    let updateResult;
    if (action === 'acknowledge') {
      updateResult = await query(
        `UPDATE unified_alerts 
         SET status = $1, acknowledged_by = $2, acknowledged_at = $3, updated_at = $3
         WHERE id = $4`,
        [dbStatus, userId || null, now, id],
      );
    } else if (action === 'resolve') {
      updateResult = await query(
        `UPDATE unified_alerts 
         SET status = $1, resolved_by = $2, resolved_at = $3, updated_at = $3
         WHERE id = $4`,
        [dbStatus, userId || null, now, id],
      );
    } else {
      updateResult = await query(
        `UPDATE unified_alerts 
         SET status = $1, updated_at = $2
         WHERE id = $3`,
        [dbStatus, now, id],
      );
    }

    if (!updateResult.rowCount || updateResult.rowCount === 0) {
      await upsertAlertStatusOverride(id, dbStatus, note, silencedUntil, userId);
    }

    const message = getActionMessage(action);

    return {
      alert: {
        id,
        status: newStatus,
      },
      message,
      timestamp: now,
    };
  } catch (error) {
    logger.error('Failed to update alert status', {
      alertId: id,
      action,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function getAlertStoredData(id: string): Promise<{
  status: AlertStatus;
  note?: string;
  silencedUntil?: string;
} | null> {
  try {
    const result = await query<{
      status: string;
      note?: string;
      silenced_until?: string;
    }>(`SELECT status, note, silenced_until FROM alert_status_overrides WHERE alert_id = $1`, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0]!;
    const statusMap: Record<string, AlertStatus> = {
      open: 'active',
      acknowledged: 'investigating',
      resolved: 'resolved',
    };

    return {
      status: statusMap[row.status] || 'active',
      note: row.note,
      silencedUntil: row.silenced_until,
    };
  } catch (error) {
    logger.error('Failed to get alert stored data', {
      alertId: id,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export function validateAlertAction(action: unknown): action is AlertActionRequest['action'] {
  return typeof action === 'string' && ['acknowledge', 'resolve', 'silence'].includes(action);
}
