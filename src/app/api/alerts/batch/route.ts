import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import type { AlertStatus } from '@/features/alerts/types';
import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import { logger } from '@/shared/logger';

const batchAlertStore = new Map<
  string,
  { status: AlertStatus; note?: string; silencedUntil?: string }
>();

interface BatchActionRequest {
  action: 'acknowledge' | 'resolve' | 'silence';
  alertIds: string[];
  note?: string;
  duration?: number;
}

interface BatchResult {
  alertId: string;
  success: boolean;
  error?: string;
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

async function handlePost(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as BatchActionRequest;
  const { action, alertIds, note, duration } = body;

  if (!action || !['acknowledge', 'resolve', 'silence'].includes(action)) {
    return NextResponse.json(
      { success: false, error: 'Invalid action. Must be acknowledge, resolve, or silence.' },
      { status: 400 },
    );
  }

  if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
    return NextResponse.json(
      { success: false, error: 'alertIds must be a non-empty array.' },
      { status: 400 },
    );
  }

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

  return NextResponse.json({
    success: failed === 0,
    data: {
      processed,
      failed,
      results,
      message,
    },
    timestamp: new Date().toISOString(),
  });
}

export const POST = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  auth: { required: true },
  validate: { allowedMethods: ['POST'] },
})(handlePost);
