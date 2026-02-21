import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';

interface OraclePrice {
  symbol: string;
  price: number;
  timestamp: string;
  sourceCount: number;
}

interface OraclePriceData {
  oracle: string;
  prices: OraclePrice[];
}

interface PriceComparison {
  symbol: string;
  prices: {
    band: number;
    chainlink: number;
    pyth: number;
  };
  deviations: {
    bandVsChainlink: number;
    bandVsPyth: number;
    chainlinkVsPyth: number;
  };
  avgPrice: number;
}

interface DeviationHistoryPoint {
  timestamp: string;
  bandVsChainlink: number;
  bandVsPyth: number;
}

interface ComparisonResponse {
  summary: {
    totalSymbols: number;
    avgDeviation: number;
    maxDeviation: number;
    symbolsInSync: number;
    symbolsOutOfSync: number;
  };
  prices: OraclePriceData[];
  comparison: PriceComparison[];
  deviationHistory: DeviationHistoryPoint[];
}

const SYMBOLS = [
  'BTC/USD',
  'ETH/USD',
  'ATOM/USD',
  'OSMO/USD',
  'BNB/USD',
  'SOL/USD',
  'MATIC/USD',
  'AVAX/USD',
];

const BASE_PRICES: Record<string, number> = {
  'BTC/USD': 67500,
  'ETH/USD': 3450,
  'ATOM/USD': 8.5,
  'OSMO/USD': 0.85,
  'BNB/USD': 580,
  'SOL/USD': 145,
  'MATIC/USD': 0.55,
  'AVAX/USD': 35,
};

function generateOraclePrices(oracle: string): OraclePrice[] {
  return SYMBOLS.map((symbol) => {
    const basePrice = BASE_PRICES[symbol] ?? 100;
    const variance = (Math.random() - 0.5) * 0.02;
    const oracleOffset = oracle === 'Band' ? 0 : (Math.random() - 0.5) * 0.01;

    return {
      symbol,
      price: Number((basePrice * (1 + variance + oracleOffset)).toFixed(2)),
      timestamp: new Date().toISOString(),
      sourceCount: Math.floor(Math.random() * 10) + 5,
    };
  });
}

function generateDeviationHistory(): DeviationHistoryPoint[] {
  const points: DeviationHistoryPoint[] = [];
  const now = Date.now();

  for (let i = 24; i >= 0; i--) {
    points.push({
      timestamp: new Date(now - i * 3600000).toISOString(),
      bandVsChainlink: Number((Math.random() * 2 - 1).toFixed(3)),
      bandVsPyth: Number((Math.random() * 2 - 1).toFixed(3)),
    });
  }

  return points;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get('symbols');

    const symbolList = symbols ? symbols.split(',').map((s) => s.trim().toUpperCase()) : SYMBOLS;

    const bandPrices = generateOraclePrices('Band');
    const chainlinkPrices = generateOraclePrices('Chainlink');
    const pythPrices = generateOraclePrices('Pyth');

    const comparison: PriceComparison[] = [];
    let totalDeviation = 0;
    let maxDeviation = 0;
    let symbolsInSync = 0;

    for (const symbol of symbolList) {
      const band = bandPrices.find((p) => p.symbol === symbol);
      const chainlink = chainlinkPrices.find((p) => p.symbol === symbol);
      const pyth = pythPrices.find((p) => p.symbol === symbol);

      if (!band || !chainlink || !pyth) continue;

      const bandVsChainlink = Number(
        (((band.price - chainlink.price) / chainlink.price) * 100).toFixed(3),
      );
      const bandVsPyth = Number((((band.price - pyth.price) / pyth.price) * 100).toFixed(3));
      const chainlinkVsPyth = Number(
        (((chainlink.price - pyth.price) / pyth.price) * 100).toFixed(3),
      );

      const maxDev = Math.max(Math.abs(bandVsChainlink), Math.abs(bandVsPyth));
      totalDeviation += maxDev;
      if (maxDev > maxDeviation) maxDeviation = maxDev;
      if (maxDev < 0.5) symbolsInSync++;

      const avgPrice = (band.price + chainlink.price + pyth.price) / 3;

      comparison.push({
        symbol,
        prices: {
          band: band.price,
          chainlink: chainlink.price,
          pyth: pyth.price,
        },
        deviations: {
          bandVsChainlink,
          bandVsPyth,
          chainlinkVsPyth,
        },
        avgPrice,
      });
    }

    const deviationHistory = generateDeviationHistory();

    const response: ComparisonResponse = {
      summary: {
        totalSymbols: symbolList.length,
        avgDeviation: Number((totalDeviation / symbolList.length).toFixed(3)),
        maxDeviation: Number(maxDeviation.toFixed(3)),
        symbolsInSync,
        symbolsOutOfSync: symbolList.length - symbolsInSync,
      },
      prices: [
        { oracle: 'Band', prices: bandPrices },
        { oracle: 'Chainlink', prices: chainlinkPrices },
        { oracle: 'Pyth', prices: pythPrices },
      ],
      comparison,
      deviationHistory,
    };

    return ok(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch comparison data';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
