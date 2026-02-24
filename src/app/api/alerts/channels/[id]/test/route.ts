import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { testNotificationChannel } from '@/features/alerts/api';
import { logger } from '@/shared/logger';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const testResult = await testNotificationChannel(id);

    if (testResult.message === 'Channel not found') {
      return NextResponse.json(
        { ok: false, success: false, message: 'Channel not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      success: testResult.success,
      message: testResult.message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to test notification channel', { error });
    return NextResponse.json(
      { ok: false, success: false, message: 'Failed to test notification channel' },
      { status: 500 },
    );
  }
}
