import type { NextRequest } from 'next/server';

import { error, ok } from '@/lib/api/apiResponse';
import { AppError } from '@/lib/errors';
import { query, hasDatabase } from '@/lib/database/db';
import { logger } from '@/shared/logger';

interface TVLData {
  totalStaked: number;
  totalBonded: number;
  activeAssertions: number;
  activeDisputes: number;
  lastUpdated: string;
}

interface UMATVLRecord {
  id: string;
  chain_id: number;
  timestamp: Date;
  total_staked: number;
  total_bonded: number;
  total_rewards: number;
  oracle_tvl: number;
  dvm_tvl: number;
  active_assertions: number;
  active_disputes: number;
  created_at: Date;
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

async function fetchTVLFromDatabase(): Promise<TVLData | null> {
  if (!hasDatabase()) {
    return null;
  }

  try {
    const result = await query<UMATVLRecord>(
      'SELECT * FROM uma_tvl ORDER BY timestamp DESC LIMIT 1',
    );

    if (result.rows.length === 0) {
      return null;
    }

    const record = result.rows[0];
    return {
      totalStaked: Number(record.total_staked),
      totalBonded: Number(record.total_bonded),
      activeAssertions: record.active_assertions,
      activeDisputes: record.active_disputes,
      lastUpdated: record.timestamp.toISOString(),
    };
  } catch (err) {
    logger.warn('Failed to fetch TVL from database, falling back to mock', { error: err });
    return null;
  }
}

export async function GET(request: NextRequest) {
  const requestStartTime = performance.now();

  try {
    const { searchParams } = new URL(request.url);
    const useMockParam = searchParams.get('useMock');
    const useMock = useMockParam === 'true' || (useMockParam !== 'false' && process.env.NODE_ENV === 'development');

    let tvlData: TVLData;
    let isMock: boolean;

    if (useMock) {
      tvlData = generateMockTVLData();
      isMock = true;
    } else {
      const dbData = await fetchTVLFromDatabase();
      if (dbData) {
        tvlData = dbData;
        isMock = false;
      } else {
        tvlData = generateMockTVLData();
        isMock = true;
      }
    }

    const requestTime = performance.now() - requestStartTime;
    logger.info('UMA TVL API request completed', {
      performance: { totalRequestTimeMs: Math.round(requestTime) },
      isMock,
    });

    return ok({
      ...tvlData,
      isMock,
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
