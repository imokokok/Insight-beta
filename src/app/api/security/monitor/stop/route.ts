import { NextRequest, NextResponse } from 'next/server';
import { manipulationDetectionService } from '@/lib/services/manipulationDetectionService';
import { logger } from '@/lib/utils/logger';
import type { OracleProtocol, SupportedChain } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { protocol, symbol, chain, allFeeds } = body;

    if (allFeeds) {
      manipulationDetectionService.stopAllMonitoring();
      return NextResponse.json({
        success: true,
        message: 'Stopped all monitoring',
      });
    }

    if (protocol && symbol && chain) {
      manipulationDetectionService.stopMonitoring(
        protocol as OracleProtocol,
        symbol,
        chain as SupportedChain
      );

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
    logger.error('Error stopping monitor:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
