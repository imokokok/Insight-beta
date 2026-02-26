import type { NextRequest } from 'next/server';

import { z } from 'zod';

import { isSupportedChain, type ChainId } from '@/config/chains';
import { getRpcUrl } from '@/config/env';
import { error } from '@/lib/api/apiResponse';
import { ChainlinkClient, getDefaultRpcUrl } from '@/lib/blockchain';
import { POPULAR_FEEDS } from '@/lib/blockchain/chainlinkDataFeeds';
import { getChainlinkMockFeeds, type Feed } from '@/lib/mock/oracleMockData';

const FeedsQuerySchema = z.object({
  chain: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  search: z.string().optional(),
  real: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val !== 'false'),
});

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
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    const result = FeedsQuerySchema.safeParse(params);

    if (!result.success) {
      const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      return error({ code: 'VALIDATION_ERROR', message: issues.join('; ') }, 400);
    }

    const { chain, status, search, real: useRealData } = result.data;
    const targetChain = chain && isSupportedChain(chain) ? chain : 'ethereum';

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

    return Response.json(
      {
        success: true,
        data: {
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
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch feeds';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
