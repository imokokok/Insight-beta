import { ok, error } from '@/lib/api/apiResponse';

interface OverviewFeed {
  pair: string;
  status: string;
  decimals: number;
  lastUpdate: string;
}

interface ChainlinkOverviewResponse {
  feeds: OverviewFeed[];
  metadata: {
    totalFeeds: number;
    activeFeeds: number;
    supportedChains: string[];
  };
}

function getMockOverview(): ChainlinkOverviewResponse {
  const supportedChains = [
    'Ethereum',
    'Polygon',
    'Arbitrum',
    'Optimism',
    'Avalanche',
    'BSC',
    'Base',
    'Fantom',
    'Gnosis',
    'Scroll',
    'Mantle',
    'Linea',
  ];

  const feedPairs = [
    'ETH/USD',
    'BTC/USD',
    'LINK/USD',
    'USDC/USD',
    'USDT/USD',
    'DAI/USD',
    'AAVE/USD',
    'UNI/USD',
    'MATIC/USD',
    'AVAX/USD',
    'BNB/USD',
    'ARB/USD',
    'OP/USD',
    'ATOM/USD',
    'SOL/USD',
  ];

  const feeds: OverviewFeed[] = feedPairs.map((pair) => ({
    pair,
    status: Math.random() > 0.05 ? 'active' : 'inactive',
    decimals: 8,
    lastUpdate: new Date(Date.now() - Math.floor(Math.random() * 600000)).toISOString(),
  }));

  const activeFeeds = feeds.filter((f) => f.status === 'active').length;

  return {
    feeds,
    metadata: {
      totalFeeds: feeds.length,
      activeFeeds,
      supportedChains,
    },
  };
}

export async function GET() {
  try {
    const overview = getMockOverview();

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
