import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';
import { logger } from '@/shared/logger';
import type { OracleProtocol, SupportedChain } from '@/types';
import type { LatencyAnomalyTimeline, LatencyBlockCorrelation } from '@/types/oracle/comparison';

export async function GET(request: NextRequest) {
  const requestStartTime = performance.now();

  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || undefined;
    const protocol = searchParams.get('protocol');
    const chain = searchParams.get('chain');
    const timeRange = searchParams.get('timeRange') || '24h';
    const type = searchParams.get('type') || 'anomalies';

    if (type === 'anomalies') {
      const anomalyData = await fetchLatencyAnomalies(symbol ?? null, protocol, chain, timeRange);
      const requestTime = performance.now() - requestStartTime;

      logger.info('Latency anomalies API request completed', {
        performance: { totalRequestTimeMs: Math.round(requestTime) },
        requestParams: { symbol, protocol, chain, timeRange },
        responseStats: {
          totalEvents: anomalyData.totalEvents,
        },
      });

      return ok(anomalyData);
    } else if (type === 'correlation') {
      const correlationData = await fetchBlockCorrelation(
        symbol ?? null,
        protocol,
        chain,
        timeRange,
      );
      const requestTime = performance.now() - requestStartTime;

      logger.info('Block correlation API request completed', {
        performance: { totalRequestTimeMs: Math.round(requestTime) },
        requestParams: { symbol, protocol, chain, timeRange },
        responseStats: {
          dataPoints: correlationData.length,
        },
      });

      return ok(correlationData);
    }

    return error({ code: 'invalid_type', message: 'Type must be anomalies or correlation' }, 400);
  } catch (err) {
    const requestTime = performance.now() - requestStartTime;
    logger.error('Latency events API request failed', {
      error: err,
      performance: { totalRequestTimeMs: Math.round(requestTime) },
    });

    return error({ code: 'latency_events_error', message: 'Failed to fetch latency events' }, 500);
  }
}

async function fetchLatencyAnomalies(
  symbol: string | null,
  protocol: string | null,
  chain: string | null,
  timeRange: string,
): Promise<LatencyAnomalyTimeline> {
  const now = new Date();
  const events = generateAnomalyEvents(symbol, protocol, chain, timeRange, now);

  return {
    events,
    totalEvents: events.length,
    lastUpdated: now.toISOString(),
  };
}

async function fetchBlockCorrelation(
  symbol: string | null,
  protocol: string | null,
  chain: string | null,
  timeRange: string,
): Promise<LatencyBlockCorrelation[]> {
  const now = new Date();
  return generateBlockCorrelationData(symbol, protocol, chain, timeRange, now);
}

function generateAnomalyEvents(
  symbol: string | null,
  protocol: string | null,
  chain: string | null,
  timeRange: string,
  now: Date,
) {
  const events = [];
  const numEvents = Math.floor(Math.random() * 8) + 2;
  let timeRangeMs = 86400000;

  if (timeRange === '7d') {
    timeRangeMs = 604800000;
  } else if (timeRange === '30d') {
    timeRangeMs = 2592000000;
  }

  const protocolsList: OracleProtocol[] = protocol
    ? [protocol as OracleProtocol]
    : ['chainlink', 'pyth', 'api3', 'band'];
  const symbols = symbol ? [symbol] : ['ETH/USD', 'BTC/USD', 'LINK/USD'];
  const chainsList: SupportedChain[] = chain
    ? [chain as SupportedChain]
    : ['ethereum', 'polygon', 'arbitrum'];

  const defaultProtocol: OracleProtocol = 'chainlink';
  const defaultChain: SupportedChain = 'ethereum';

  for (let i = 0; i < numEvents; i++) {
    const timestamp = new Date(now.getTime() - Math.random() * timeRangeMs);
    const latency = Math.floor(Math.random() * 15000) + 5000;
    const threshold = 5000;
    const severity: 'warning' | 'critical' | 'emergency' =
      latency > 15000 ? 'emergency' : latency > 10000 ? 'critical' : 'warning';
    const duration = Math.floor(Math.random() * 120) + 5;
    const resolved = Math.random() > 0.3;

    const protocolItem =
      protocolsList.length > 0
        ? protocolsList[Math.floor(Math.random() * protocolsList.length)]!
        : defaultProtocol;
    const symbolItem =
      symbols.length > 0
        ? (symbols[Math.floor(Math.random() * symbols.length)] ?? 'ETH/USD')
        : 'ETH/USD';
    const chainItem =
      chainsList.length > 0
        ? chainsList[Math.floor(Math.random() * chainsList.length)]!
        : defaultChain;

    events.push({
      id: `latency-event-${i}-${Date.now()}`,
      timestamp: timestamp.toISOString(),
      protocol: protocolItem,
      symbol: symbolItem,
      chain: chainItem,
      latencyMs: latency,
      threshold,
      duration,
      severity,
      cause: getRandomCause(),
      resolved,
      resolvedAt: resolved
        ? new Date(timestamp.getTime() + duration * 60000).toISOString()
        : undefined,
      impact: {
        affectedFeeds: Math.floor(Math.random() * 10) + 1,
        avgLatencyIncrease: latency - threshold,
        blockLagIncrease: Math.floor(Math.random() * 5) + 1,
      },
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function generateBlockCorrelationData(
  _symbol: string | null,
  _protocol: string | null,
  _chain: string | null,
  timeRange: string,
  now: Date,
): LatencyBlockCorrelation[] {
  const data = [];
  let numPoints = 24;
  let intervalMs = 3600000;

  if (timeRange === '7d') {
    numPoints = 168;
    intervalMs = 3600000;
  } else if (timeRange === '30d') {
    numPoints = 720;
    intervalMs = 3600000;
  }

  let baseBlockHeight = 18000000;

  for (let i = 0; i < numPoints; i++) {
    const timestamp = new Date(now.getTime() - i * intervalMs);
    const txCount = Math.floor(Math.random() * 200) + 50;
    const gasPrice = Math.random() * 50 + 10;
    const latency = calculateLatencyFromFactors(txCount, gasPrice);

    data.push({
      timestamp: timestamp.toISOString(),
      blockHeight: baseBlockHeight + i * 12,
      latency,
      transactionCount: txCount,
      gasPrice,
    });
  }

  return data.reverse();
}

function calculateLatencyFromFactors(txCount: number, gasPrice: number): number {
  const baseLatency = 2000;
  const txImpact = txCount * 20;
  const gasImpact = gasPrice * 50;
  const noise = (Math.random() - 0.5) * 1000;

  return baseLatency + txImpact + gasImpact + noise;
}

function getRandomCause(): string {
  const causes = [
    'Network congestion',
    'High gas prices',
    'Node synchronization issues',
    'RPC endpoint overload',
    'Block production delay',
    'Validator downtime',
    'Chain reorganization',
    'Smart contract execution delay',
  ];
  return causes[Math.floor(Math.random() * causes.length)] ?? 'Unknown';
}
