import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, notes } = body;

    if (!status || !['confirmed', 'false_positive', 'under_investigation'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be confirmed, false_positive, or under_investigation' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseClient();

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
      logger.error('Failed to update detection review:', error);
      return NextResponse.json(
        { error: 'Failed to update detection' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Detection marked as ${status}`,
    });
  } catch (error) {
    logger.error('Error reviewing detection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
