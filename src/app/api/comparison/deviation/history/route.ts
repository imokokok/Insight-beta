import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';
import { logger } from '@/shared/logger';
import type {
  PriceDeviationHistory,
  PriceDeviationTimeline,
  PriceDeviationHistoryPoint,
  PriceDeviationEvent,
} from '@/types/oracle/comparison';
import type { OracleProtocol } from '@/types/oracle/protocol';

export async function GET(request: NextRequest) {
  const requestStartTime = performance.now();

  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const protocol = searchParams.get('protocol');
    const timeRange = searchParams.get('timeRange') || '24h';
    const type = searchParams.get('type') || 'history';

    if (!symbol || !protocol) {
      return error({ code: 'missing_params', message: 'Symbol and protocol are required' }, 400);
    }

    if (type === 'history') {
      const historyData = await fetchDeviationHistory(symbol, protocol, timeRange);
      const requestTime = performance.now() - requestStartTime;

      logger.info('Deviation history API request completed', {
        performance: { totalRequestTimeMs: Math.round(requestTime) },
        requestParams: { symbol, protocol, timeRange },
        responseStats: {
          dataPoints: historyData.data.length,
          criticalCount: historyData.summary.criticalCount,
        },
      });

      return ok(historyData);
    } else if (type === 'timeline') {
      const timelineData = await fetchDeviationTimeline(symbol, protocol, timeRange);
      const requestTime = performance.now() - requestStartTime;

      logger.info('Deviation timeline API request completed', {
        performance: { totalRequestTimeMs: Math.round(requestTime) },
        requestParams: { symbol, protocol, timeRange },
        responseStats: {
          totalEvents: timelineData.totalEvents,
        },
      });

      return ok(timelineData);
    }

    return error({ code: 'invalid_type', message: 'Type must be history or timeline' }, 400);
  } catch (err) {
    const requestTime = performance.now() - requestStartTime;
    logger.error('Deviation history API request failed', {
      error: err,
      performance: { totalRequestTimeMs: Math.round(requestTime) },
    });

    return error(
      { code: 'deviation_history_error', message: 'Failed to fetch deviation history' },
      500,
    );
  }
}

async function fetchDeviationHistory(
  symbol: string,
  protocol: string,
  timeRange: string,
): Promise<PriceDeviationHistory> {
  const now = new Date();
  const dataPoints = generateHistoricalDataPoints(symbol, protocol, timeRange, now);

  const deviations = dataPoints.map((d) => Math.abs(d.deviationPercent));
  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  const maxDeviation = Math.max(...deviations);
  const minDeviation = Math.min(...deviations);
  const deviationCount = dataPoints.filter((d) => Math.abs(d.deviationPercent) > 0.001).length;
  const criticalCount = dataPoints.filter((d) => d.deviationLevel === 'critical').length;

  return {
    symbol,
    protocol: protocol as OracleProtocol,
    data: dataPoints,
    summary: {
      avgDeviation,
      maxDeviation,
      minDeviation,
      deviationCount,
      criticalCount,
      avgDuration: 15,
      maxDuration: 120,
      minDuration: 5,
    },
  };
}

async function fetchDeviationTimeline(
  symbol: string,
  protocol: string,
  timeRange: string,
): Promise<PriceDeviationTimeline> {
  const now = new Date();
  const events = generateDeviationEvents(symbol, protocol, timeRange, now);

  return {
    events,
    totalEvents: events.length,
    lastUpdated: now.toISOString(),
  };
}

function generateHistoricalDataPoints(
  symbol: string,
  protocol: string,
  timeRange: string,
  now: Date,
): PriceDeviationHistoryPoint[] {
  const points: PriceDeviationHistoryPoint[] = [];
  let numPoints = 24;
  let intervalMs = 3600000;

  if (timeRange === '7d') {
    numPoints = 168;
    intervalMs = 3600000;
  } else if (timeRange === '30d') {
    numPoints = 720;
    intervalMs = 3600000;
  }

  const basePrice = getBasePrice(symbol);

  for (let i = 0; i < numPoints; i++) {
    const timestamp = new Date(now.getTime() - i * intervalMs);
    const deviation = generateRealisticDeviation(i, numPoints);
    const deviationPercent = deviation / basePrice;
    const deviationLevel = getDeviationLevel(deviationPercent);

    points.push({
      timestamp: timestamp.toISOString(),
      protocol: protocol as OracleProtocol,
      symbol,
      deviation,
      deviationPercent,
      price: basePrice + deviation,
      referencePrice: basePrice,
      deviationLevel,
    });
  }

  return points.reverse();
}

function generateDeviationEvents(
  symbol: string,
  protocol: string,
  timeRange: string,
  now: Date,
): PriceDeviationEvent[] {
  const events: PriceDeviationEvent[] = [];
  const numEvents = Math.floor(Math.random() * 5) + 3;
  let timeRangeMs = 86400000;

  if (timeRange === '7d') {
    timeRangeMs = 604800000;
  } else if (timeRange === '30d') {
    timeRangeMs = 2592000000;
  }

  const basePrice = getBasePrice(symbol);

  for (let i = 0; i < numEvents; i++) {
    const timestamp = new Date(now.getTime() - Math.random() * timeRangeMs);
    const deviation = generateRealisticDeviation(i, numEvents) * 1.5;
    const deviationPercent = deviation / basePrice;
    const deviationLevel = getDeviationLevel(deviationPercent);
    const duration = Math.floor(Math.random() * 120) + 5;
    const resolved = Math.random() > 0.2;

    events.push({
      id: `event-${i}-${Date.now()}`,
      timestamp: timestamp.toISOString(),
      protocol: protocol as OracleProtocol,
      symbol,
      deviation,
      deviationPercent,
      deviationLevel,
      duration,
      startPrice: basePrice,
      endPrice: basePrice + deviation,
      referencePrice: basePrice,
      resolved,
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function getBasePrice(symbol: string): number {
  const prices: Record<string, number> = {
    'ETH/USD': 2500,
    'BTC/USD': 45000,
    'LINK/USD': 15,
    'MATIC/USD': 0.8,
    'AVAX/USD': 35,
    'SOL/USD': 100,
    'ARB/USD': 1.2,
    'OP/USD': 2.5,
  };
  return prices[symbol] || 100;
}

function generateRealisticDeviation(index: number, total: number): number {
  const baseVariation = Math.sin((index / total) * Math.PI * 4) * 0.01;
  const noise = (Math.random() - 0.5) * 0.005;
  const spike = Math.random() > 0.95 ? (Math.random() - 0.5) * 0.05 : 0;

  return baseVariation + noise + spike;
}

function getDeviationLevel(deviationPercent: number): 'low' | 'medium' | 'high' | 'critical' {
  const absDeviation = Math.abs(deviationPercent);
  if (absDeviation >= 0.02) return 'critical';
  if (absDeviation >= 0.01) return 'high';
  if (absDeviation >= 0.005) return 'medium';
  return 'low';
}
