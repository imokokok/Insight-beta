import { ok, error } from '@/lib/api/apiResponse';
import { getPythMockStats } from '@/lib/mock/oracleMockData';

export async function GET() {
  try {
    const stats = getPythMockStats();

    return ok(
      {
        stats,
        metadata: {
          dataSource: 'pyth-network',
          lastUpdated: new Date().toISOString(),
          note: 'Mock data - will be replaced with real Pyth data source',
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Pyth stats';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
