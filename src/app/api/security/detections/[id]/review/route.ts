import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdminWithToken } from '@/server/apiResponse';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminWithToken(request);
    if (auth) return auth;

    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    if (!status || !['confirmed', 'false_positive', 'under_investigation'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be confirmed, false_positive, or under_investigation' },
        { status: 400 },
      );
    }

    const supabase = supabaseAdmin;

    const { error } = await supabase
      .from('manipulation_detections')
      .update({
        status,
        notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'system',
      })
      .eq('id', id);

    if (error) {
      logger.error('Failed to update detection review', { error: error.message });
      return NextResponse.json({ error: 'Failed to update detection' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Detection marked as ${status}`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error reviewing detection', { error: errorMessage });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
