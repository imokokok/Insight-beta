import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { processBatchAction, validateBatchRequest } from '@/features/alerts/api';
import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import { logger } from '@/shared/logger';

async function handlePost(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();

  if (!validateBatchRequest(body)) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Invalid request. action must be acknowledge, resolve, or silence, and alertIds must be a non-empty array.',
      },
      { status: 400 },
    );
  }

  try {
    const result = await processBatchAction(body);

    return NextResponse.json({
      success: result.failed === 0,
      data: {
        processed: result.processed,
        failed: result.failed,
        results: result.results,
        message: result.message,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Failed to process batch action', { error: err });
    return NextResponse.json(
      { success: false, error: 'Failed to process batch action' },
      { status: 500 },
    );
  }
}

export const POST = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  auth: { required: true },
  validate: { allowedMethods: ['POST'] },
})(handlePost);
