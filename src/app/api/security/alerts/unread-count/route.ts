import type { NextRequest } from 'next/server';

import { requireAdminWithToken } from '@/lib/api/apiResponse';
import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import { query } from '@/lib/database/db';
import { logger } from '@/shared/logger';
import { apiSuccess, apiError } from '@/shared/utils';

async function handleGet(request: NextRequest) {
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
}

export const GET = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  validate: { allowedMethods: ['GET'] },
})(handleGet);
