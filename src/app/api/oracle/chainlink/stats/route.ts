import { ok, error } from '@/lib/api/apiResponse';

interface ChainlinkStats {
  totalFeeds: number;
  activeNodes: number;
  ocrRounds: number;
  avgLatency: number;
}

function getMockStats(): ChainlinkStats {
  return {
    totalFeeds: 1247,
    activeNodes: 42,
    ocrRounds: 156832,
    avgLatency: 245,
  };
}

export async function GET() {
  try {
    const stats = getMockStats();

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
