import type { NextRequest } from 'next/server';

import { getRpcUrl } from '@/config/env';
import { error, ok } from '@/lib/api/apiResponse';
import {
  createAPI3Client,
  getSupportedAPI3Chains,
  API3_FEED_IDS,
  getDataFeedId,
} from '@/lib/blockchain/api3Oracle';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

interface OevQueryParams {
  dapi_name?: string;
  chain?: SupportedChain;
  timeRange?: '1h' | '24h' | '7d' | '30d';
}

interface OevEvent {
  id: string;
  dapiName: string;
  chain: SupportedChain;
  feedId: string;
  value: string;
  timestamp: string;
  oevAmount: string;
  blockNumber?: number;
}

function parseQueryParams(request: NextRequest): OevQueryParams {
  const { searchParams } = new URL(request.url);
  return {
    dapi_name: searchParams.get('dapi_name') ?? undefined,
    chain: searchParams.get('chain') as SupportedChain | undefined,
    timeRange: (searchParams.get('timeRange') as OevQueryParams['timeRange']) ?? '24h',
  };
}

function getTimeRangeMs(timeRange: OevQueryParams['timeRange']): number {
  switch (timeRange) {
    case '1h':
      return 60 * 60 * 1000;
    case '24h':
      return 24 * 60 * 60 * 1000;
    case '7d':
      return 7 * 24 * 60 * 60 * 1000;
    case '30d':
      return 30 * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { dapi_name, chain, timeRange } = parseQueryParams(request);
    const supportedChains = getSupportedAPI3Chains();

    if (chain && !supportedChains.includes(chain)) {
      return error(
        { code: 'INVALID_CHAIN', message: `Chain "${chain}" is not supported by API3` },
        400,
      );
    }

    const availableSymbols = Object.keys(API3_FEED_IDS);

    if (dapi_name && !availableSymbols.includes(dapi_name)) {
      return error(
        { code: 'INVALID_DAPI', message: `dAPI "${dapi_name}" is not supported by API3` },
        400,
      );
    }

    const chainsToQuery = chain ? [chain] : supportedChains.slice(0, 3);
    const symbolsToQuery = dapi_name ? [dapi_name] : availableSymbols.slice(0, 10);
    const oevEvents: OevEvent[] = [];
    const errors: Array<{ chain: string; dapiName: string; error: string }> = [];
    const timeRangeMs = getTimeRangeMs(timeRange);
    const cutoffTime = new Date(Date.now() - timeRangeMs);

    for (const targetChain of chainsToQuery) {
      const rpcUrl = getRpcUrl(targetChain);

      if (!rpcUrl) {
        for (const sym of symbolsToQuery) {
          errors.push({ chain: targetChain, dapiName: sym, error: 'RPC URL not configured' });
        }
        continue;
      }

      try {
        const client = createAPI3Client(targetChain, rpcUrl, { oevEnabled: true });

        for (const sym of symbolsToQuery) {
          const feedId = getDataFeedId(sym);

          if (!feedId) {
            errors.push({ chain: targetChain, dapiName: sym, error: 'Feed ID not found' });
            continue;
          }

          try {
            const oevData = await client.getOEVData(feedId);

            if (oevData) {
              const eventTime = new Date(Number(oevData.timestamp) * 1000);

              if (eventTime >= cutoffTime) {
                oevEvents.push({
                  id: oevData.updateId,
                  dapiName: sym,
                  chain: targetChain,
                  feedId: oevData.dataFeedId,
                  value: oevData.value.toString(),
                  timestamp: eventTime.toISOString(),
                  oevAmount: oevData.oevAmount.toString(),
                });
              }
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            errors.push({ chain: targetChain, dapiName: sym, error: message });
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        for (const sym of symbolsToQuery) {
          errors.push({ chain: targetChain, dapiName: sym, error: message });
        }
      }
    }

    const sortedEvents = oevEvents.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    const result = {
      events: sortedEvents,
      metadata: {
        total: sortedEvents.length,
        timeRange,
        cutoffTime: cutoffTime.toISOString(),
        queriedChains: chainsToQuery,
        queriedDapis: symbolsToQuery,
        supportedChains,
      },
    };

    if (errors.length > 0) {
      return ok({ ...result, errors }, { total: sortedEvents.length });
    }

    return ok(result, { total: sortedEvents.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
