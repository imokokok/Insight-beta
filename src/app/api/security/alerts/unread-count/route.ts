import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdminWithToken } from '@/server/apiResponse';

export async function GET(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Failed to fetch count' }, { status: 500 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error in unread count API', { error: errorMessage });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
