import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';

interface ConfidenceHistoryPoint {
  timestamp: string;
  symbol: string;
  confidence: number;
  avgConfidence: number;
  isAnomaly: boolean;
}

interface ConfidenceHistoryMetadata {
  total: number;
  timeRange: string;
  anomalyCount: number;
}

function parseQueryParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return {
    symbol: searchParams.get('symbol'),
  };
}

function getMockConfidenceHistory(): ConfidenceHistoryPoint[] {
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;
  const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'BNB/USD', 'DOGE/USD'];

  const history: ConfidenceHistoryPoint[] = [];

  for (const symbol of symbols) {
    const baseConfidence =
      symbol === 'BTC/USD' ? 0.85 : symbol === 'ETH/USD' ? 0.42 : Math.random() * 0.5 + 0.1;

    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now - i * hourInMs).toISOString();
      const variance = (Math.random() - 0.5) * 0.2;
      let confidence = Math.max(0.01, Math.min(0.99, baseConfidence + variance));

      if (i === 5 && symbol === 'BTC/USD') {
        confidence = baseConfidence * 2.5;
      }
      if (i === 12 && symbol === 'ETH/USD') {
        confidence = baseConfidence * 2.2;
      }

      const historicalAvg = baseConfidence;
      const isAnomaly = confidence > historicalAvg * 2;

      history.push({
        timestamp,
        symbol,
        confidence: Math.round(confidence * 10000) / 10000,
        avgConfidence: Math.round(historicalAvg * 10000) / 10000,
        isAnomaly,
      });
    }
  }

  return history;
}

export async function GET(request: NextRequest) {
  try {
    const { symbol } = parseQueryParams(request);
    let history = getMockConfidenceHistory();

    if (symbol) {
      history = history.filter((h) => h.symbol.toLowerCase().includes(symbol.toLowerCase()));
    }

    const anomalyCount = history.filter((h) => h.isAnomaly).length;

    const metadata: ConfidenceHistoryMetadata = {
      total: history.length,
      timeRange: '24h',
      anomalyCount,
    };

    return ok({ history, metadata }, { total: history.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch confidence history';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
