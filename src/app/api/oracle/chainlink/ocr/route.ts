import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';

interface OcrRound {
  roundId: string;
  participatingNodes: number;
  aggregationThreshold: string;
  answer: string;
  startedAt: string;
  updatedAt: string;
}

interface OcrQueryParams {
  limit?: number;
  feedId?: string;
  chain?: string;
}

function parseQueryParams(request: NextRequest): OcrQueryParams {
  const { searchParams } = new URL(request.url);
  return {
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20,
    feedId: searchParams.get('feedId') ?? undefined,
    chain: searchParams.get('chain') ?? undefined,
  };
}

function getMockRounds(limit: number): OcrRound[] {
  const now = Date.now();
  const rounds: OcrRound[] = [];

  for (let i = 0; i < limit; i++) {
    const roundNum = 18446744073709552000 - i;
    rounds.push({
      roundId: `0x${roundNum.toString(16)}`,
      participatingNodes: Math.floor(Math.random() * 15) + 17,
      aggregationThreshold: '2/3',
      answer: (Math.random() * 50000 + 1500).toFixed(8),
      startedAt: new Date(now - i * 60000).toISOString(),
      updatedAt: new Date(now - i * 60000 + Math.floor(Math.random() * 30000)).toISOString(),
    });
  }

  return rounds;
}

export async function GET(request: NextRequest) {
  try {
    const { limit, feedId, chain } = parseQueryParams(request);

    const rounds = getMockRounds(limit ?? 20);
    const latestRound = rounds[0]?.roundId ?? '0x0';

    return ok({
      rounds,
      metadata: {
        total: rounds.length,
        latestRound,
        feedId: feedId ?? 'all',
        chain: chain ?? 'ethereum',
        source: 'mock',
        lastUpdated: new Date().toISOString(),
        note: 'Mock data - OCR round data requires Chainlink OCR contract integration',
        dataAvailability: {
          realDataAvailable: false,
          reason:
            'OCR round history requires direct contract queries to Chainlink OCR aggregators. ' +
            'This data is not available through standard Chainlink Data Feeds interface. ' +
            'Consider using the feeds API for current price data, or implement OCR-specific ' +
            'contract queries for historical round data.',
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch OCR rounds';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
