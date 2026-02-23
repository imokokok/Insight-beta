import { ok, error } from '@/lib/api/apiResponse';
import { getChainlinkMockOverview } from '@/lib/mock/oracleMockData';

export async function GET() {
  try {
    const overview = getChainlinkMockOverview();

    return ok({
      ...overview,
      metadata: {
        ...overview.metadata,
        source: 'chainlink-network',
        lastUpdated: new Date().toISOString(),
        note: 'Mock data - to be replaced with real Chainlink network data',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Chainlink overview';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
