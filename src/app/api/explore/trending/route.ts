import type { NextRequest } from 'next/server';

import { fetchTrending } from '@/features/explore/api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sortBy = (searchParams.get('sortBy') || 'volume') as
    | 'volume'
    | 'volatility'
    | 'updateFrequency'
    | 'popularity';

  const response = await fetchTrending(sortBy);

  const body = {
    success: true,
    data: response.pairs,
    meta: {
      total: response.total,
      sortBy: response.sortBy,
    },
  };

  return Response.json(body, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
