import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';
import { getPythMockPublishers, type Publisher } from '@/lib/mock/oracleMockData';

interface PublishersMetadata {
  total: number;
  active: number;
  avgTrustScore: number;
}

function parseQueryParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return {
    status: searchParams.get('status') as 'active' | 'inactive' | null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { status } = parseQueryParams(request);
    let publishers: Publisher[] = getPythMockPublishers();

    if (status) {
      publishers = publishers.filter((p) => p.status === status);
    }

    const metadata: PublishersMetadata = {
      total: publishers.length,
      active: publishers.filter((p) => p.status === 'active').length,
      avgTrustScore: Math.round(
        publishers.reduce((sum, p) => sum + p.trustScore, 0) / publishers.length,
      ),
    };

    return ok(
      { publishers, metadata },
      {
        total: publishers.length,
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Pyth publishers';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
