import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';

interface PricePoint {
  timestamp: string;
  price: number;
}

interface VolatilityMetrics {
  hourly: number;
  daily: number;
  weekly: number;
  maxDrawdown: number;
}

interface DeviationComparison {
  protocol: string;
  price: number;
  deviationFromChainlink: number;
  deviationPercentage: number;
}

interface Anomaly {
  timestamp: string;
  type: 'spike' | 'drop';
  magnitude: number;
  description: string;
}

interface FeedQualityData {
  symbol: string;
  volatility: VolatilityMetrics;
  multiProtocolComparison: DeviationComparison[];
  recentAnomalies: Anomaly[];
  qualityScore: number;
  lastUpdated: string;
}

interface QualityQueryParams {
  symbol: string;
  chain: string;
  lookbackHours: number;
}

function parseQueryParams(request: NextRequest): QualityQueryParams {
  const { searchParams } = new URL(request.url);
  return {
    symbol: searchParams.get('symbol') || 'ETH/USD',
    chain: searchParams.get('chain') || 'ethereum',
    lookbackHours: searchParams.get('lookbackHours')
      ? parseInt(searchParams.get('lookbackHours')!, 10)
      : 24,
  };
}

function generatePriceHistory(basePrice: number, hours: number): PricePoint[] {
  const now = Date.now();
  const history: PricePoint[] = [];

  for (let i = hours; i >= 0; i--) {
    const volatility = 0.002;
    const randomFactor = 1 + (Math.random() - 0.5) * volatility * 2;
    const price = basePrice * randomFactor;

    history.push({
      timestamp: new Date(now - i * 3600000).toISOString(),
      price,
    });
  }

  return history;
}

function calculateVolatility(priceHistory: PricePoint[]): VolatilityMetrics {
  if (priceHistory.length < 2) {
    return { hourly: 0, daily: 0, weekly: 0, maxDrawdown: 0 };
  }

  const returns: number[] = [];
  for (let i = 1; i < priceHistory.length; i++) {
    const current = priceHistory[i];
    const previous = priceHistory[i - 1];
    if (current && previous && previous.price !== 0) {
      const ret = (current.price - previous.price) / previous.price;
      returns.push(ret);
    }
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  const hourlyVolatility = stdDev * 100;
  const dailyVolatility = hourlyVolatility * Math.sqrt(24);
  const weeklyVolatility = dailyVolatility * Math.sqrt(7);

  let maxDrawdown = 0;
  const firstPrice = priceHistory[0];
  let peak = firstPrice ? firstPrice.price : 0;
  for (const point of priceHistory) {
    if (point.price > peak) {
      peak = point.price;
    }
    const drawdown = peak > 0 ? (peak - point.price) / peak : 0;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return {
    hourly: parseFloat(hourlyVolatility.toFixed(4)),
    daily: parseFloat(dailyVolatility.toFixed(4)),
    weekly: parseFloat(weeklyVolatility.toFixed(4)),
    maxDrawdown: parseFloat((maxDrawdown * 100).toFixed(2)),
  };
}

function generateMultiProtocolComparison(basePrice: number): DeviationComparison[] {
  const protocols = [
    { name: 'Chainlink', deviationBase: 0 },
    { name: 'Pyth', deviationBase: 0.01 },
    { name: 'Band', deviationBase: 0.02 },
    { name: 'API3', deviationBase: 0.015 },
  ];

  return protocols.map((p) => {
    const deviation = p.deviationBase + (Math.random() - 0.5) * 0.01;
    const price = basePrice * (1 + deviation);

    return {
      protocol: p.name,
      price: parseFloat(price.toFixed(4)),
      deviationFromChainlink:
        p.name === 'Chainlink' ? 0 : parseFloat((price - basePrice).toFixed(4)),
      deviationPercentage: p.name === 'Chainlink' ? 0 : parseFloat((deviation * 100).toFixed(4)),
    };
  });
}

function detectAnomalies(priceHistory: PricePoint[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  for (let i = 2; i < priceHistory.length; i++) {
    const prevPoint = priceHistory[i - 2];
    const currPoint = priceHistory[i];
    if (!prevPoint || !currPoint || prevPoint.price === 0) continue;

    const prevPrice = prevPoint.price;
    const currPrice = currPoint.price;
    const change = (currPrice - prevPrice) / prevPrice;

    if (Math.abs(change) > 0.005 && Math.random() > 0.9) {
      const type = change > 0 ? 'spike' : 'drop';
      anomalies.push({
        timestamp: currPoint.timestamp,
        type,
        magnitude: parseFloat((Math.abs(change) * 100).toFixed(3)),
        description: `${type === 'spike' ? '大幅上涨' : '大幅下跌'} ${Math.abs(change * 100).toFixed(2)}%`,
      });
    }
  }

  return anomalies.slice(-5).reverse();
}

function calculateQualityScore(volatility: VolatilityMetrics, anomalies: Anomaly[]): number {
  let score = 100;

  if (volatility.daily > 5) score -= 10;
  else if (volatility.daily > 2) score -= 5;

  if (volatility.maxDrawdown > 10) score -= 15;
  else if (volatility.maxDrawdown > 5) score -= 8;

  score -= anomalies.length * 5;

  return Math.max(0, Math.min(100, score));
}

const basePrices: Record<string, number> = {
  'ETH/USD': 3500,
  'BTC/USD': 68000,
  'LINK/USD': 18.5,
  'USDC/USD': 1,
  'USDT/USD': 1,
  'DAI/USD': 1,
};

export async function GET(request: NextRequest) {
  try {
    const { symbol, chain, lookbackHours } = parseQueryParams(request);

    const basePrice = symbol ? (basePrices[symbol] ?? 3500) : 3500;
    const lookback = lookbackHours ?? 24;
    const priceHistory = generatePriceHistory(basePrice, lookback);
    const volatility = calculateVolatility(priceHistory);
    const multiProtocolComparison = generateMultiProtocolComparison(basePrice);
    const recentAnomalies = detectAnomalies(priceHistory);
    const qualityScore = calculateQualityScore(volatility, recentAnomalies);

    const qualityData: FeedQualityData = {
      symbol,
      volatility,
      multiProtocolComparison,
      recentAnomalies,
      qualityScore,
      lastUpdated: new Date().toISOString(),
    };

    return ok({
      qualityData,
      metadata: {
        chain,
        lookbackHours,
        source: 'enhanced-analysis',
        isMock: true,
        lastUpdated: new Date().toISOString(),
        note: 'Enhanced quality analysis with volatility, multi-protocol comparison, and anomaly detection',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch feed quality data';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
