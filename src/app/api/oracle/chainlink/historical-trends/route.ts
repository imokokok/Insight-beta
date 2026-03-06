import { NextRequest } from 'next/server';

import { z } from 'zod';

import { error, ok } from '@/lib/api/apiResponse';
import type {
  FeedTrendData,
  NodePerformanceHistory,
  OCRRoundStats,
  AnomalyStats,
  TimeRange,
} from '@/features/oracle/chainlink/types';

const HistoricalTrendsQuerySchema = z.object({
  timeRange: z.enum(['1h', '24h', '7d', '30d', '90d']).default('24h'),
  feedId: z.string().optional(),
  nodeName: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).default(500),
  sampling: z.coerce.number().min(1).max(100).optional(),
});

function generateMockFeedTrends(timeRange: TimeRange, limit: number): FeedTrendData[] {
  const feeds = [
    { feedId: 'eth-usd', symbol: 'ETH', pair: 'ETH/USD', chain: 'ethereum' },
    { feedId: 'btc-usd', symbol: 'BTC', pair: 'BTC/USD', chain: 'ethereum' },
    { feedId: 'link-usd', symbol: 'LINK', pair: 'LINK/USD', chain: 'ethereum' },
    { feedId: 'eth-usd-polygon', symbol: 'ETH', pair: 'ETH/USD', chain: 'polygon' },
    { feedId: 'btc-usd-arbitrum', symbol: 'BTC', pair: 'BTC/USD', chain: 'arbitrum' },
  ];

  const basePrices: Record<string, number> = {
    'eth-usd': 2345.67,
    'btc-usd': 67890.12,
    'link-usd': 14.56,
    'eth-usd-polygon': 2345.5,
    'btc-usd-arbitrum': 67889.5,
  };

  const getTimePoints = (range: TimeRange): number => {
    switch (range) {
      case '1h':
        return Math.min(limit, 60);
      case '24h':
        return Math.min(limit, 96);
      case '7d':
        return Math.min(limit, 168);
      case '30d':
        return Math.min(limit, 180);
      case '90d':
        return Math.min(limit, 180);
      default:
        return 96;
    }
  };

  const getInterval = (range: TimeRange): number => {
    switch (range) {
      case '1h':
        return 60 * 1000;
      case '24h':
        return 15 * 60 * 1000;
      case '7d':
        return 60 * 60 * 1000;
      case '30d':
        return 4 * 60 * 60 * 1000;
      case '90d':
        return 12 * 60 * 60 * 1000;
      default:
        return 15 * 60 * 1000;
    }
  };

  const timePoints = getTimePoints(timeRange);
  const interval = getInterval(timeRange);
  const now = Date.now();

  return feeds.map((feed) => {
    const basePrice = basePrices[feed.feedId] || 100;
    const volatility = basePrice * 0.02;
    const trend = (Math.random() - 0.5) * basePrice * 0.1;

    const history = Array.from({ length: timePoints }, (_, i) => {
      const timestamp = new Date(now - (timePoints - i) * interval).toISOString();
      const randomWalk = Math.sin(i * 0.1) * volatility * 0.5 + (Math.random() - 0.5) * volatility;
      const trendComponent = (i / timePoints) * trend;
      const price = basePrice + randomWalk + trendComponent;

      return {
        timestamp,
        price: Math.max(0.01, price),
        volume: Math.floor(Math.random() * 1000) + 100,
        updates: Math.floor(Math.random() * 10) + 1,
        participants: Math.floor(Math.random() * 5) + 3,
      };
    });

    const currentPrice = history[history.length - 1]?.price || basePrice;
    const startPrice = history[0]?.price || basePrice;
    const priceChange = currentPrice - startPrice;
    const priceChangePercentage = (priceChange / startPrice) * 100;

    const prices = history.map((h) => h.price);
    const high24h = Math.max(...prices);
    const low24h = Math.min(...prices);

    return {
      ...feed,
      currentPrice,
      priceChange24h: priceChange,
      priceChangePercentage24h: priceChangePercentage,
      high24h,
      low24h,
      history,
    };
  });
}

function generateMockNodePerformance(timeRange: TimeRange, limit: number): NodePerformanceHistory[] {
  const nodes = [
    { nodeName: 'node-operator-1', operatorName: 'Chainlink Labs' },
    { nodeName: 'node-operator-2', operatorName: 'AccuWeather' },
    { nodeName: 'node-operator-3', operatorName: 'Google Cloud' },
    { nodeName: 'node-operator-4', operatorName: 'AWS' },
    { nodeName: 'node-operator-5', operatorName: 'Infura' },
  ];

  const getTimePoints = (range: TimeRange): number => {
    switch (range) {
      case '1h':
        return Math.min(limit, 12);
      case '24h':
        return Math.min(limit, 24);
      case '7d':
        return Math.min(limit, 28);
      case '30d':
        return Math.min(limit, 30);
      case '90d':
        return Math.min(limit, 18);
      default:
        return 24;
    }
  };

  const timePoints = getTimePoints(timeRange);
  const interval = 3600000;
  const now = Date.now();

  return nodes.map((node) => {
    const baseUptime = 95 + Math.random() * 5;
    const baseResponseTime = 100 + Math.random() * 100;

    const history = Array.from({ length: timePoints }, (_, i) => {
      const timestamp = new Date(now - (timePoints - i) * interval).toISOString();
      const uptimeVariation = (Math.random() - 0.5) * 2;
      const responseVariation = (Math.random() - 0.5) * 50;

      return {
        timestamp,
        uptime: Math.min(100, Math.max(0, baseUptime + uptimeVariation)),
        responseTime: Math.max(10, baseResponseTime + responseVariation),
        proposalsCount: Math.floor(Math.random() * 20) + 5,
        observationsCount: Math.floor(Math.random() * 100) + 50,
      };
    });

    const uptimes = history.map((h) => h.uptime);
    const responseTimes = history.map((h) => h.responseTime);
    const proposals = history.reduce((sum, h) => sum + h.proposalsCount, 0);
    const observations = history.reduce((sum, h) => sum + h.observationsCount, 0);

    const events: Array<{
      id: string;
      type: 'offline' | 'degraded' | 'recovered' | 'maintenance';
      timestamp: string;
      duration?: number;
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }> = [];

    if (Math.random() > 0.7) {
      const eventTime = new Date(now - Math.random() * timePoints * interval).toISOString();
      events.push({
        id: `event-${node.nodeName}-${Date.now()}`,
        type: 'degraded',
        timestamp: eventTime,
        duration: Math.floor(Math.random() * 3600) + 300,
        description: 'Performance degradation detected',
        severity: Math.random() > 0.5 ? 'medium' : 'low',
      });
    }

    return {
      ...node,
      currentUptime: uptimes[uptimes.length - 1] || baseUptime,
      avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      totalProposals: proposals,
      totalObservations: observations,
      history,
      events: events.length > 0 ? events : undefined,
    };
  });
}

function generateMockOCRStats(timeRange: TimeRange, limit: number): OCRRoundStats {
  const getTimePoints = (range: TimeRange): number => {
    switch (range) {
      case '1h':
        return Math.min(limit, 60);
      case '24h':
        return Math.min(limit, 288);
      case '7d':
        return Math.min(limit, 500);
      case '30d':
        return Math.min(limit, 500);
      case '90d':
        return Math.min(limit, 500);
      default:
        return 288;
    }
  };

  const timePoints = getTimePoints(timeRange);
  const interval = 300000;
  const now = Date.now();

  const proposers = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];
  const proposerDistribution: Record<string, number> = {};
  proposers.forEach((p) => {
    proposerDistribution[p] = Math.floor(Math.random() * 50) + 10;
  });

  const totalRounds = Object.values(proposerDistribution).reduce((a, b) => a + b, 0);

  const mostActiveProposer = Object.entries(proposerDistribution).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] || 'unknown';

  const history = Array.from({ length: timePoints }, (_, i) => {
    const timestamp = new Date(now - (timePoints - i) * interval).toISOString();
    const roundId = `0x${(1000000 + i).toString(16)}`;

    return {
      timestamp,
      roundId,
      participants: Math.floor(Math.random() * 5) + 6,
      aggregationTime: Math.floor(Math.random() * 2000) + 500,
      gasUsed: Math.floor(Math.random() * 50000) + 150000,
      proposer: proposers[i % proposers.length]!,
    };
  });

  const avgParticipants = history.reduce((sum, r) => sum + r.participants, 0) / history.length;
  const avgAggregationTime = history.reduce((sum, r) => sum + r.aggregationTime, 0) / history.length;
  const avgGasUsed = history.reduce((sum, r) => sum + r.gasUsed, 0) / history.length;

  return {
    totalRounds,
    avgParticipants,
    avgAggregationTime,
    avgGasUsed,
    mostActiveProposer,
    proposerDistribution,
    history,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateMockAnomalyStats(timeRange: TimeRange): AnomalyStats {
  const anomalyTypes = [
    'price_spike',
    'price_drop',
    'delayed_update',
    'node_offline',
    'consensus_failure',
    'unusual_gas',
  ] as const;

  const severities = ['low', 'medium', 'high', 'critical'] as const;
  const feeds = ['eth-usd', 'btc-usd', 'link-usd', 'usdc-usd'];
  const nodes = ['node-operator-1', 'node-operator-2', 'node-operator-3'];

  const totalAnomalies = Math.floor(Math.random() * 50) + 10;
  const resolvedAnomalies = Math.floor(totalAnomalies * (0.7 + Math.random() * 0.3));

  const anomaliesByType: Record<string, number> = {};
  anomalyTypes.forEach((type) => {
    anomaliesByType[type] = Math.floor(Math.random() * 10) + 1;
  });

  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  const recentAnomalies: Array<{
    id: string;
    feedId?: string;
    nodeName?: string;
    type: string;
    timestamp: string;
    resolvedAt?: string;
    severity: string;
    description: string;
    impact?: string;
    metadata?: Record<string, unknown>;
  }> = [];

  const numRecent = Math.min(10, totalAnomalies);
  const now = Date.now();

  for (let i = 0; i < numRecent; i++) {
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const type = anomalyTypes[Math.floor(Math.random() * anomalyTypes.length)]!;
    const timestamp = new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
    const isResolved = Math.random() > 0.3;

    if (severity === 'critical') criticalCount++;
    else if (severity === 'high') highCount++;
    else if (severity === 'medium') mediumCount++;
    else lowCount++;

    recentAnomalies.push({
      id: `anomaly-${i}-${Date.now()}`,
      feedId: feeds[Math.floor(Math.random() * feeds.length)],
      nodeName: nodes[Math.floor(Math.random() * nodes.length)],
      type,
      timestamp,
      resolvedAt: isResolved
        ? new Date(new Date(timestamp).getTime() + Math.random() * 3600000).toISOString()
        : undefined,
      severity,
      description: `Detected ${type.replace(/_/g, ' ')} event`,
      impact: isResolved ? 'Resolved' : 'Investigating',
      metadata: {
        detectedBy: 'automated-monitoring',
        confidence: 0.85 + Math.random() * 0.15,
      },
    });
  }

  recentAnomalies.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const avgResolutionTime =
    recentAnomalies.filter((a) => a.resolvedAt).length > 0
      ? Math.floor(Math.random() * 3600) + 600
      : undefined;

  return {
    totalAnomalies,
    resolvedAnomalies,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    avgResolutionTime,
    anomaliesByType,
    recentAnomalies,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const validated = HistoricalTrendsQuerySchema.parse({
      timeRange: searchParams.get('timeRange'),
      feedId: searchParams.get('feedId'),
      nodeName: searchParams.get('nodeName'),
      limit: searchParams.get('limit'),
      sampling: searchParams.get('sampling'),
    });

    const { timeRange, limit, sampling } = validated;

    const feedTrends = generateMockFeedTrends(timeRange, limit);
    const nodePerformance = generateMockNodePerformance(timeRange, limit);
    const ocrStats = generateMockOCRStats(timeRange, limit);
    const anomalyStats = generateMockAnomalyStats(timeRange);

    const totalDataPoints =
      feedTrends.reduce((sum, f) => sum + f.history.length, 0) +
      nodePerformance.reduce((sum, n) => sum + n.history.length, 0) +
      ocrStats.history.length;

    const samplingRate = sampling || (totalDataPoints > 1000 ? Math.ceil(totalDataPoints / 1000) : 1);

    const response = {
      feedTrends,
      nodePerformance,
      ocrStats,
      anomalyStats,
      timeRange,
      generatedAt: new Date().toISOString(),
      metadata: {
        totalFeeds: feedTrends.length,
        totalNodes: nodePerformance.length,
        totalRounds: ocrStats.totalRounds,
        dataPoints: totalDataPoints,
        samplingRate: samplingRate > 1 ? 1 / samplingRate : 1,
      },
    };

    return ok(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch historical trends';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
