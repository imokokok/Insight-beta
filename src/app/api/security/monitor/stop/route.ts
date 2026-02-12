import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { requireAdminWithToken } from '@/lib/api/apiResponse';
import { manipulationDetectionService } from '@/services/security/manipulationDetectionService';
import { logger } from '@/shared/logger';

interface StopMonitorBody {
  protocol?: string;
  symbol?: string;
  chain?: string;
  allFeeds?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminWithToken(request);
    if (auth) return auth;

    const body: StopMonitorBody = await request.json().catch(() => ({}));
    const { protocol, symbol, chain, allFeeds } = body;

    if (allFeeds) {
      manipulationDetectionService.stopAllMonitoring();
      return NextResponse.json({
        success: true,
        message: 'Stopped all monitoring',
      });
    }

    if (protocol && symbol && chain) {
      manipulationDetectionService.stopMonitoring(protocol, symbol);

      return NextResponse.json({
        success: true,
        message: `Stopped monitoring ${protocol}:${chain}:${symbol}`,
      });
    }

    manipulationDetectionService.stopAllMonitoring();
    return NextResponse.json({
      success: true,
      message: 'Stopped all monitoring',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error stopping monitor', { error: errorMessage });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
