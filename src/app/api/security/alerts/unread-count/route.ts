import type { NextRequest } from 'next/server';

import { logger } from '@/shared/logger';
import { query } from '@/infrastructure/database/db';
import { apiSuccess, apiError, withErrorHandler } from '@/shared/utils';
import { requireAdminWithToken } from '@/infrastructure/api/apiResponse';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAdminWithToken(request, { strict: false });
  if (auth) return auth;

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM manipulation_detections 
       WHERE status = $1 AND detected_at >= $2`,
      ['pending', oneDayAgo],
    );

    const count = parseInt(result.rows[0]?.count as string) || 0;

    return apiSuccess({ count });
  } catch (error) {
    logger.error('Failed to fetch unread count', {
      error: error instanceof Error ? error.message : String(error),
    });
    return apiError('Failed to fetch count', 500);
  }
});
