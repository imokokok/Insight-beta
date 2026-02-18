import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getAlertHistory } from '@/features/alerts/api';
import type { TimeRange, GroupBy } from '@/features/alerts/hooks/useAlertHistory';
import { logger } from '@/shared/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = (searchParams.get('timeRange') as TimeRange) || '24h';
    const groupBy = (searchParams.get('groupBy') as GroupBy) || 'none';
    const source = searchParams.get('source') ?? undefined;
    const severity = searchParams.get('severity') ?? undefined;

    const data = await getAlertHistory({
      timeRange,
      groupBy,
      source,
      severity,
    });

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to fetch alert history', { error });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch alert history',
        data: {
          trend: [],
          heatmap: [],
          stats: {
            totalAlerts: 0,
            avgPerHour: 0,
            peakHour: 0,
            peakCount: 0,
            trend: 'stable',
            trendPercent: 0,
          },
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
