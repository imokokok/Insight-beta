import type { NextRequest } from 'next/server';

import { fetchTrending } from '@/features/explore/api';
import { ok } from '@/lib/api/apiResponse';
import { withCacheHeaders, CACHE_PRESETS } from '@/lib/api/cache';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sortBy = (searchParams.get('sortBy') || 'volume') as
    | 'volume'
    | 'volatility'
    | 'updateFrequency'
    | 'popularity';

  const response = await fetchTrending(sortBy);

  const response_1 = ok(response.pairs, {
    total: response.total,
    sortBy: response.sortBy,
  });

  return withCacheHeaders(response_1, CACHE_PRESETS.medium);
}
