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

interface PriceUpdateQueryParams {
  dapi_name?: string;
  chain?: SupportedChain;
  timeRange?: '1h' | '24h' | '7d' | '30d';
}

interface PriceUpdateEvent {
  id: string;
  dapiName: string;
  chain: SupportedChain;
  price: number;
  timestamp: string;
  updateDelayMs: number;
  status: 'normal' | 'warning' | 'critical';
}

interface UpdateFrequencyStats {
  dapiName: string;
  updatesPerMinute: number;
  avgDelayMs: number;
}

function parseQueryParams(request: NextRequest): PriceUpdateQueryParams {
  const { searchParams } = new URL(request.url);
  return {
    dapi_name: searchParams.get('dapi_name') ?? undefined,
    chain: searchParams.get('chain') as SupportedChain | undefined,
    timeRange: (searchParams.get('timeRange') as PriceUpdateQueryParams['timeRange']) ?? '24h',
  };
}

function getTimeRangeMs(timeRange: PriceUpdateQueryParams['timeRange']): number {
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

function getDelayStatus(delayMs: number): 'normal' | 'warning' | 'critical' {
  if (delayMs < 1500) return 'normal';
  if (delayMs < 3000) return 'warning';
  return 'critical';
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
    const priceUpdateEvents: PriceUpdateEvent[] = [];
    const frequencyStats: UpdateFrequencyStats[] = [];
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
        const client = createAPI3Client(targetChain, rpcUrl);

        for (const sym of symbolsToQuery) {
          const feedId = getDataFeedId(sym);

          if (!feedId) {
            errors.push({ chain: targetChain, dapiName: sym, error: 'Feed ID not found' });
            continue;
          }

          try {
            const priceData = await client.fetchPrice(sym);

            if (priceData) {
              const eventTime = new Date(priceData.timestamp);

              if (eventTime >= cutoffTime) {
                const delayMs = (priceData.stalenessSeconds ?? 0) * 1000;
                priceUpdateEvents.push({
                  id: `${sym}-${targetChain}-${priceData.timestamp}`,
                  dapiName: sym,
                  chain: targetChain,
                  price: priceData.price,
                  timestamp: eventTime.toISOString(),
                  updateDelayMs: delayMs,
                  status: getDelayStatus(delayMs),
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

    const sortedEvents = priceUpdateEvents.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    const dapiStatsMap = new Map<string, { count: number; totalDelay: number }>();
    for (const event of sortedEvents) {
      const existing = dapiStatsMap.get(event.dapiName) || { count: 0, totalDelay: 0 };
      dapiStatsMap.set(event.dapiName, {
        count: existing.count + 1,
        totalDelay: existing.totalDelay + event.updateDelayMs,
      });
    }

    for (const [dapiName, stats] of dapiStatsMap) {
      const timeRangeMinutes = timeRangeMs / (60 * 1000);
      frequencyStats.push({
        dapiName,
        updatesPerMinute: Math.round((stats.count / timeRangeMinutes) * 10) / 10,
        avgDelayMs: Math.round(stats.totalDelay / stats.count),
      });
    }

    const result = {
      events: sortedEvents,
      frequencyStats,
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
