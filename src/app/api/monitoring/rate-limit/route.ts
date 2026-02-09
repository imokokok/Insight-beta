/**
 * Rate Limit Monitoring API - 速率限制监控接口
 *
 * 提供速率限制状态查询和监控功能
 */

import { NextResponse } from 'next/server';

import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import { getRateLimitStoreStatus, cleanupMemoryStore } from '@/lib/security/rateLimit';
import { requireAdmin } from '@/server/apiResponse';

/**
 * @swagger
 * /api/monitoring/rate-limit:
 *   get:
 *     summary: 获取速率限制状态
 *     description: 获取当前速率限制的存储状态和统计信息
 *     tags:
 *       - Monitoring
 *     responses:
 *       200:
 *         description: 成功获取速率限制状态
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     storeType:
 *                       type: string
 *                       enum: [memory]
 *                     memorySize:
 *                       type: number
 *                     timestamp:
 *                       type: string
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */

export async function GET(request: Request) {
  try {
    // 验证管理员权限
    const auth = await requireAdmin(request, { strict: true, scope: 'monitoring_read' });
    if (auth) return auth;

    const status = getRateLimitStoreStatus();

    return NextResponse.json({
      success: true,
      data: {
        ...status,
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
      },
    });
  } catch (error) {
    logger.error('Failed to get rate limit status', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get rate limit status',
        },
      },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/monitoring/rate-limit:
 *   post:
 *     summary: 清理内存存储
 *     description: 手动清理过期的速率限制内存存储记录
 *     tags:
 *       - Monitoring
 *     responses:
 *       200:
 *         description: 清理成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     cleaned:
 *                       type: boolean
 *                     previousSize:
 *                       type: number
 *                     currentSize:
 *                       type: number
 *                     timestamp:
 *                       type: string
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */

export async function POST(request: Request) {
  try {
    // 验证管理员权限
    const auth = await requireAdmin(request, { strict: true, scope: 'monitoring_write' });
    if (auth) return auth;

    const beforeStatus = getRateLimitStoreStatus();
    cleanupMemoryStore();
    const afterStatus = getRateLimitStoreStatus();

    logger.info('Rate limit memory store cleaned', {
      previousSize: beforeStatus.memorySize,
      currentSize: afterStatus.memorySize,
    });

    return NextResponse.json({
      success: true,
      data: {
        cleaned: true,
        previousSize: beforeStatus.memorySize,
        currentSize: afterStatus.memorySize,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to cleanup rate limit store', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to cleanup rate limit store',
        },
      },
      { status: 500 },
    );
  }
}
