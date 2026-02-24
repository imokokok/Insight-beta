import { z } from 'zod';

import { fetchChainStatus } from '@/features/cross-chain/api';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';

async function handleGet(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chain = searchParams.get('chain') || undefined;

    const data = await fetchChainStatus({ chain });

    return apiSuccess(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        'VALIDATION_ERROR',
        `Invalid query parameters: ${error.errors.map((e) => e.message).join(', ')}`,
        400,
      );
    }
    throw error;
  }
}

export const GET = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  validate: { allowedMethods: ['GET'] },
})(handleGet);
