import type { NextRequest } from 'next/server';

import { logger } from '@/lib/logger';
import { manipulationDetectionService } from '@/lib/services/manipulationDetectionService';
import { query } from '@/server/db';
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

  let dbData: MetricsRow | null = null;
  let dbError = false;

  try {
    const result = await query<MetricsRow>(`
      SELECT * FROM detection_metrics
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (result.rows.length > 0) {
      dbData = result.rows[0] ?? null;
    }
  } catch (error) {
    dbError = true;
    logger.error('Failed to fetch metrics from database', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (dbData && !dbError) {
    return apiSuccess({
      metrics: {
        totalDetections: dbData.total_detections,
        detectionsByType: dbData.detections_by_type,
        detectionsBySeverity: dbData.detections_by_severity,
        falsePositives: dbData.false_positives,
        averageConfidence: dbData.average_confidence,
        lastDetectionTime: dbData.last_detection_time,
      },
    });
  }

  return apiSuccess({
    metrics: {
      totalDetections: serviceMetrics.totalDetections,
      detectionsByType: serviceMetrics.detectionsByType,
      detectionsBySeverity: serviceMetrics.detectionsBySeverity,
      falsePositives: serviceMetrics.falsePositives,
      averageConfidence: serviceMetrics.averageConfidence,
      lastDetectionTime: serviceMetrics.lastDetectionTime,
    },
  });
});
