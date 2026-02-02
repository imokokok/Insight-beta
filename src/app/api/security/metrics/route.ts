import { NextResponse } from 'next/server';
import { manipulationDetectionService } from '@/lib/services/manipulationDetectionService';
import { createSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

interface MetricsRow {
  total_detections: number;
  detections_by_type: Record<string, number>;
  detections_by_severity: Record<string, number>;
  false_positives: number;
  average_confidence: number;
  last_detection_time: string | null;
}

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
      logger.error('Failed to fetch metrics from database', { error: error.message });
    }

    const dbData = dbMetrics as MetricsRow | null;
    const useDbMetrics = dbData && !error;

    return NextResponse.json({
      metrics: {
        totalDetections: useDbMetrics ? dbData.total_detections : serviceMetrics.totalDetections,
        detectionsByType: useDbMetrics ? dbData.detections_by_type : serviceMetrics.detectionsByType,
        detectionsBySeverity: useDbMetrics ? dbData.detections_by_severity : serviceMetrics.detectionsBySeverity,
        falsePositives: useDbMetrics ? dbData.false_positives : serviceMetrics.falsePositives,
        averageConfidence: useDbMetrics ? dbData.average_confidence : serviceMetrics.averageConfidence,
        lastDetectionTime: useDbMetrics ? dbData.last_detection_time : serviceMetrics.lastDetectionTime,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error in metrics API', { error: errorMessage });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
