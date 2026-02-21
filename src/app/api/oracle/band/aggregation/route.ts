import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';
import { createBandClient, BAND_CONTRACT_ADDRESSES } from '@/lib/blockchain/bandOracle';
import { getDefaultRpcUrl } from '@/lib/blockchain/chainConfig';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

interface AggregationQueryParams {
  symbol?: string;
  chain?: SupportedChain;
}

function parseQueryParams(request: NextRequest): AggregationQueryParams {
  const { searchParams } = new URL(request.url);
  return {
    symbol: searchParams.get('symbol') ?? undefined,
    chain: searchParams.get('chain') as SupportedChain | undefined,
  };
}

function isValidChain(chain: string | undefined): chain is SupportedChain {
  if (!chain) return false;
  return Object.keys(BAND_CONTRACT_ADDRESSES).includes(chain);
}

export async function GET(request: NextRequest) {
  try {
    const { symbol, chain } = parseQueryParams(request);

    if (!symbol) {
      return error({ code: 'MISSING_SYMBOL', message: 'Symbol parameter is required' }, 400);
    }

    const targetChain: SupportedChain = chain && isValidChain(chain) ? chain : 'ethereum';

    const contractAddress = BAND_CONTRACT_ADDRESSES[targetChain];
    if (!contractAddress) {
      return error(
        {
          code: 'UNSUPPORTED_CHAIN',
          message: `Band Protocol not supported on chain: ${targetChain}`,
        },
        400,
      );
    }

    const rpcUrl = getDefaultRpcUrl(targetChain);
    const client = createBandClient(targetChain, rpcUrl, { enableCosmosSupport: true });

    const result = await client.validatePriceAggregation(symbol);

    return ok({
      symbol: result.symbol,
      chain: targetChain,
      data: {
        symbol: result.symbol,
        avgPrice: result.avgPrice,
        minPrice: result.minPrice,
        maxPrice: result.maxPrice,
        priceCount: result.priceCount,
        deviation: result.deviation,
        isValid: result.isValid,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to validate price aggregation';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
