import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  getReliabilityScores,
  getProtocolRankings,
  getReliabilityTrend,
} from '@/features/oracle/services/reliabilityScorer';
import { hasDatabase } from '@/lib/database/db';
import type { TimePeriod } from '@/types/oracle/reliability';

export async function GET(request: NextRequest) {
  try {
    if (!hasDatabase()) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') as TimePeriod) || '30d';
    const protocol = searchParams.get('protocol');
    const trend = searchParams.get('trend') === 'true';
    const trendDays = parseInt(searchParams.get('trendDays') || '30', 10);

    if (!['7d', '30d', '90d'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period. Must be one of: 7d, 30d, 90d' },
        { status: 400 },
      );
    }

    if (trend && protocol) {
      const trendData = await getReliabilityTrend(protocol, trendDays);
      return NextResponse.json({
        success: true,
        protocol,
        period: `${trendDays}d`,
        data: trendData,
      });
    }

    if (protocol) {
      const scores = await getReliabilityScores(period, protocol);
      return NextResponse.json({
        success: true,
        period,
        protocol,
        data: scores,
      });
    }

    const rankings = await getProtocolRankings(period);
    const scores = await getReliabilityScores(period);

    return NextResponse.json({
      success: true,
      period,
      rankings,
      scores,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch reliability scores',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
