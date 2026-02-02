/**
 * Notification Channels API
 *
 * 通知渠道配置管理 API
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { notificationConfigService } from '@/server/alerts/notificationConfigService';
import { logger } from '@/lib/logger';
import type { NotificationChannel } from '@/server/alerts/notificationService';

// ============================================================================
// GET /api/oracle/notification-channels
// 获取所有通知渠道配置
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel') as NotificationChannel | null;

    let channels;
    if (channel) {
      channels = await notificationConfigService.getChannelsByType(channel);
    } else {
      channels = await notificationConfigService.getAllChannels();
    }

    return NextResponse.json({
      success: true,
      data: channels,
      count: channels.length,
    });
  } catch (error) {
    logger.error('Failed to get notification channels', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/oracle/notification-channels
// 创建新的通知渠道配置
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, channel, config, enabled } = body;

    // 验证必填字段
    if (!name || !channel || !config) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, channel, config',
        },
        { status: 400 },
      );
    }

    // 验证渠道类型
    const validChannels: NotificationChannel[] = [
      'email',
      'sms',
      'webhook',
      'slack',
      'discord',
      'telegram',
      'pagerduty',
    ];
    if (!validChannels.includes(channel)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid channel type. Must be one of: ${validChannels.join(', ')}`,
        },
        { status: 400 },
      );
    }

    const newChannel = await notificationConfigService.createChannel({
      name,
      channel,
      config,
      enabled: enabled ?? true,
    });

    return NextResponse.json(
      {
        success: true,
        data: newChannel,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error('Failed to create notification channel', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE /api/oracle/notification-channels
// 批量删除通知渠道配置
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Channel ID is required',
        },
        { status: 400 },
      );
    }

    const deleted = await notificationConfigService.deleteChannel(id);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Channel not found',
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Channel deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete notification channel', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// PATCH /api/oracle/notification-channels
// 更新通知渠道配置
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Channel ID is required',
        },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { name, config, enabled } = body;

    const updatedChannel = await notificationConfigService.updateChannel(id, {
      name,
      config,
      enabled,
    });

    if (!updatedChannel) {
      return NextResponse.json(
        {
          success: false,
          error: 'Channel not found',
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedChannel,
    });
  } catch (error) {
    logger.error('Failed to update notification channel', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
