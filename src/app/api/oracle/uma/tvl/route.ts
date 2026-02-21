import type { NextRequest } from 'next/server';

import { error, ok } from '@/lib/api/apiResponse';
import { AppError } from '@/lib/errors';
import { logger } from '@/shared/logger';

interface TVLData {
  totalStaked: number;
  totalBonded: number;
  activeAssertions: number;
  activeDisputes: number;
  lastUpdated: string;
}

function generateMockTVLData(): TVLData {
  return {
    totalStaked: 125000000,
    totalBonded: 45000000,
    activeAssertions: 127,
    activeDisputes: 8,
    lastUpdated: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const requestStartTime = performance.now();

  try {
    const { searchParams } = new URL(request.url);
    const useMock =
      searchParams.get('useMock') === 'true' || process.env.NODE_ENV === 'development';

    const tvlData = useMock ? generateMockTVLData() : generateMockTVLData();

    const requestTime = performance.now() - requestStartTime;
    logger.info('UMA TVL API request completed', {
      performance: { totalRequestTimeMs: Math.round(requestTime) },
      isMock: useMock,
    });

    return ok({
      ...tvlData,
      isMock: useMock,
    });
  } catch (err) {
    const requestTime = performance.now() - requestStartTime;

    logger.error('UMA TVL API error', {
      error: err,
      performance: { totalRequestTimeMs: Math.round(requestTime) },
    });

    return error(
      new AppError('Failed to fetch UMA TVL data', {
        category: 'INTERNAL',
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        details: { message: err instanceof Error ? err.message : 'Unknown error' },
      }),
    );
  }
}
