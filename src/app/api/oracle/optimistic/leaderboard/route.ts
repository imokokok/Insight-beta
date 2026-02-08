/**
 * Optimistic Oracle Leaderboard API
 *
 * 乐观预言机排行榜 API
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

interface LeaderboardEntry {
  address: string;
  count: number;
  bond: string;
  won: number;
}

interface LeaderboardData {
  metric: string;
  protocol: string;
  top: LeaderboardEntry[];
  generatedAt: string;
}

/**
 * GET /api/oracle/optimistic/leaderboard
 *
 * 获取乐观预言机排行榜数据
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const protocol = searchParams.get('protocol') || 'uma';
  const metric = searchParams.get('metric') || 'proposals';

  logger.info('Fetching optimistic oracle leaderboard', { protocol, metric });

  try {
    // Generate mock leaderboard data
    const mockData: LeaderboardData = {
      metric,
      protocol,
      top: [
        {
          address: '0x1234567890abcdef1234567890abcdef12345678',
          count: 156,
          bond: '780000',
          won: 148,
        },
        {
          address: '0xabcdef1234567890abcdef1234567890abcdef12',
          count: 134,
          bond: '670000',
          won: 129,
        },
        {
          address: '0x7890abcdef1234567890abcdef1234567890abcd',
          count: 98,
          bond: '490000',
          won: 94,
        },
        {
          address: '0xdef1234567890abcdef1234567890abcdef12345',
          count: 87,
          bond: '435000',
          won: 82,
        },
        {
          address: '0x567890abcdef1234567890abcdef1234567890ab',
          count: 72,
          bond: '360000',
          won: 68,
        },
      ],
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      ok: true,
      data: mockData,
      meta: {
        timestamp: new Date().toISOString(),
        protocol,
        metric,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch leaderboard', { error });
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch leaderboard' } },
      { status: 500 },
    );
  }
}
