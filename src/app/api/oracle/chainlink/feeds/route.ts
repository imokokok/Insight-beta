import type { NextRequest } from 'next/server';

import { isSupportedChain, type ChainId } from '@/config/chains';
import { getRpcUrl } from '@/config/env';
import { ok, error } from '@/lib/api/apiResponse';
import { ChainlinkClient, getDefaultRpcUrl } from '@/lib/blockchain';
import { POPULAR_FEEDS } from '@/lib/blockchain/chainlinkDataFeeds';
import { getChainlinkMockFeeds, type Feed } from '@/lib/mock/oracleMockData';

interface FeedsQueryParams {
  chain?: ChainId;
  status?: 'active' | 'inactive';
  search?: string;
  useRealData?: boolean;
}

function parseQueryParams(request: NextRequest): FeedsQueryParams {
  const { searchParams } = new URL(request.url);
  const chainParam = searchParams.get('chain');

  let chain: ChainId | undefined;
  if (chainParam && isSupportedChain(chainParam)) {
    chain = chainParam;
  }

  return {
    chain,
    status: (searchParams.get('status') as FeedsQueryParams['status']) ?? 'active',
    search: searchParams.get('search') ?? undefined,
    useRealData: searchParams.get('real') !== 'false',
  };
}

function getRpcUrlForChain(chain: ChainId): string | undefined {
  const envUrl = getRpcUrl(chain);
  if (envUrl) return envUrl;
  return getDefaultRpcUrl(chain);
}

async function fetchRealFeeds(chain: ChainId): Promise<{
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
        feeds = getChainlinkMockFeeds(targetChain);
        dataSource = 'fallback';
      }
    } else {
      feeds = getChainlinkMockFeeds(targetChain);
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
