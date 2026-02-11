/**
 * 告警测试 API 路由
 *
 * 测试通知渠道是否正常工作
 */

import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { notificationManager } from '@/server/alerts/notificationManager';

/**
 * POST /api/alerts/test
 * 测试指定通知渠道
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channel } = body;

    if (!channel) {
      return NextResponse.json(
        { success: false, error: 'Channel name is required' },
        { status: 400 }
      );
    }

    // 发送测试通知
    const result = await notificationManager.testChannel(channel);

    logger.info('Alert channel test completed', {
      channel,
      success: result.success,
    });

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `测试通知已成功发送到 ${channel}`
        : `测试通知发送到 ${channel} 失败`,
      result,
    });
  } catch (error) {
    logger.error('Failed to test alert channel', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to test alert channel' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/alerts/test
 * 获取测试状态
 */
export async function GET() {
  try {
    const channelHealth = notificationManager.getChannelHealth();

    return NextResponse.json({
      success: true,
      channelHealth,
    });
  } catch (error) {
    logger.error('Failed to get test status', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to get test status' },
      { status: 500 }
    );
  }
}
