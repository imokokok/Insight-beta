import type { NextRequest } from 'next/server';

import { performSearch } from '@/features/explore/api';
import { error, ok } from '@/lib/api/apiResponse';
import { logger } from '@/shared/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    const result = await performSearch(query);

    return ok(result.results, {
      total: result.total,
    });
  } catch (err) {
    logger.error('Search API error', { error: err });
    return error('Failed to perform search', 500);
  }
}
