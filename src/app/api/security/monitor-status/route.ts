import type { NextRequest } from 'next/server';

import { logger } from '@/shared/logger';
import { manipulationDetectionService } from '@/services/security/manipulationDetectionService';
import { query } from '@/infrastructure/database/db';
import { apiSuccess, withErrorHandler } from '@/shared/utils';
import { requireAdminWithToken } from '@/infrastructure/api/apiResponse';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAdminWithToken(request, { strict: false });
  if (auth) return auth;

  const isRunning = manipulationDetectionService.isMonitoring();
  const activeMonitors: string[] = manipulationDetectionService.getActiveMonitors();

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  let recentDetectionCount = 0;

  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM manipulation_detections WHERE detected_at >= $1`,
      [oneHourAgo],
    );

    recentDetectionCount = parseInt(result.rows[0]?.count as string) || 0;
  } catch (error) {
    logger.error('Failed to fetch recent detections', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  let systemHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (recentDetectionCount > 10) {
    systemHealth = 'degraded';
  }
  if (recentDetectionCount > 20) {
    systemHealth = 'unhealthy';
  }

  return apiSuccess({
    status: {
      isRunning,
      activeMonitors,
      totalMonitoredFeeds: activeMonitors.length,
      lastCheckTime: new Date().toISOString(),
      recentDetections: recentDetectionCount,
      systemHealth,
    },
  });
});
