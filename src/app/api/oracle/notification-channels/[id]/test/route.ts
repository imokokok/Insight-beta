/**
 * Notification Channel Test API
 *
 * 测试通知渠道配置 API
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { notificationConfigService } from '@/server/alerts/notificationConfigService';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const result = await notificationConfigService.testChannel(id);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Failed to test notification channel:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
