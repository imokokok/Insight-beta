import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  getReliabilityScores,
  getProtocolRankings,
  getReliabilityTrend,
  calculateAccuracyScore,
  calculateLatencyScore,
  calculateAvailabilityScore,
  calculateOverallScore,
  type ReliabilityMetrics,
  type ProtocolRanking,
} from '@/features/oracle/services/reliabilityScorer';
import { hasDatabase } from '@/lib/database/db';
import { logger } from '@/shared/logger';
import { ORACLE_PROTOCOLS } from '@/types/oracle/protocol';
import type { TimePeriod } from '@/types/oracle/reliability';

function generateMockRankings(_period: TimePeriod): ProtocolRanking[] {
  const baseMetrics: Record<string, Partial<ReliabilityMetrics>> = {
    chainlink: { deviationAvg: 0.02, latencyAvgMs: 45, successCount: 9980, totalCount: 10000 },
    pyth: { deviationAvg: 0.03, latencyAvgMs: 25, successCount: 9970, totalCount: 10000 },
    redstone: { deviationAvg: 0.04, latencyAvgMs: 35, successCount: 9950, totalCount: 10000 },
    uma: { deviationAvg: 0.08, latencyAvgMs: 120, successCount: 9850, totalCount: 10000 },
    api3: { deviationAvg: 0.025, latencyAvgMs: 30, successCount: 9960, totalCount: 10000 },
    band: { deviationAvg: 0.035, latencyAvgMs: 50, successCount: 9940, totalCount: 10000 },
  };

  const rankings: ProtocolRanking[] = ORACLE_PROTOCOLS.map((protocol) => {
    const base = baseMetrics[protocol]!;

    const accuracyScore = calculateAccuracyScore(base.deviationAvg!);
    const latencyScore = calculateLatencyScore(base.latencyAvgMs!);
    const availabilityScore = calculateAvailabilityScore(base.successCount!, base.totalCount!);
    const overallScore = calculateOverallScore(accuracyScore, latencyScore, availabilityScore);

    return {
      protocol,
      score: Math.round(overallScore * 100) / 100,
      rank: 0,
      metrics: {
        protocol,
        symbol: null,
        chain: null,
        periodStart: new Date(),
        periodEnd: new Date(),
        score: Math.round(overallScore * 100) / 100,
        accuracyScore: Math.round(accuracyScore * 100) / 100,
        latencyScore: Math.round(latencyScore * 100) / 100,
        availabilityScore: Math.round(availabilityScore * 100) / 100,
        deviationAvg: base.deviationAvg!,
        deviationMax: base.deviationAvg! * 1.5,
        deviationMin: base.deviationAvg! * 0.5,
        latencyAvgMs: base.latencyAvgMs!,
        successCount: base.successCount!,
        totalCount: base.totalCount!,
        sampleCount: base.totalCount!,
      },
    };
  });

  rankings.sort((a, b) => b.score - a.score);
  rankings.forEach((r, index) => {
    r.rank = index + 1;
  });

  return rankings;
}

function generateMockTrend(protocol: string, days: number): Array<{ date: Date; score: number }> {
  const baseScore =
    {
      chainlink: 95,
      pyth: 93,
      redstone: 91,
      uma: 85,
      api3: 94,
      band: 90,
    }[protocol] || 90;

  const trend: Array<{ date: Date; score: number }> = [];
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const variation = (Math.random() - 0.5) * 4;
    const score = Math.max(0, Math.min(100, baseScore + variation));

    trend.push({
      date,
      score: Math.round(score * 100) / 100,
    });
  }

  return trend;
}

export async function GET(request: NextRequest) {
  const requestStartTime = performance.now();

  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') as TimePeriod) || '30d';
    const protocol = searchParams.get('protocol');
    const trend = searchParams.get('trend') === 'true';
    const trendDays = parseInt(searchParams.get('trendDays') || '30', 10);
    const useMock =
      searchParams.get('useMock') === 'true' || process.env.NODE_ENV === 'development';

    if (!['7d', '30d', '90d'].includes(period)) {
      return NextResponse.json(
        { success: false, error: 'Invalid period. Must be one of: 7d, 30d, 90d' },
        { status: 400 },
      );
    }

    const isMock = !hasDatabase() || useMock;

    if (trend && protocol) {
      const trendData = isMock
        ? generateMockTrend(protocol, trendDays)
        : await getReliabilityTrend(protocol, trendDays);

      const requestTime = performance.now() - requestStartTime;
      logger.info('Reliability trend API request completed', {
        performance: { totalRequestTimeMs: Math.round(requestTime) },
        requestParams: { protocol, trendDays },
        isMock,
      });

      return NextResponse.json({
        success: true,
        protocol,
        period: `${trendDays}d`,
        data: trendData,
        isMock,
      });
    }

    if (protocol) {
      if (isMock) {
        const mockRankings = generateMockRankings(period);
        const protocolRanking = mockRankings.find((r) => r.protocol === protocol);

        if (!protocolRanking) {
          return NextResponse.json(
            { success: false, error: `Protocol not found: ${protocol}` },
            { status: 404 },
          );
        }

        return NextResponse.json({
          success: true,
          period,
          protocol,
          data: [protocolRanking.metrics],
          isMock: true,
        });
      }

      const scores = await getReliabilityScores(period, protocol);
      return NextResponse.json({
        success: true,
        period,
        protocol,
        data: scores,
        isMock: false,
      });
    }

    const rankings = isMock ? generateMockRankings(period) : await getProtocolRankings(period);
    const scores = isMock ? [] : await getReliabilityScores(period);

    const requestTime = performance.now() - requestStartTime;
    logger.info('Reliability scores API request completed', {
      performance: { totalRequestTimeMs: Math.round(requestTime) },
      requestParams: { period },
      isMock,
      rankingsCount: rankings.length,
    });

    return NextResponse.json({
      success: true,
      period,
      rankings,
      scores,
      lastUpdated: new Date().toISOString(),
      isMock,
    });
  } catch (error) {
    const requestTime = performance.now() - requestStartTime;

    logger.error('Reliability API error', {
      error,
      performance: { totalRequestTimeMs: Math.round(requestTime) },
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch reliability scores',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
