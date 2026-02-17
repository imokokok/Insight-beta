import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import type { AlertStatus, UnifiedAlert } from '@/features/alerts/types';
import { logger } from '@/shared/logger';

const alertStore = new Map<string, { status: AlertStatus; note?: string; silencedUntil?: string }>();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { action, note, duration } = body as {
      action: 'acknowledge' | 'resolve' | 'silence';
      note?: string;
      duration?: number;
    };

    if (!action || !['acknowledge', 'resolve', 'silence'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be acknowledge, resolve, or silence.' },
        { status: 400 },
      );
    }

    const newStatus: AlertStatus = action === 'acknowledge' ? 'investigating' : action === 'resolve' ? 'resolved' : 'active';

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

    const updatedAlert: Partial<UnifiedAlert> = {
      id,
      status: newStatus,
    };

    return NextResponse.json({
      success: true,
      data: {
        alert: updatedAlert,
        message,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to update alert', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to update alert' },
      { status: 500 },
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const storedData = alertStore.get(id);

    if (!storedData) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No stored data for this alert',
      });
    }

    return NextResponse.json({
      success: true,
      data: storedData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get alert', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to get alert' },
      { status: 500 },
    );
  }
}

function getActionMessage(action: string): string {
  const messages: Record<string, string> = {
    acknowledge: 'Alert has been acknowledged and is now under investigation.',
    resolve: 'Alert has been resolved.',
    silence: 'Alert has been silenced.',
  };
  return messages[action] || 'Alert updated successfully.';
}
