import type { NextRequest } from 'next/server';

import { getRpcUrl } from '@/config/env';
import { error, ok } from '@/lib/api/apiResponse';
import {
  createAPI3Client,
  getSupportedAPI3Chains,
  API3_FEED_IDS,
  API3_CONTRACT_ADDRESSES,
  getDataFeedId,
} from '@/lib/blockchain/api3Oracle';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

interface DapiQueryParams {
  chain?: SupportedChain;
  symbol?: string;
}

interface DapiConfig {
  symbol: string;
  feedId: `0x${string}`;
  chain: SupportedChain;
  contractAddress: `0x${string}`;
  dataFeedAddress: `0x${string}` | null;
  decimals: number;
  status: 'active' | 'inactive' | 'unknown';
}

function parseQueryParams(request: NextRequest): DapiQueryParams {
  const { searchParams } = new URL(request.url);
  return {
    chain: searchParams.get('chain') as SupportedChain | undefined,
    symbol: searchParams.get('symbol') ?? undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { chain, symbol } = parseQueryParams(request);
    const supportedChains = getSupportedAPI3Chains();

    if (chain && !supportedChains.includes(chain)) {
      return error(
        { code: 'INVALID_CHAIN', message: `Chain "${chain}" is not supported by API3` },
        400,
      );
    }

    const availableSymbols = Object.keys(API3_FEED_IDS);

    if (symbol && !availableSymbols.includes(symbol)) {
      return error(
        { code: 'INVALID_SYMBOL', message: `Symbol "${symbol}" is not supported by API3` },
        400,
      );
    }

    const chainsToQuery = chain ? [chain] : supportedChains.slice(0, 5);
    const symbolsToQuery = symbol ? [symbol] : availableSymbols;
    const dapiConfigs: DapiConfig[] = [];
    const errors: Array<{ chain: string; symbol: string; error: string }> = [];

    for (const targetChain of chainsToQuery) {
      const rpcUrl = getRpcUrl(targetChain);
      const contractAddress = API3_CONTRACT_ADDRESSES[targetChain];

      if (!rpcUrl || !contractAddress) {
        for (const sym of symbolsToQuery) {
          errors.push({
            chain: targetChain,
            symbol: sym,
            error: 'RPC URL or contract address not configured',
          });
        }
        continue;
      }

      try {
        const client = createAPI3Client(targetChain, rpcUrl, { oevEnabled: true });

        for (const sym of symbolsToQuery) {
          const feedId = getDataFeedId(sym);

          if (!feedId) {
            errors.push({
              chain: targetChain,
              symbol: sym,
              error: 'Feed ID not found',
            });
            continue;
          }

          try {
            const dataFeedAddress = await client.getDataFeedAddress(feedId);
            const health = await client.checkFeedHealth(feedId);

            dapiConfigs.push({
              symbol: sym,
              feedId,
              chain: targetChain,
              contractAddress,
              dataFeedAddress,
              decimals: 18,
              status: health.healthy ? 'active' : 'inactive',
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            errors.push({ chain: targetChain, symbol: sym, error: message });

            dapiConfigs.push({
              symbol: sym,
              feedId,
              chain: targetChain,
              contractAddress,
              dataFeedAddress: null,
              decimals: 18,
              status: 'unknown',
            });
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        for (const sym of symbolsToQuery) {
          errors.push({ chain: targetChain, symbol: sym, error: message });
        }
      }
    }

    const result = {
      dapis: dapiConfigs,
      metadata: {
        total: dapiConfigs.length,
        active: dapiConfigs.filter((d) => d.status === 'active').length,
        inactive: dapiConfigs.filter((d) => d.status === 'inactive').length,
        unknown: dapiConfigs.filter((d) => d.status === 'unknown').length,
        supportedChains,
        availableSymbols,
      },
    };

    if (errors.length > 0) {
      return ok({ ...result, errors }, { total: dapiConfigs.length });
    }

    return ok(result, { total: dapiConfigs.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
