import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';

    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const supabase = createSupabaseClient();

    const { data: detections, error } = await supabase
      .from('manipulation_detections')
      .select('detected_at, severity, type')
      .gte('detected_at', startDate.toISOString())
      .order('detected_at', { ascending: true });

    if (error) {
      logger.error('Failed to fetch trends:', error);
      return NextResponse.json(
        { error: 'Failed to fetch trends' },
        { status: 500 }
      );
    }

    // Generate date range
    const trends: Record<string, { date: string; total: number; critical: number; high: number; medium: number; low: number }> = {};
    
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      trends[dateStr] = {
        date: dateStr,
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };
    }

    // Aggregate detections
    detections?.forEach((detection) => {
      const dateStr = new Date(detection.detected_at).toISOString().split('T')[0];
      if (trends[dateStr]) {
        trends[dateStr].total++;
        trends[dateStr][detection.severity as keyof typeof trends[string]]++;
      }
    });

    // Calculate type distribution
    const typeCounts: Record<string, number> = {};
    detections?.forEach((detection) => {
      typeCounts[detection.type] = (typeCounts[detection.type] || 0) + 1;
    });

    const typeDistribution = Object.entries(typeCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Calculate severity distribution
    const severityCounts: Record<string, number> = {};
    detections?.forEach((detection) => {
      severityCounts[detection.severity] = (severityCounts[detection.severity] || 0) + 1;
    });

    const severityDistribution = Object.entries(severityCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return NextResponse.json({
      trends: Object.values(trends),
      typeDistribution,
      severityDistribution,
    });
  } catch (error) {
    logger.error('Error in trends API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
