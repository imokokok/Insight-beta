import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';

interface PublisherHistoryPoint {
  timestamp: string;
  publisherName: string;
  trustScore: number;
  avgTrustScore: number;
  isAnomaly: boolean;
}

interface PublisherHistoryMetadata {
  total: number;
  anomalyCount: number;
  dateRange: {
    start: string;
    end: string;
  };
}

function parseQueryParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return {
    publisher: searchParams.get('publisher'),
  };
}

function getMockPublisherHistory(): PublisherHistoryPoint[] {
  const publishers = ['Binance', 'OKX', 'Bybit', 'Coinbase', 'Kraken', 'Huobi', 'Gate.io'];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const history: PublisherHistoryPoint[] = [];

  const publisherBaseScores: Record<string, number> = {
    Binance: 98,
    OKX: 95,
    Bybit: 92,
    Coinbase: 97,
    Kraken: 94,
    Huobi: 88,
    'Gate.io': 85,
  };

  for (let day = 6; day >= 0; day--) {
    const timestamp = new Date(now - day * dayMs).toISOString();

    for (const publisher of publishers) {
      const baseScore = publisherBaseScores[publisher] ?? 85;
      const variation = (Math.random() - 0.5) * 6;
      let trustScore = Math.round(baseScore + variation);
      trustScore = Math.max(0, Math.min(100, trustScore));

      const avgTrustScore = Math.round(
        publishers.reduce((sum, p) => sum + (publisherBaseScores[p] ?? 85), 0) / publishers.length,
      );

      const previousDayScore =
        day < 6 ? history[history.length - publishers.length]?.trustScore : baseScore;
      const scoreDrop = previousDayScore
        ? ((previousDayScore - trustScore) / previousDayScore) * 100
        : 0;
      const isAnomaly = scoreDrop > 10;

      history.push({
        timestamp,
        publisherName: publisher,
        trustScore,
        avgTrustScore,
        isAnomaly,
      });
    }
  }

  return history;
}

export async function GET(request: NextRequest) {
  try {
    const { publisher } = parseQueryParams(request);
    let history = getMockPublisherHistory();

    if (publisher) {
      history = history.filter((h) => h.publisherName.toLowerCase() === publisher.toLowerCase());
    }

    const anomalyCount = history.filter((h) => h.isAnomaly).length;
    const timestamps = [...new Set(history.map((h) => h.timestamp))].sort();

    const metadata: PublisherHistoryMetadata = {
      total: history.length,
      anomalyCount,
      dateRange: {
        start: timestamps[0] || new Date().toISOString(),
        end: timestamps[timestamps.length - 1] || new Date().toISOString(),
      },
    };

    return ok(
      { history, metadata },
      {
        total: history.length,
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch publisher history';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
