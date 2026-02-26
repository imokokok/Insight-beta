import type { NextRequest } from 'next/server';

import { z } from 'zod';

import { performSearch } from '@/features/explore/api';
import { error, ok } from '@/lib/api/apiResponse';
import { logger } from '@/shared/logger';

const SearchQuerySchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(100, 'Query is too long'),
  type: z.enum(['all', 'feeds', 'protocols', 'addresses']).optional().default('all'),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const rawParams = {
      query: searchParams.get('q') || searchParams.get('query') || '',
      type: searchParams.get('type') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    };

    const validation = SearchQuerySchema.safeParse(rawParams);

    if (!validation.success) {
      return error(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid search parameters',
          details: validation.error.flatten().fieldErrors,
        },
        400,
      );
    }

    const { query, type, limit, offset } = validation.data;

    logger.debug('Search request', { query, type, limit, offset });

    const result = await performSearch(query);

    return ok(result.results, {
      total: result.total,
    });
  } catch (err) {
    logger.error('Search API error', { error: err });
    return error('Failed to perform search', 500);
  }
}
