import { ok, error } from '@/lib/api/apiResponse';
import { getChainlinkMockStats } from '@/lib/mock/oracleMockData';

export async function GET() {
  try {
    const stats = getChainlinkMockStats();

    return ok({
      stats,
      metadata: {
        source: 'chainlink-network',
        lastUpdated: new Date().toISOString(),
        note: 'Mock data - to be replaced with real Chainlink network data',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Chainlink stats';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
