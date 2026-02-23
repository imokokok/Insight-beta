import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';
import { getPythMockHermesServices, type HermesService } from '@/lib/mock/oracleMockData';

interface HermesMetadata {
  total: number;
  healthy: number;
  avgResponseTime: number;
}

function parseQueryParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return {
    status: searchParams.get('status') as 'healthy' | 'degraded' | 'down' | null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { status } = parseQueryParams(request);
    let services: HermesService[] = getPythMockHermesServices();

    if (status) {
      services = services.filter((s) => s.status === status);
    }

    const metadata: HermesMetadata = {
      total: services.length,
      healthy: services.filter((s) => s.status === 'healthy').length,
      avgResponseTime: Math.round(
        services.reduce((sum, s) => sum + s.responseTime, 0) / services.length,
      ),
    };

    return ok({ services, metadata }, { total: services.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Hermes service status';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
