import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';

interface Feed {
  symbol: string;
  pair: string;
  latestPrice: string;
  heartbeat: number;
  deviationThreshold: string;
  aggregatorAddress: string;
  decimals: number;
  lastUpdate: string;
}

interface FeedsQueryParams {
  chain?: string;
  status?: 'active' | 'inactive';
  search?: string;
}

function parseQueryParams(request: NextRequest): FeedsQueryParams {
  const { searchParams } = new URL(request.url);
  return {
    chain: searchParams.get('chain') ?? undefined,
    status: (searchParams.get('status') as FeedsQueryParams['status']) ?? 'active',
    search: searchParams.get('search') ?? undefined,
  };
}

function getMockFeeds(): Feed[] {
  const feedData = [
    { symbol: 'ETH', pair: 'ETH/USD', price: 2345.67, decimals: 8 },
    { symbol: 'BTC', pair: 'BTC/USD', price: 67890.12, decimals: 8 },
    { symbol: 'LINK', pair: 'LINK/USD', price: 14.56, decimals: 8 },
    { symbol: 'USDC', pair: 'USDC/USD', price: 1.0001, decimals: 8 },
    { symbol: 'USDT', pair: 'USDT/USD', price: 0.9999, decimals: 8 },
    { symbol: 'DAI', pair: 'DAI/USD', price: 1.0002, decimals: 8 },
    { symbol: 'EUR', pair: 'EUR/USD', price: 1.0845, decimals: 8 },
    { symbol: 'GBP', pair: 'GBP/USD', price: 1.2634, decimals: 8 },
    { symbol: 'JPY', pair: 'USD/JPY', price: 149.82, decimals: 8 },
    { symbol: 'XAU', pair: 'XAU/USD', price: 2034.5, decimals: 8 },
    { symbol: 'BNB', pair: 'BNB/USD', price: 312.45, decimals: 8 },
    { symbol: 'AVAX', pair: 'AVAX/USD', price: 35.67, decimals: 8 },
    { symbol: 'MATIC', pair: 'MATIC/USD', price: 0.89, decimals: 8 },
    { symbol: 'ARB', pair: 'ARB/USD', price: 1.23, decimals: 8 },
    { symbol: 'OP', pair: 'OP/USD', price: 2.45, decimals: 8 },
  ];

  return feedData.map((data, index) => ({
    symbol: data.symbol,
    pair: data.pair,
    latestPrice: data.price.toFixed(data.decimals),
    heartbeat: [60000, 300000, 600000, 3600000][index % 4] ?? 60000,
    deviationThreshold: ['0.5%', '1%', '2%', '0.25%'][index % 4] ?? '0.5%',
    aggregatorAddress: `0x${(index + 1).toString(16).padStart(40, '0')}`,
    decimals: data.decimals,
    lastUpdate: new Date(Date.now() - Math.floor(Math.random() * 600000)).toISOString(),
  }));
}

export async function GET(request: NextRequest) {
  try {
    const { chain, status, search } = parseQueryParams(request);

    let feeds = getMockFeeds();

    if (search) {
      const searchLower = search.toLowerCase();
      feeds = feeds.filter(
        (feed) =>
          feed.symbol.toLowerCase().includes(searchLower) ||
          feed.pair.toLowerCase().includes(searchLower),
      );
    }

    const activeCount = feeds.length;

    return ok({
      feeds,
      metadata: {
        total: feeds.length,
        active: activeCount,
        chain: chain ?? 'ethereum-mainnet',
        filter: status,
        source: 'chainlink-feeds',
        lastUpdated: new Date().toISOString(),
        note: 'Mock data - to be replaced with real Chainlink feed data',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch feeds';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
