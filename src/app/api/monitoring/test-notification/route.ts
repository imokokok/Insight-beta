/**
 * 测试通知 API
 *
 * 用于测试各个通知渠道是否配置正确
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { sendTestNotification } from '@/server/notifications';
import { z } from 'zod';

const testNotificationSchema = z.object({
  channel: z.enum(['email', 'webhook', 'slack', 'telegram']),
  recipient: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = testNotificationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: result.error.format() },
        { status: 400 },
      );
    }

    const { channel, recipient } = result.data;

    // 发送测试通知
    await sendTestNotification(channel, recipient);

    logger.info('Test notification sent', { channel, recipient });

    return NextResponse.json({
      success: true,
      message: `Test notification sent via ${channel}`,
      channel,
      recipient: recipient || 'default',
    });
  } catch (error) {
    logger.error('Failed to send test notification', { error });
    return NextResponse.json(
      {
        error: 'Failed to send test notification',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
