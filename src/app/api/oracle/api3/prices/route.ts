import type { NextRequest } from 'next/server';

import { getRpcUrl } from '@/config/env';
import { error, ok } from '@/lib/api/apiResponse';
import {
  createAPI3Client,
  getAvailableAPI3Symbols,
  getSupportedAPI3Chains,
} from '@/lib/blockchain/api3Oracle';
import type { SupportedChain, UnifiedPriceFeed } from '@/types/unifiedOracleTypes';

interface PriceQueryParams {
  symbol?: string;
  chain?: SupportedChain;
}

function parseQueryParams(request: NextRequest): PriceQueryParams {
  const { searchParams } = new URL(request.url);
  return {
    symbol: searchParams.get('symbol') ?? undefined,
    chain: searchParams.get('chain') as SupportedChain | undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { symbol, chain } = parseQueryParams(request);
    const supportedChains = getSupportedAPI3Chains();

    if (chain && !supportedChains.includes(chain)) {
      return error(
        { code: 'INVALID_CHAIN', message: `Chain "${chain}" is not supported by API3` },
        400,
      );
    }

    const chainsToQuery = chain ? [chain] : supportedChains.slice(0, 5);
    const availableSymbols = getAvailableAPI3Symbols();

    if (symbol && !availableSymbols.includes(symbol)) {
      return error(
        { code: 'INVALID_SYMBOL', message: `Symbol "${symbol}" is not supported by API3` },
        400,
      );
    }

    const symbolsToQuery = symbol ? [symbol] : availableSymbols;
    const allPrices: UnifiedPriceFeed[] = [];
    const errors: Array<{ chain: string; error: string }> = [];

    for (const targetChain of chainsToQuery) {
      const rpcUrl = getRpcUrl(targetChain);
      if (!rpcUrl) {
        errors.push({ chain: targetChain, error: 'RPC URL not configured' });
        continue;
      }

      try {
        const client = createAPI3Client(targetChain, rpcUrl, { oevEnabled: true });
        const prices = await client.getMultiplePrices(symbolsToQuery);
        allPrices.push(...prices);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push({ chain: targetChain, error: message });
      }
    }

    const result = {
      prices: allPrices.map((p) => ({
        symbol: p.symbol,
        chain: p.chain,
        price: p.price,
        timestamp: p.timestamp,
        isStale: p.isStale,
        stalenessSeconds: p.stalenessSeconds,
        confidence: p.confidence,
      })),
      metadata: {
        totalFeeds: allPrices.length,
        availableSymbols,
        supportedChains,
        queriedChains: chainsToQuery,
        queriedSymbols: symbolsToQuery,
      },
    };

    if (errors.length > 0) {
      return ok({ ...result, errors }, { total: allPrices.length });
    }

    return ok(result, { total: allPrices.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
