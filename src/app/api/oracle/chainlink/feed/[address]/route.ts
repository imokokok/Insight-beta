import type { NextRequest } from 'next/server';

import { getRpcUrl } from '@/config/env';
import { ok, error } from '@/lib/api/apiResponse';
import { ChainlinkClient, getDefaultRpcUrl } from '@/lib/blockchain';
import { POPULAR_FEEDS } from '@/lib/blockchain/chainlinkDataFeeds';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

import type { Address } from 'viem';

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

function findFeedByAddress(address: string): { chain: SupportedChain; symbol: string } | null {
  for (const chain of VALID_CHAINS) {
    const feeds = POPULAR_FEEDS[chain];
    if (feeds) {
      for (const [symbol, feedAddress] of Object.entries(feeds)) {
        if ((feedAddress as string).toLowerCase() === address.toLowerCase()) {
          return { chain, symbol };
        }
      }
    }
  }
  return null;
}

function getRpcUrlForChain(chain: SupportedChain): string | undefined {
  const envUrl = getRpcUrl(chain);
  if (envUrl) return envUrl;
  return getDefaultRpcUrl(chain);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await params;

    if (!address || !address.startsWith('0x')) {
      return error({ code: 'INVALID_ADDRESS', message: 'Invalid feed address' }, 400);
    }

    const feedInfo = findFeedByAddress(address);

    if (!feedInfo) {
      return error({ code: 'FEED_NOT_FOUND', message: 'Feed not found' }, 404);
    }

    const { chain, symbol } = feedInfo;
    const rpcUrl = getRpcUrlForChain(chain);

    if (!rpcUrl) {
      return error(
        { code: 'RPC_NOT_CONFIGURED', message: `No RPC URL configured for chain: ${chain}` },
        500,
      );
    }

    const client = new ChainlinkClient(chain, rpcUrl);
    const priceFeed = await client.getPriceForSymbol(symbol);
    const health = await client.checkFeedHealth(address as Address);

    if (!priceFeed) {
      return error({ code: 'PRICE_FETCH_FAILED', message: 'Failed to fetch price data' }, 500);
    }

    const [baseAsset, quoteAsset] = symbol.split('/');

    return ok({
      feed: {
        address,
        symbol,
        pair: symbol,
        baseAsset: baseAsset ?? 'UNKNOWN',
        quoteAsset: quoteAsset ?? 'USD',
        chain,
        decimals: priceFeed.decimals ?? 8,
        price: priceFeed.price,
        priceRaw: priceFeed.priceRaw?.toString() ?? '0',
        timestamp: priceFeed.timestamp,
        lastUpdate: new Date(priceFeed.timestamp).toISOString(),
        isStale: priceFeed.isStale,
        stalenessSeconds: priceFeed.stalenessSeconds,
      },
      health: {
        healthy: health.healthy,
        lastUpdate: health.lastUpdate.toISOString(),
        stalenessSeconds: health.stalenessSeconds,
        issues: health.issues,
      },
      metadata: {
        source: 'on-chain',
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch feed details';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
