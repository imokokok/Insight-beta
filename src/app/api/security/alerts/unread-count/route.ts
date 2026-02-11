import type { NextRequest } from 'next/server';

import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/server';
import { apiSuccess, apiError, withErrorHandler } from '@/lib/utils';
import { requireAdminWithToken } from '@/server/apiResponse';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAdminWithToken(request, { strict: false });
  if (auth) return auth;

  const supabase = supabaseAdmin;

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from('manipulation_detections')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
    .gte('detected_at', oneDayAgo);

  if (error) {
    logger.error('Failed to fetch unread count', { error: error.message });
    return apiError('Failed to fetch count', 500);
  }

  return apiSuccess({ count: count || 0 });
});
