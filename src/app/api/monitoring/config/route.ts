/**
 * 监控配置 API
 *
 * 用于更新告警服务配置
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { z } from 'zod';

import { logger } from '@/lib/logger';
import { alertService } from '@/lib/services/detection/alertService';
import { requireAdminWithToken } from '@/server/apiResponse';

const configSchema = z.object({
  channels: z
    .object({
      email: z.boolean().optional(),
      webhook: z.boolean().optional(),
      slack: z.boolean().optional(),
      telegram: z.boolean().optional(),
    })
    .optional(),
  cooldownMs: z.number().min(0).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminWithToken(request, { strict: false });
    if (auth) return auth;

    const stats = alertService.getStats();

    return NextResponse.json({
      channels: stats.channels,
      cooldownMs: 5 * 60 * 1000, // 默认值
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

    const { channels, cooldownMs } = result.data;

    // 更新配置
    alertService.updateConfig({
      channels,
      cooldownMs,
    });

    logger.info('Monitoring config updated', { channels, cooldownMs });

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      config: {
        channels,
        cooldownMs,
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

    // 重置告警历史
    alertService.resetHistory();

    return NextResponse.json({
      success: true,
      message: 'Alert history reset successfully',
    });
  } catch (error) {
    logger.error('Failed to reset alert history', { error });
    return NextResponse.json({ error: 'Failed to reset alert history' }, { status: 500 });
  }
}
