import type { NextRequest } from 'next/server';

import { logger } from '@/lib/logger';
import { manipulationDetectionService } from '@/lib/services/manipulationDetectionService';
import { supabaseAdmin, SUPABASE_ERROR_CODES } from '@/lib/supabase/server';
import { apiSuccess, withErrorHandler } from '@/lib/utils';
import { requireAdminWithToken } from '@/server/apiResponse';

interface MetricsRow {
  total_detections: number;
  detections_by_type: Record<string, number>;
  detections_by_severity: Record<string, number>;
  false_positives: number;
  average_confidence: number;
  last_detection_time: string | null;
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAdminWithToken(request, { strict: false });
  if (auth) return auth;

  const serviceMetrics = manipulationDetectionService.getMetrics();

  const supabase = supabaseAdmin;

  const { data: dbMetrics, error } = await supabase
    .from('detection_metrics')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== SUPABASE_ERROR_CODES.NO_DATA) {
    logger.error('Failed to fetch metrics from database', { error: error.message });
  }

  const dbData = dbMetrics as MetricsRow | null;
  const useDbMetrics = dbData && !error;

  return apiSuccess({
    metrics: {
      totalDetections: useDbMetrics ? dbData.total_detections : serviceMetrics.totalDetections,
      detectionsByType: useDbMetrics
        ? dbData.detections_by_type
        : serviceMetrics.detectionsByType,
      detectionsBySeverity: useDbMetrics
        ? dbData.detections_by_severity
        : serviceMetrics.detectionsBySeverity,
      falsePositives: useDbMetrics ? dbData.false_positives : serviceMetrics.falsePositives,
      averageConfidence: useDbMetrics
        ? dbData.average_confidence
        : serviceMetrics.averageConfidence,
      lastDetectionTime: useDbMetrics
        ? dbData.last_detection_time
        : serviceMetrics.lastDetectionTime,
    },
  });
});
