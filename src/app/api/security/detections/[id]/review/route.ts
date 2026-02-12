import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/shared/logger';
import { query } from '@/infrastructure/database/db';
import { requireAdminWithToken } from '@/infrastructure/api/apiResponse';

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

    const result = await query(
      `UPDATE manipulation_detections 
       SET status = $1, notes = $2, reviewed_at = NOW(), reviewed_by = $3
       WHERE id = $4`,
      [status, notes, 'system', id],
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Detection not found' }, { status: 404 });
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
