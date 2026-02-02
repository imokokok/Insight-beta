import { NextResponse } from 'next/server';
import { manipulationDetectionService } from '@/lib/services/manipulationDetectionService';
import { createSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export async function GET() {
  try {
    const isRunning = manipulationDetectionService.isMonitoring();
    const activeMonitors: string[] = manipulationDetectionService.getActiveMonitors();
    
    const supabase = createSupabaseClient();
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentDetections, error } = await supabase
      .from('manipulation_detections')
      .select('id')
      .gte('detected_at', oneHourAgo);

    if (error) {
      logger.error('Failed to fetch recent detections', { error: error.message });
    }

    const recentDetectionCount = recentDetections?.length || 0;
    
    let systemHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (recentDetectionCount > 10) {
      systemHealth = 'degraded';
    }
    if (recentDetectionCount > 20) {
      systemHealth = 'unhealthy';
    }

    return NextResponse.json({
      status: {
        isRunning,
        activeMonitors,
        totalMonitoredFeeds: activeMonitors.length,
        lastCheckTime: new Date().toISOString(),
        recentDetections: recentDetectionCount,
        systemHealth,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error in monitor status API', { error: errorMessage });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
