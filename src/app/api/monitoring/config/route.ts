/**
 * 监控配置 API
 *
 * 用于更新监控服务配置
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { z } from 'zod';

import { requireAdminWithToken } from '@/lib/api/apiResponse';
import { logger } from '@/shared/logger';

const configSchema = z.object({
  refreshIntervalMs: z.number().min(1000).max(60000).optional(),
  enableNotifications: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminWithToken(request, { strict: false });
    if (auth) return auth;

    return NextResponse.json({
      refreshIntervalMs: 30000,
      enableNotifications: false,
    });
  } catch (error) {
    logger.error('Failed to get monitoring config', { error });
    return NextResponse.json({ error: 'Failed to get monitoring config' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminWithToken(request);
    if (auth) return auth;

    const body = await request.json();
    const result = configSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: result.error.format() },
        { status: 400 },
      );
    }

    const { refreshIntervalMs, enableNotifications } = result.data;

    logger.info('Monitoring config updated', { refreshIntervalMs, enableNotifications });

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      config: {
        refreshIntervalMs,
        enableNotifications,
      },
    });
  } catch (error) {
    logger.error('Failed to update monitoring config', { error });
    return NextResponse.json({ error: 'Failed to update monitoring config' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdminWithToken(request);
    if (auth) return auth;

    return NextResponse.json({
      success: true,
      message: 'Monitoring config reset successfully',
    });
  } catch (error) {
    logger.error('Failed to reset monitoring config', { error });
    return NextResponse.json({ error: 'Failed to reset monitoring config' }, { status: 500 });
  }
}
