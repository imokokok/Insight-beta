/**
 * SLA Stats API Route
 *
 * SLA 统计 API 路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSLAStats } from '@/server/monitoring/slaMonitor';
import { logger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const stats = await getGlobalSLAStats();
    return NextResponse.json(stats);
  } catch (error) {
    logger.error('Failed to get SLA stats', { error });
    return NextResponse.json(
      { error: 'Failed to get SLA stats' },
      { status: 500 }
    );
  }
}
