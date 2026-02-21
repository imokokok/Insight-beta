import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';

interface PriceHistoryPoint {
  timestamp: string;
  price: number;
  volume?: number;
  sourceCount: number;
  deviation: number;
  isValid: boolean;
}

interface AggregationStatus {
  totalSources: number;
  activeSources: number;
  lastUpdate: string;
  avgResponseTime: number;
  status: 'healthy' | 'degraded' | 'error';
}

interface PriceHistoryResponse {
  symbol: string;
  chain: string;
  timeRange: string;
  priceHistory: PriceHistoryPoint[];
  aggregationStatus: AggregationStatus;
}

const TIME_RANGE_CONFIG = {
  '1h': { intervalMs: 60000, points: 60 },
  '24h': { intervalMs: 900000, points: 96 },
  '7d': { intervalMs: 3600000, points: 168 },
};

const SYMBOL_PRICES: Record<string, { basePrice: number; volatility: number }> = {
  'BTC/USD': { basePrice: 67500, volatility: 0.015 },
  'ETH/USD': { basePrice: 3450, volatility: 0.018 },
  'ATOM/USD': { basePrice: 8.5, volatility: 0.025 },
  'OSMO/USD': { basePrice: 0.85, volatility: 0.03 },
  'USDT/USD': { basePrice: 1.0, volatility: 0.001 },
  'USDC/USD': { basePrice: 1.0, volatility: 0.001 },
  'BNB/USD': { basePrice: 580, volatility: 0.02 },
  'SOL/USD': { basePrice: 145, volatility: 0.025 },
  'MATIC/USD': { basePrice: 0.55, volatility: 0.028 },
  'AVAX/USD': { basePrice: 35, volatility: 0.022 },
};

function generateMockPriceHistory(
  symbol: string,
  timeRange: '1h' | '24h' | '7d',
): PriceHistoryPoint[] {
  const config = TIME_RANGE_CONFIG[timeRange];
  const symbolData = SYMBOL_PRICES[symbol] ?? { basePrice: 100, volatility: 0.02 };

  const now = Date.now();
  const history: PriceHistoryPoint[] = [];

  let currentPrice = symbolData.basePrice;
  const volatility = symbolData.volatility;

  for (let i = config.points; i >= 0; i--) {
    const timestamp = new Date(now - i * config.intervalMs).toISOString();

    const change = (Math.random() - 0.5) * 2 * volatility * currentPrice;
    currentPrice = Math.max(currentPrice * 0.9, currentPrice + change);

    const deviation = (Math.random() - 0.5) * 0.02;
    const sourceCount = Math.floor(Math.random() * 5) + 8;
    const isValid = Math.abs(deviation) < 0.015;

    history.push({
      timestamp,
      price: Number(currentPrice.toFixed(6)),
      volume: Math.random() * 1000000 + 100000,
      sourceCount,
      deviation,
      isValid,
    });
  }

  return history;
}

function generateAggregationStatus(_symbol: string): AggregationStatus {
  const totalSources = Math.floor(Math.random() * 5) + 10;
  const activeSources = totalSources - Math.floor(Math.random() * 2);

  return {
    totalSources,
    activeSources,
    lastUpdate: new Date().toISOString(),
    avgResponseTime: Math.floor(Math.random() * 200) + 50,
    status: activeSources / totalSources >= 0.8 ? 'healthy' : 'degraded',
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get('symbols');
    const chain = searchParams.get('chain') ?? 'cosmos';
    const timeRange = (searchParams.get('timeRange') as '1h' | '24h' | '7d') ?? '24h';

    const validTimeRanges = ['1h', '24h', '7d'];
    if (!validTimeRanges.includes(timeRange)) {
      return error(
        { code: 'INVALID_TIME_RANGE', message: `Valid time ranges: ${validTimeRanges.join(', ')}` },
        400,
      );
    }

    const symbolList = symbols
      ? symbols.split(',').map((s) => s.trim().toUpperCase())
      : ['BTC/USD'];
    const validSymbols = Object.keys(SYMBOL_PRICES);
    const filteredSymbols = symbolList.filter((s) => validSymbols.includes(s));

    if (filteredSymbols.length === 0) {
      return error(
        { code: 'INVALID_SYMBOL', message: `Valid symbols: ${validSymbols.join(', ')}` },
        400,
      );
    }

    const priceData: Record<string, PriceHistoryResponse> = {};

    for (const symbol of filteredSymbols) {
      const priceHistory = generateMockPriceHistory(symbol, timeRange);
      const aggregationStatus = generateAggregationStatus(symbol);

      priceData[symbol] = {
        symbol,
        chain,
        timeRange,
        priceHistory,
        aggregationStatus,
      };
    }

    return ok({
      count: filteredSymbols.length,
      data: priceData,
      timeRange,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch price history';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
