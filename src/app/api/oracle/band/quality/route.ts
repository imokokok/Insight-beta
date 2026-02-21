import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';

interface DataQualityMetrics {
  symbol: string;
  chain: string;
  timestamp: string;
  completeness: {
    totalDataPoints: number;
    missingDataPoints: number;
    completenessRate: number;
  };
  latency: {
    avgLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    maxLatencyMs: number;
    latencyDistribution: Array<{ range: string; count: number; percentage: number }>;
  };
  consistency: {
    crossSourceAgreement: number;
    deviationFromMedian: number;
    outlierCount: number;
    consistencyScore: number;
  };
  freshness: {
    lastUpdateTimestamp: string;
    stalenessSeconds: number;
    updateFrequency: number;
    freshnessScore: number;
  };
}

interface QualityResponse {
  summary: {
    overallScore: number;
    totalSymbols: number;
    healthySymbols: number;
    degradedSymbols: number;
    avgCompleteness: number;
    avgLatency: number;
    avgConsistency: number;
  };
  symbols: Record<string, DataQualityMetrics>;
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

function generateLatencyDistribution(): DataQualityMetrics['latency']['latencyDistribution'] {
  return [
    { range: '0-50ms', count: Math.floor(Math.random() * 500) + 300, percentage: 0 },
    { range: '50-100ms', count: Math.floor(Math.random() * 400) + 200, percentage: 0 },
    { range: '100-200ms', count: Math.floor(Math.random() * 300) + 100, percentage: 0 },
    { range: '200-500ms', count: Math.floor(Math.random() * 200) + 50, percentage: 0 },
    { range: '500ms+', count: Math.floor(Math.random() * 50) + 10, percentage: 0 },
  ].map((item) => ({
    ...item,
    percentage: Math.random() * 30 + 10,
  }));
}

function generateQualityMetrics(symbol: string, chain: string): DataQualityMetrics {
  const avgLatencyMs = Math.floor(Math.random() * 150) + 50;
  const completenessRate = Math.random() * 10 + 90;

  return {
    symbol,
    chain,
    timestamp: new Date().toISOString(),
    completeness: {
      totalDataPoints: Math.floor(Math.random() * 1000) + 500,
      missingDataPoints: Math.floor(Math.random() * 50),
      completenessRate: Number(completenessRate.toFixed(2)),
    },
    latency: {
      avgLatencyMs,
      p50LatencyMs: Math.floor(avgLatencyMs * 0.7),
      p95LatencyMs: Math.floor(avgLatencyMs * 1.8),
      p99LatencyMs: Math.floor(avgLatencyMs * 2.5),
      maxLatencyMs: Math.floor(avgLatencyMs * 3),
      latencyDistribution: generateLatencyDistribution(),
    },
    consistency: {
      crossSourceAgreement: Number((Math.random() * 5 + 95).toFixed(2)),
      deviationFromMedian: Number((Math.random() * 2).toFixed(3)),
      outlierCount: Math.floor(Math.random() * 10),
      consistencyScore: Number((Math.random() * 10 + 90).toFixed(2)),
    },
    freshness: {
      lastUpdateTimestamp: new Date(Date.now() - Math.random() * 60000).toISOString(),
      stalenessSeconds: Math.floor(Math.random() * 30),
      updateFrequency: Math.floor(Math.random() * 10) + 5,
      freshnessScore: Number((Math.random() * 10 + 90).toFixed(2)),
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get('symbols');
    const chain = searchParams.get('chain') ?? 'cosmos';

    const symbolList = symbols ? symbols.split(',').map((s) => s.trim().toUpperCase()) : SYMBOLS;

    const metrics: Record<string, DataQualityMetrics> = {};
    let totalCompleteness = 0;
    let totalLatency = 0;
    let totalConsistency = 0;

    for (const symbol of symbolList) {
      metrics[symbol] = generateQualityMetrics(symbol, chain);
      totalCompleteness += metrics[symbol].completeness.completenessRate;
      totalLatency += metrics[symbol].latency.avgLatencyMs;
      totalConsistency += metrics[symbol].consistency.consistencyScore;
    }

    const healthySymbols = Object.values(metrics).filter(
      (m) => m.consistency.consistencyScore >= 95 && m.freshness.freshnessScore >= 95,
    ).length;

    const overallScore = Number(
      (
        (totalCompleteness / symbolList.length) * 0.3 +
        (100 - totalLatency / symbolList.length) * 0.3 +
        (totalConsistency / symbolList.length) * 0.4
      ).toFixed(1),
    );

    const response: QualityResponse = {
      summary: {
        overallScore,
        totalSymbols: symbolList.length,
        healthySymbols,
        degradedSymbols: symbolList.length - healthySymbols,
        avgCompleteness: Number((totalCompleteness / symbolList.length).toFixed(2)),
        avgLatency: Math.floor(totalLatency / symbolList.length),
        avgConsistency: Number((totalConsistency / symbolList.length).toFixed(2)),
      },
      symbols: metrics,
    };

    return ok(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch quality metrics';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
