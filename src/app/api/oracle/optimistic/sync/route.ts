/**
 * Optimistic Oracle Sync API
 *
 * 乐观预言机同步 API
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

/**
 * POST /api/oracle/optimistic/sync
 *
 * 触发乐观预言机数据同步
 */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const protocol = searchParams.get('protocol') || 'uma';

  logger.info('Triggering optimistic oracle sync', { protocol });

  try {
    // Simulate sync operation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return NextResponse.json({
      ok: true,
      data: {
        success: true,
        protocol,
        timestamp: new Date().toISOString(),
        message: 'Sync triggered successfully',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to trigger sync', { error });
    return NextResponse.json(
      { ok: false, error: { code: 'SYNC_ERROR', message: 'Failed to trigger sync' } },
      { status: 500 },
    );
  }
}
