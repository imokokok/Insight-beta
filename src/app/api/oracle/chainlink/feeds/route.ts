import type { NextRequest } from 'next/server';

import { getRpcUrl } from '@/config/env';
import { ok, error } from '@/lib/api/apiResponse';
import { ChainlinkClient, getDefaultRpcUrl } from '@/lib/blockchain';
import { POPULAR_FEEDS } from '@/lib/blockchain/chainlinkDataFeeds';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

interface Feed {
  symbol: string;
  pair: string;
  latestPrice: string;
  heartbeat: number;
  deviationThreshold: string;
  aggregatorAddress: string;
  decimals: number;
  lastUpdate: string;
  isStale?: boolean;
  stalenessSeconds?: number;
}

interface FeedsQueryParams {
  chain?: SupportedChain;
  status?: 'active' | 'inactive';
  search?: string;
  useRealData?: boolean;
}

const VALID_CHAINS: SupportedChain[] = [
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
  'avalanche',
  'bsc',
  'fantom',
  'celo',
  'gnosis',
  'linea',
  'scroll',
  'mantle',
  'mode',
  'blast',
];

function parseQueryParams(request: NextRequest): FeedsQueryParams {
  const { searchParams } = new URL(request.url);
  const chainParam = searchParams.get('chain');

  let chain: SupportedChain | undefined;
  if (chainParam && VALID_CHAINS.includes(chainParam as SupportedChain)) {
    chain = chainParam as SupportedChain;
  }

  return {
    chain,
    status: (searchParams.get('status') as FeedsQueryParams['status']) ?? 'active',
    search: searchParams.get('search') ?? undefined,
    useRealData: searchParams.get('real') !== 'false',
  };
}

function getMockFeeds(chain?: SupportedChain): Feed[] {
  const chainFeeds = chain ? POPULAR_FEEDS[chain] : POPULAR_FEEDS.ethereum;
  const feedEntries = Object.entries(chainFeeds || {});

  if (feedEntries.length === 0) {
    const defaultFeedData = [
      { symbol: 'ETH', pair: 'ETH/USD', price: 2345.67, decimals: 8 },
      { symbol: 'BTC', pair: 'BTC/USD', price: 67890.12, decimals: 8 },
      { symbol: 'LINK', pair: 'LINK/USD', price: 14.56, decimals: 8 },
      { symbol: 'USDC', pair: 'USDC/USD', price: 1.0001, decimals: 8 },
      { symbol: 'USDT', pair: 'USDT/USD', price: 0.9999, decimals: 8 },
      { symbol: 'DAI', pair: 'DAI/USD', price: 1.0002, decimals: 8 },
    ];

    return defaultFeedData.map((data, index) => ({
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

  return feedEntries.map(([pair, address], index) => {
    const [base = 'UNKNOWN'] = pair.split('/');
    const mockPrice = getMockPriceForSymbol(base);
    return {
      symbol: base,
      pair,
      latestPrice: mockPrice.toFixed(8),
      heartbeat: [60000, 300000, 600000, 3600000][index % 4] ?? 60000,
      deviationThreshold: ['0.5%', '1%', '2%', '0.25%'][index % 4] ?? '0.5%',
      aggregatorAddress: address as string,
      decimals: 8,
      lastUpdate: new Date(Date.now() - Math.floor(Math.random() * 600000)).toISOString(),
    };
  });
}

function getMockPriceForSymbol(symbol: string): number {
  const mockPrices: Record<string, number> = {
    ETH: 2345.67,
    BTC: 67890.12,
    LINK: 14.56,
    USDC: 1.0001,
    USDT: 0.9999,
    DAI: 1.0002,
    AAVE: 92.45,
    UNI: 6.78,
    MATIC: 0.89,
    AVAX: 35.67,
    BNB: 312.45,
    FTM: 0.45,
    ARB: 1.23,
    OP: 2.45,
  };
  return mockPrices[symbol] ?? 1.0;
}

function getRpcUrlForChain(chain: SupportedChain): string | undefined {
  const envUrl = getRpcUrl(chain);
  if (envUrl) return envUrl;
  return getDefaultRpcUrl(chain);
}

async function fetchRealFeeds(chain: SupportedChain): Promise<{
  feeds: Feed[];
  errors: string[];
  source: 'on-chain' | 'fallback';
}> {
  const errors: string[] = [];
  const feeds: Feed[] = [];

  const rpcUrl = getRpcUrlForChain(chain);
  if (!rpcUrl) {
    errors.push(`No RPC URL configured for chain: ${chain}`);
    return { feeds: [], errors, source: 'fallback' };
  }

  try {
    const client = new ChainlinkClient(chain, rpcUrl);
    const chainFeeds = POPULAR_FEEDS[chain];

    if (!chainFeeds || Object.keys(chainFeeds).length === 0) {
      errors.push(`No feeds configured for chain: ${chain}`);
      return { feeds: [], errors, source: 'fallback' };
    }

    const symbols = Object.keys(chainFeeds);
    const priceResults = await client.getMultiplePrices(symbols);

    for (const priceFeed of priceResults) {
      const feedAddress = chainFeeds[priceFeed.symbol];
      if (feedAddress) {
        feeds.push({
          symbol: priceFeed.baseAsset ?? priceFeed.symbol.split('/')[0] ?? 'UNKNOWN',
          pair: priceFeed.symbol,
          latestPrice: priceFeed.price.toString(),
          heartbeat: 3600000,
          deviationThreshold: '0.5%',
          aggregatorAddress: feedAddress as string,
          decimals: priceFeed.decimals ?? 8,
          lastUpdate: new Date(priceFeed.timestamp).toISOString(),
          isStale: priceFeed.isStale,
          stalenessSeconds: priceFeed.stalenessSeconds ?? 0,
        });
      }
    }

    const fetchedSymbols = new Set(priceResults.map((p) => p.symbol));
    for (const symbol of symbols) {
      if (!fetchedSymbols.has(symbol)) {
        errors.push(`Failed to fetch price for ${symbol}`);
      }
    }

    return { feeds, errors, source: feeds.length > 0 ? 'on-chain' : 'fallback' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    errors.push(`Chainlink client error: ${message}`);
    return { feeds: [], errors, source: 'fallback' };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { chain, status, search, useRealData } = parseQueryParams(request);
    const targetChain = chain ?? 'ethereum';

    let feeds: Feed[];
    let dataSource: 'on-chain' | 'fallback' = 'fallback';
    let fetchErrors: string[] = [];

    if (useRealData) {
      const result = await fetchRealFeeds(targetChain);
      feeds = result.feeds;
      dataSource = result.source;
      fetchErrors = result.errors;

      if (feeds.length === 0) {
        feeds = getMockFeeds(targetChain);
        dataSource = 'fallback';
      }
    } else {
      feeds = getMockFeeds(targetChain);
      dataSource = 'fallback';
    }

    if (search) {
      const searchLower = search.toLowerCase();
      feeds = feeds.filter(
        (feed) =>
          feed.symbol.toLowerCase().includes(searchLower) ||
          feed.pair.toLowerCase().includes(searchLower),
      );
    }

    const activeCount = feeds.filter((f) => !f.isStale).length;
    const staleCount = feeds.filter((f) => f.isStale).length;

    return ok({
      feeds,
      metadata: {
        total: feeds.length,
        active: activeCount,
        stale: staleCount,
        chain: targetChain,
        filter: status,
        source: dataSource,
        lastUpdated: new Date().toISOString(),
        rpcConfigured: !!getRpcUrlForChain(targetChain),
        ...(fetchErrors.length > 0 && { errors: fetchErrors }),
        note:
          dataSource === 'on-chain'
            ? 'Real-time data from Chainlink on-chain feeds'
            : 'Fallback mock data - RPC may not be configured or chain data unavailable',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch feeds';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
