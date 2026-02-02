import { NextResponse } from 'next/server';
import { manipulationDetectionService } from '@/lib/services/manipulationDetectionService';
import { createSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export async function GET() {
  try {
    const serviceMetrics = manipulationDetectionService.getMetrics();
    
    const supabase = createSupabaseClient();
    
    const { data: dbMetrics, error } = await supabase
      .from('detection_metrics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Failed to fetch metrics from database:', error);
    }

    const metrics = dbMetrics || serviceMetrics;

    return NextResponse.json({
      metrics: {
        totalDetections: metrics.total_detections || metrics.totalDetections || 0,
        detectionsByType: metrics.detections_by_type || metrics.detectionsByType || {},
        detectionsBySeverity: metrics.detections_by_severity || metrics.detectionsBySeverity || {},
        falsePositives: metrics.false_positives || metrics.falsePositives || 0,
        averageConfidence: metrics.average_confidence || metrics.averageConfidence || 0,
        lastDetectionTime: metrics.last_detection_time || metrics.lastDetectionTime,
      },
    });
  } catch (error) {
    logger.error('Error in metrics API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
