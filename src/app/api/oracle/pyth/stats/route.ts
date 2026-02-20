import { ok, error } from '@/lib/api/apiResponse';

interface PythStats {
  totalPublishers: number;
  activePublishers: number;
  activePriceFeeds: number;
  avgLatency: number;
}

function getMockStats(): PythStats {
  return {
    totalPublishers: 28,
    activePublishers: 24,
    activePriceFeeds: 356,
    avgLatency: 245,
  };
}

export async function GET() {
  try {
    const stats = getMockStats();

    return ok({
      stats,
      metadata: {
        dataSource: 'pyth-network',
        lastUpdated: new Date().toISOString(),
        note: 'Mock data - will be replaced with real Pyth data source',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Pyth stats';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
