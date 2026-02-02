import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export async function GET() {
  try {
    const supabase = createSupabaseClient();

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from('manipulation_detections')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .gte('detected_at', oneDayAgo);

    if (error) {
      logger.error('Failed to fetch unread count:', error);
      return NextResponse.json(
        { error: 'Failed to fetch count' },
        { status: 500 }
      );
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    logger.error('Error in unread count API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
