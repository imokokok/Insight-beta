/**
 * 告警历史记录 API 路由
 *
 * 获取告警历史、确认告警
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { notificationManager } from '@/server/alerts/notificationManager';
import type { AlertSeverity } from '@/server/alerts/notifications/types';

/**
 * GET /api/alerts/history
 * 获取告警历史记录
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const options = {
      severity: searchParams.get('severity') as AlertSeverity | undefined,
      protocol: searchParams.get('protocol') || undefined,
      chain: searchParams.get('chain') || undefined,
      symbol: searchParams.get('symbol') || undefined,
      acknowledged: searchParams.has('acknowledged')
        ? searchParams.get('acknowledged') === 'true'
        : undefined,
      limit: searchParams.has('limit') ? parseInt(searchParams.get('limit')!) : 100,
      offset: searchParams.has('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    const alerts = notificationManager.getAlertHistory(options);
    const stats = notificationManager.getStats();
    const channelHealth = notificationManager.getChannelHealth();

    return NextResponse.json({
      success: true,
      alerts,
      stats,
      channelHealth,
      pagination: {
        limit: options.limit,
        offset: options.offset,
        total: stats.totalAlerts,
      },
    });
  } catch (error) {
    logger.error('Failed to get alert history', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to get alert history' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/alerts/history/acknowledge
 * 确认告警
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertId, acknowledgedBy } = body;

    if (!alertId) {
      return NextResponse.json(
        { success: false, error: 'Alert ID is required' },
        { status: 400 }
      );
    }

    const success = notificationManager.acknowledgeAlert(
      alertId,
      acknowledgedBy || 'system'
    );

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Alert not found' },
        { status: 404 }
      );
    }

    logger.info('Alert acknowledged via API', { alertId, acknowledgedBy });

    return NextResponse.json({
      success: true,
      message: 'Alert acknowledged successfully',
    });
  } catch (error) {
    logger.error('Failed to acknowledge alert', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to acknowledge alert' },
      { status: 500 }
    );
  }
}
