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
  const basePrice = 3500;

  for (let i = 0; i < limit; i++) {
    const roundNum = 18446744073709552000 - i;
    const volatility = 0.001;
    const priceVariation = 1 + (Math.random() - 0.5) * volatility * 2;
    const price = basePrice * priceVariation;
    
    const nodeCountDistribution = [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31];
    const participatingNodes = nodeCountDistribution[Math.floor(Math.random() * nodeCountDistribution.length)];
    
    const roundInterval = i < 5 ? 180000 : 360000;
    
    rounds.push({
      roundId: `0x${roundNum.toString(16)}`,
      participatingNodes,
      aggregationThreshold: '2/3',
      answer: price.toFixed(8),
      startedAt: new Date(now - i * roundInterval).toISOString(),
      updatedAt: new Date(now - i * roundInterval + 5000 + Math.floor(Math.random() * 15000)).toISOString(),
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
