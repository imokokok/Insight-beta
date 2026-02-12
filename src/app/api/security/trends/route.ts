import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { query } from '@/server/db';
import { requireAdminWithToken } from '@/server/apiResponse';

interface TrendData {
  date: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface DetectionTrendRow {
  detected_at: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminWithToken(request, { strict: false });
    if (auth) return auth;

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';

    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let detections: DetectionTrendRow[] = [];

    try {
      const result = await query<DetectionTrendRow>(
        `SELECT detected_at, severity, type FROM manipulation_detections 
         WHERE detected_at >= $1 
         ORDER BY detected_at ASC`,
        [startDate.toISOString()],
      );

      detections = result.rows;
    } catch (error) {
      logger.error('Failed to fetch trends', {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ error: 'Failed to fetch trends' }, { status: 500 });
    }

    const trends = new Map<string, TrendData>();

    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0] ?? '';
      if (!dateStr) continue;
      trends.set(dateStr, {
        date: dateStr,
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      });
    }

    detections.forEach((detection) => {
      const dateStr = new Date(detection.detected_at).toISOString().split('T')[0] ?? '';
      const trend = trends.get(dateStr);
      if (trend) {
        trend.total++;
        const severity = detection.severity;
        if (severity === 'critical') trend.critical++;
        else if (severity === 'high') trend.high++;
        else if (severity === 'medium') trend.medium++;
        else if (severity === 'low') trend.low++;
      }
    });

    const typeCounts: Record<string, number> = {};
    detections.forEach((detection) => {
      typeCounts[detection.type] = (typeCounts[detection.type] || 0) + 1;
    });

    const typeDistribution = Object.entries(typeCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const severityCounts: Record<string, number> = {};
    detections.forEach((detection) => {
      severityCounts[detection.severity] = (severityCounts[detection.severity] || 0) + 1;
    });

    const severityDistribution = Object.entries(severityCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return NextResponse.json({
      trends: Array.from(trends.values()),
      typeDistribution,
      severityDistribution,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error in trends API', { error: errorMessage });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
